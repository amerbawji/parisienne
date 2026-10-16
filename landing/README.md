# Boucherie & Grill Parisienne — Landing Page

Standalone marketing page for `grillparisienne.com`. **Completely independent of the
React ordering app** — no build step, no Node, no npm. Plain HTML/CSS/JS, and it is
never included in `npm run build`.

---

## ⚠️ Read this first — the domain is already in use

`grillparisienne.com` is hosted on GKG (`208.180.77.176`, nameservers `ns85/ns86.gkg.net`)
and `public_html` **already contains a build of the ordering app**. Uploading this
landing page straight into `public_html` would overwrite the live app.

The plan is to split them:

| URL | Serves |
|-----|--------|
| `grillparisienne.com` | this landing page |
| `order.grillparisienne.com` | the React ordering app |

`ORDER_URL` in `index.html` is already set to `https://order.grillparisienne.com`.

### Migration steps (cPanel)

1. **Back up what's live.** File Manager → select everything in `public_html` →
   Compress → download the zip. Do not skip this.
2. **Create the subdomain.** cPanel → *Domains* → *Create A Domain* → subdomain
   `order.grillparisienne.com`. Set its document root to `/home/<user>/order`
   (not inside `public_html`).
3. **Move the app.** Move the current contents of `public_html` (`index.html`,
   `assets/`, `sw.js`, icons, etc.) into `/home/<user>/order`.
4. **Add SPA rewrites for the app.** The live app currently 404s on `/admin` because
   Apache has no rewrite rule. Create `/home/<user>/order/.htaccess`:

   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

   This is the Apache equivalent of the `rewrites` rule in `vercel.json`.
5. **Upload the landing page.** Put the contents of this `landing/` folder into the
   now-empty `public_html` (see structure below).
6. **Enable HTTPS.** cPanel → *SSL/TLS Status* → run AutoSSL for both
   `grillparisienne.com` and `order.grillparisienne.com`. **The site is currently
   HTTP-only** — `https://www.grillparisienne.com` does not respond at all. Browsers
   flag that as "Not secure", and the app's PWA/service worker requires HTTPS to
   install.
7. **Verify** before telling anyone: landing loads at the root, app loads on the
   subdomain, `order.grillparisienne.com/admin` returns the admin panel (not a 404),
   and every "Order" button on the landing page lands on the app.

### Final structure on the server

```
public_html/                 ← landing page
├── index.html
├── favicon.ico
├── apple-touch-icon-180x180.png
└── images/
    ├── grilled.jpg
    ├── sandwiches.jpg
    ├── lahm-b-aajin.jpg
    ├── chicken.jpg
    ├── appetizers.jpg
    ├── plates.jpg
    └── beverages.jpg

/home/<user>/order/          ← ordering app (subdomain doc root)
├── index.html
├── .htaccess
├── assets/
└── …
```

---

## Editing the page

Everything editable lives in the `<script>` block at the bottom of `index.html`.

| What | Where |
|------|-------|
| Ordering app URL | `ORDER_URL` |
| Phone / WhatsApp | search `9613502022` (3 places) and the display text `+961 3 502 022` |
| Address | `infoAddr` in both `T.ar` and `T.en` |
| Opening hours | `infoHours` in both `T.ar` and `T.en` — currently "Open daily" |
| Category tiles | `CATS` array |
| About list | `VALUES` array |
| How-to-order steps | `STEPS` array |
| Gold scrolling ticker | `MQ` array |

**Bento tile sizes:** each `CATS` entry has a `cls` — `t-feature` (2×2), `t-tall` (1×2),
`t-wide` (2×1), `t-sm` (1×1). Keep the spans filling complete rows of 4 columns.

**Images** must be at least 1200px on the long edge — the large tiles show softness
immediately. (The plated-dish photos from the app were 213×320, too small to use.)

---

## Notes

- **Bilingual.** English is the default; the عربي button in the header switches
  language, text direction, the serif/sans font pairing, and the ticker's scroll
  direction together.
- **Address** is `Georges Zouein Street, Qoreitem, Ras Beirut`, derived by
  reverse-geocoding the Google Maps pin (`33.8887, 35.4794`). Worth confirming it
  matches how you'd write it on a sign.
- **Colours** come from the app's Tailwind theme: navy `#0c2345`, gold `#e9b85e`.
- **Fonts** load from Google Fonts (Cormorant Garamond + Inter for English, Amiri +
  Almarai for Arabic). This is the page's only external request; without internet it
  falls back to system fonts and still works.
- **Motion** (hero drift, scroll reveals, ticker) is disabled automatically under
  `prefers-reduced-motion`.
- **Preview locally** by double-clicking `index.html`.
