-- ─── Security step 2 of 2: lock down ─────────────────────────────────────────
-- Run in the Supabase SQL editor only AFTER the new build is deployed and you
-- have logged in to /admin with your new account. It removes the old
-- "anyone can do anything" policies and the old username/password logins.
--
-- Afterwards:
--   • everyone can read the menu, categories, options, promo and store settings
--   • only admins can change them or upload menu images
--   • only signed-in staff (admin or staff) can read and update orders and customers
--   • customers place and track orders through the functions from step 1

-- Refuse to run if no admin is linked to an Auth account yet: nobody could log in.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id IS NOT NULL AND role = 'admin') THEN
    RAISE EXCEPTION 'No admin account is linked yet. Finish the steps at the end of security-1-prepare.sql first.';
  END IF;
END $$;

-- ─── Drop every existing policy on the app's tables ───────────────────────────

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('categories', 'items', 'item_options', 'promo_config',
                        'store_config', 'orders', 'customers', 'admin_users')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

ALTER TABLE public.categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users  ENABLE ROW LEVEL SECURITY;

-- ─── Menu and settings: public read, admin write ──────────────────────────────

CREATE POLICY "public_read" ON public.categories   FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.items        FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.item_options FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.promo_config FOR SELECT USING (true);
CREATE POLICY "public_read" ON public.store_config FOR SELECT USING (true);

CREATE POLICY "admin_write" ON public.categories   FOR ALL TO authenticated
  USING (public.staff_role() = 'admin') WITH CHECK (public.staff_role() = 'admin');
CREATE POLICY "admin_write" ON public.items        FOR ALL TO authenticated
  USING (public.staff_role() = 'admin') WITH CHECK (public.staff_role() = 'admin');
CREATE POLICY "admin_write" ON public.item_options FOR ALL TO authenticated
  USING (public.staff_role() = 'admin') WITH CHECK (public.staff_role() = 'admin');
CREATE POLICY "admin_write" ON public.promo_config FOR ALL TO authenticated
  USING (public.staff_role() = 'admin') WITH CHECK (public.staff_role() = 'admin');
CREATE POLICY "admin_write" ON public.store_config FOR ALL TO authenticated
  USING (public.staff_role() = 'admin') WITH CHECK (public.staff_role() = 'admin');

-- ─── Orders and customers: staff only ─────────────────────────────────────────
-- No insert policy on orders: new orders come in through place_order().

CREATE POLICY "staff_read" ON public.orders FOR SELECT TO authenticated
  USING (public.staff_role() IS NOT NULL);
CREATE POLICY "staff_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.staff_role() IS NOT NULL) WITH CHECK (public.staff_role() IS NOT NULL);
CREATE POLICY "admin_delete" ON public.orders FOR DELETE TO authenticated
  USING (public.staff_role() = 'admin');

CREATE POLICY "staff_all" ON public.customers FOR ALL TO authenticated
  USING (public.staff_role() IS NOT NULL) WITH CHECK (public.staff_role() IS NOT NULL);

-- ─── Team accounts ────────────────────────────────────────────────────────────

CREATE POLICY "self_or_admin_read" ON public.admin_users FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.staff_role() = 'admin');
CREATE POLICY "admin_write" ON public.admin_users FOR ALL TO authenticated
  USING (public.staff_role() = 'admin') WITH CHECK (public.staff_role() = 'admin');

-- Old username/password logins: rows with no Auth account, and the hash column.
DELETE FROM public.admin_users WHERE user_id IS NULL;
ALTER TABLE public.admin_users DROP COLUMN IF EXISTS password_hash;

-- ─── Menu image uploads: admin only ───────────────────────────────────────────
-- Drops the old open policies on the menu-images bucket (dashboard-made policies
-- get a random suffix, hence the pattern match), then recreates them.
-- The bucket stays public, so image URLs keep working for everyone.

DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (policyname ILIKE 'public_all%'
           OR coalesce(qual, '') ILIKE '%menu-images%'
           OR coalesce(with_check, '') ILIKE '%menu-images%')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "menu_images_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'menu-images');
CREATE POLICY "menu_images_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND public.staff_role() = 'admin');
CREATE POLICY "menu_images_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'menu-images' AND public.staff_role() = 'admin')
  WITH CHECK (bucket_id = 'menu-images' AND public.staff_role() = 'admin');
CREATE POLICY "menu_images_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND public.staff_role() = 'admin');
