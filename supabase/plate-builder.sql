-- ─────────────────────────────────────────────────────────────────────────────
-- Build-your-own plate
--
-- RUN THIS IN THE SUPABASE SQL EDITOR **BEFORE** DEPLOYING THE MATCHING CODE.
-- Step 1 adds the column the feature reads and writes. Without it, saving a
-- plate from the admin panel fails.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Step 1: the column ───────────────────────────────────────────────────────
ALTER TABLE items ADD COLUMN IF NOT EXISTS builder JSONB;


-- ── Step 2: the plate itself ─────────────────────────────────────────────────
-- Deliberately seeded with price 0 on every skewer and active = false, so it
-- cannot go live mispriced. Set the real prices in Admin → Menu → edit this
-- item, then flip it active.
--
-- category_id 'cat-100' is Plates. Change it if you want the plate elsewhere.

INSERT INTO items (
  id, category_id, name_en, name_ar, price, unit,
  description_en, description_ar, image_url,
  presets, sort_order, active, in_stock, builder
) VALUES (
  'item-build-your-plate',
  'cat-100',
  'Build Your Own Plate',
  'صحن على ذوقك',
  0,
  'plate',
  'Choose your skewers. Comes with grilled potato, onion, tomato and chilli, plus hummus and garlic on the side.',
  'اختر أسياخك. يأتي مع بطاطا وبصل وبندورة وفليفلة مشوية، مع حمّص وثوم على الجنب.',
  '',
  '[]'::jsonb,
  999,
  false,   -- ← activate once prices are set
  true,
  '{
    "min_skewers": 1,
    "skewers": [
      { "id": "taouk",        "en": "Taouk",        "ar": "طاووق",       "price": 0 },
      { "id": "kafta",        "en": "Kafta",        "ar": "كفتة",         "price": 0 },
      { "id": "kafta-chicken","en": "Chicken Kafta","ar": "كفتة دجاج",   "price": 0 },
      { "id": "lean-meat",    "en": "Lean Meat",    "ar": "لحم هبرة",    "price": 0 }
    ],
    "includes": [
      { "id": "potato",  "en": "Grilled Potato",   "ar": "بطاطا مشوية",   "removable": true },
      { "id": "onion",   "en": "Grilled Onion",    "ar": "بصل مشوي",      "removable": true },
      { "id": "tomato",  "en": "Grilled Tomato",   "ar": "بندورة مشوية",  "removable": true },
      { "id": "chilli",  "en": "Grilled Chilli",   "ar": "فليفلة مشوية",  "removable": true },
      { "id": "hummus",  "en": "Hummus on the side","ar": "حمّص على الجنب","removable": true },
      { "id": "garlic",  "en": "Garlic on the side","ar": "ثوم على الجنب", "removable": true }
    ],
    "swaps": [
      { "id": "extra-potato", "en": "Extra Grilled Potato", "ar": "بطاطا مشوية إضافية" },
      { "id": "extra-onion",  "en": "Extra Grilled Onion",  "ar": "بصل مشوي إضافي" },
      { "id": "extra-tomato", "en": "Extra Grilled Tomato", "ar": "بندورة مشوية إضافية" },
      { "id": "extra-chilli", "en": "Extra Grilled Chilli", "ar": "فليفلة مشوية إضافية" }
    ]
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET builder = EXCLUDED.builder;


-- ── Rollback ─────────────────────────────────────────────────────────────────
-- DELETE FROM items WHERE id = 'item-build-your-plate';
-- ALTER TABLE items DROP COLUMN builder;
