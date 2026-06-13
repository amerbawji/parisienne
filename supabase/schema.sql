-- ─── Schema ───────────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  image_url   TEXT NOT NULL DEFAULT '',
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE items (
  id              TEXT PRIMARY KEY,
  category_id     TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name_en         TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  price           NUMERIC(10,2) NOT NULL DEFAULT 0,
  unit            TEXT NOT NULL DEFAULT 'piece',
  weight_step     NUMERIC(10,3),
  min_quantity    NUMERIC(10,3),
  description_en  TEXT NOT NULL DEFAULT '',
  description_ar  TEXT NOT NULL DEFAULT '',
  image_url       TEXT NOT NULL DEFAULT '',
  presets         JSONB NOT NULL DEFAULT '[]',
  sort_order      INTEGER NOT NULL DEFAULT 0,
  active          BOOLEAN NOT NULL DEFAULT true,
  in_stock        BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE item_options (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  choices          JSONB NOT NULL DEFAULT '[]',
  price_additions  JSONB NOT NULL DEFAULT '{}',
  sort_order       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE promo_config (
  id         INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled    BOOLEAN NOT NULL DEFAULT true,
  image_url  TEXT NOT NULL DEFAULT '/promo-ramadan.jpg'
);

INSERT INTO promo_config (id, enabled, image_url) VALUES (1, true, '/promo-ramadan.jpg');

-- ─── Row Level Security ────────────────────────────────────────────────────────
-- Public read + write via anon key (admin password enforced on the frontend).

ALTER TABLE categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_all" ON categories   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON items        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON item_options FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "public_all" ON promo_config FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  customer_name    TEXT,
  customer_phone   TEXT,
  service_type     TEXT NOT NULL,
  timing           TEXT,
  scheduled_time   TEXT,
  payment_method   TEXT,
  delivery_area    TEXT,
  delivery_street  TEXT,
  delivery_building TEXT,
  delivery_floor   TEXT,
  delivery_details TEXT,
  location_url     TEXT,
  items            JSONB NOT NULL DEFAULT '[]',
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'new'
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON orders FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE store_config (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  open_time   TEXT NOT NULL DEFAULT '08:00',
  close_time  TEXT NOT NULL DEFAULT '23:00',
  closed_days      JSONB NOT NULL DEFAULT '[]',
  whatsapp_number  TEXT NOT NULL DEFAULT '9613502022'
);

INSERT INTO store_config (id, open_time, close_time, closed_days) VALUES (1, '08:00', '23:00', '[]');

ALTER TABLE store_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_all" ON store_config FOR ALL USING (true) WITH CHECK (true);

-- ─── Migrations (run manually in Supabase SQL editor) ────────────────────────
-- ALTER TABLE categories ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- ALTER TABLE items      ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
-- ALTER TABLE store_config ADD COLUMN discount_percentage INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE store_config ADD COLUMN whatsapp_enabled BOOLEAN NOT NULL DEFAULT true;
-- ALTER TABLE item_options ADD COLUMN name_ar TEXT NOT NULL DEFAULT '';
-- ALTER TABLE item_options ADD COLUMN choices_ar JSONB NOT NULL DEFAULT '[]';
-- ALTER TABLE orders ADD COLUMN seen_at TIMESTAMPTZ;
-- CREATE SEQUENCE order_number_seq START 1001;
-- ALTER TABLE orders ADD COLUMN order_number INTEGER NOT NULL DEFAULT nextval('order_number_seq');

-- Admin users table
-- CREATE TABLE admin_users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   username TEXT UNIQUE NOT NULL,
--   password_hash TEXT NOT NULL,
--   role TEXT NOT NULL DEFAULT 'staff',
--   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
-- ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "public_all" ON admin_users FOR ALL USING (true) WITH CHECK (true);
--
-- Seed the first admin (password: parisienne2025):
-- INSERT INTO admin_users (username, password_hash, role)
-- VALUES ('admin', encode(sha256('parisienne2025'::bytea), 'hex'), 'admin');

-- ─── Storage ───────────────────────────────────────────────────────────────────
-- Run this in the Supabase dashboard: Storage → New bucket → name: menu-images → Public: ON
-- Then add this policy in Storage → menu-images → Policies:
--
--   Policy name : public_all
--   Allowed operation : ALL
--   Target roles : anon, authenticated
--   USING expression : true
--   WITH CHECK expression : true
