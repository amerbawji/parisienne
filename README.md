# Parisienne — Restaurant Ordering App

A full-stack online ordering app for Parisienne restaurant. Customers browse the menu, customize items, and send orders via WhatsApp. The admin panel manages the menu, orders, and store settings.

## Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS v3** for styling
- **Supabase** — database, auth, and image storage
- **Zustand** for client state
- **React Router v7** for routing
- **Headless UI** + **Heroicons** for UI components
- **PWA** support via `vite-plugin-pwa`

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Customer-facing menu (Home) |
| `/cart` | Cart page (legacy, cart is now a sheet) |
| `/admin` | Admin panel (password-protected) |

## Features

### Customer (Home)
- Browse menu by category with live search and category filter
- Item modal with image, description, options (radio/select), presets, and quantity
- Cart sheet with order summary, service type (delivery/pickup/dine-in), and WhatsApp checkout
- Promo splash popup on first visit
- Recently viewed items
- EN/AR bilingual (full RTL support for Arabic)
- Store open/closed banner based on schedule
- PWA installable on mobile

### Admin (`/admin`)
- **Menu tab** — add/edit/delete categories and items, drag to reorder, toggle active/in-stock, quick image upload
- **Orders tab** — view orders by date, update status (pending → preparing → ready → delivered)
- **Settings tab** — store status override, opening hours + closed days, WhatsApp number, store-wide discount %, hide items without photo toggle, promo popup image

## Project Structure

```
src/
├── pages/
│   ├── Home.tsx          # Customer menu page
│   ├── Admin.tsx         # Admin panel (menu, orders, settings tabs)
│   └── Cart.tsx          # Cart page
├── components/
│   ├── Cart/             # CartSheet, CartContent, CartItemRow
│   ├── Menu/             # MenuCard (item modal + add to cart)
│   └── UI/               # Button, LanguageToggle, QuantitySelector, InstallPrompt
├── store/
│   ├── cartStore.ts       # Cart items, open/close state
│   ├── menuStore.ts       # Categories + items from Supabase
│   ├── storeConfigStore.ts # Hours, WhatsApp, discount, force open/closed
│   ├── languageStore.ts   # EN/AR toggle + t() helper
│   ├── promoStore.ts      # Promo popup enabled + image
│   ├── lastOrderStore.ts  # Persisted last order for re-order
│   └── recentlyViewedStore.ts
├── lib/
│   └── supabase.ts        # Supabase client + image upload helper
├── data/
│   └── translations.ts    # All EN + AR strings
└── utils/
    ├── cn.ts              # clsx + tailwind-merge helper
    └── whatsapp.ts        # Order → WhatsApp message formatter
```

## Environment Variables

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Supabase Schema

Key tables:

- **`categories`** — `id, name_en, name_ar, image, active, sort_order`
- **`items`** — `id, category_id, name_en, name_ar, description_en, description_ar, price, image, active, in_stock, options (jsonb), presets (jsonb), sort_order`
- **`orders`** — `id, created_at, status, service_type, customer_name, customer_phone, items (jsonb), total, delivery_*, payment_method, timing, scheduled_time, location_url`
- **`store_config`** — single row (`id=1`) with `open_time, close_time, closed_days, whatsapp_number, discount_percentage, hide_items_without_image`

Storage bucket: **`menu-images`** (public)

## Getting Started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
npm run preview    # preview production build
```

## Deployment

Deployed to **Vercel** with auto-deploy on push to `master`. Set the environment variables in the Vercel project settings.
