-- ─── Schema ───────────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id          TEXT PRIMARY KEY,
  name_en     TEXT NOT NULL,
  name_ar     TEXT NOT NULL,
  image_url   TEXT NOT NULL DEFAULT '',
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
  sort_order      INTEGER NOT NULL DEFAULT 0
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

-- ─── Storage ───────────────────────────────────────────────────────────────────
-- Run this in the Supabase dashboard: Storage → New bucket → name: menu-images → Public: ON
-- Then add this policy in Storage → menu-images → Policies:
--
--   Policy name : public_all
--   Allowed operation : ALL
--   Target roles : anon, authenticated
--   USING expression : true
--   WITH CHECK expression : true
