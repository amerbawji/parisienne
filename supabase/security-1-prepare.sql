-- ─── Security step 1 of 2: prepare ───────────────────────────────────────────
-- Run in the Supabase SQL editor BEFORE deploying the build that uses it.
-- Purely additive: the current live site keeps working after this runs.
--
-- Adds:
--   • admin_users.user_id, linking each staff row to a Supabase Auth account
--   • staff_role(): the signed-in user's role ('admin' / 'staff' / NULL)
--   • narrow functions the public site uses instead of reading tables directly:
--       place_order, track_orders, order_status, customer_discount
--   • add_staff(): lets an admin grant a role to an Auth account from the app

-- ─── Staff accounts ───────────────────────────────────────────────────────────

ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE;
DO $$
BEGIN
  -- (the column is gone once step 2 has run, so this file stays re-runnable)
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'admin_users' AND column_name = 'password_hash') THEN
    ALTER TABLE public.admin_users ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.staff_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.admin_users WHERE user_id = auth.uid()
$$;

-- Grants a role to an existing Auth account, found by email. Admins only.
CREATE OR REPLACE FUNCTION public.add_staff(p_email TEXT, p_role TEXT)
RETURNS TABLE (id UUID, username TEXT, role TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id UUID;
BEGIN
  IF public.staff_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can add team members';
  END IF;
  IF p_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'Unknown role %', p_role;
  END IF;

  SELECT u.id INTO v_user_id FROM auth.users u WHERE lower(u.email) = lower(trim(p_email));
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No account exists for %', p_email;
  END IF;

  RETURN QUERY
  INSERT INTO public.admin_users AS a (user_id, username, role)
  VALUES (v_user_id, lower(trim(p_email)), p_role)
  ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, username = EXCLUDED.username
  RETURNING a.id, a.username, a.role;
END;
$$;

-- ─── Public ordering ──────────────────────────────────────────────────────────

-- Customers place orders through this instead of inserting into orders, so they
-- never need read access to the table. Staff-only fields (status, notes, seen_at)
-- always start at their defaults.
CREATE OR REPLACE FUNCTION public.place_order(p_order JSONB)
RETURNS TABLE (id UUID, order_number INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  r public.orders;
BEGIN
  r := jsonb_populate_record(NULL::public.orders, p_order);
  RETURN QUERY
  INSERT INTO public.orders AS o (
    customer_name, customer_phone, service_type, timing, scheduled_time, payment_method,
    delivery_area, delivery_street, delivery_building, delivery_floor, delivery_details,
    location_url, items, total
  ) VALUES (
    r.customer_name, r.customer_phone, r.service_type, r.timing, r.scheduled_time, r.payment_method,
    r.delivery_area, r.delivery_street, r.delivery_building, r.delivery_floor, r.delivery_details,
    r.location_url, COALESCE(r.items, '[]'::jsonb), COALESCE(r.total, 0)
  )
  RETURNING o.id, o.order_number;
END;
$$;

-- Order tracking: needs the phone AND one of that phone's order numbers, and
-- returns no name, phone or address. Phones compare by digits only, since the
-- cart stores them as typed ("+961 3 ...") and the tracking form strips to digits.
CREATE OR REPLACE FUNCTION public.track_orders(p_phone TEXT, p_order_number INTEGER)
RETURNS TABLE (
  id UUID, created_at TIMESTAMPTZ, status TEXT, service_type TEXT, payment_method TEXT,
  items JSONB, total NUMERIC, timing TEXT, scheduled_time TEXT, order_number INTEGER,
  admin_notes JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT o.id, o.created_at, o.status, o.service_type, o.payment_method,
         o.items, o.total, o.timing, o.scheduled_time, o.order_number, o.admin_notes
  FROM public.orders o
  WHERE length(regexp_replace(p_phone, '\D', '', 'g')) >= 5
    AND regexp_replace(o.customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
    AND EXISTS (
      SELECT 1 FROM public.orders v
      WHERE regexp_replace(v.customer_phone, '\D', '', 'g') = regexp_replace(p_phone, '\D', '', 'g')
        AND v.order_number = p_order_number
    )
  ORDER BY o.created_at DESC
  LIMIT 20
$$;

-- Status of one order by its (unguessable) id, for the confirmation screen.
CREATE OR REPLACE FUNCTION public.order_status(p_id UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT status FROM public.orders WHERE id = p_id
$$;

-- A customer's personal discount, without exposing the customers table.
CREATE OR REPLACE FUNCTION public.customer_discount(p_phone TEXT)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE((SELECT discount_percentage FROM public.customers WHERE phone = p_phone), 0)
$$;

GRANT EXECUTE ON FUNCTION
  public.staff_role(),
  public.add_staff(TEXT, TEXT),
  public.place_order(JSONB),
  public.track_orders(TEXT, INTEGER),
  public.order_status(UUID),
  public.customer_discount(TEXT)
TO anon, authenticated;

-- ─── After running this ───────────────────────────────────────────────────────
-- 1. Authentication → Users → Add user → Create new user: your email + a strong
--    password, "Auto Confirm User" ticked.
-- 2. Make that account an admin (put your email in):
--
--    INSERT INTO public.admin_users (user_id, username, role)
--    SELECT id, lower(email), 'admin' FROM auth.users WHERE lower(email) = lower('you@example.com')
--    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
