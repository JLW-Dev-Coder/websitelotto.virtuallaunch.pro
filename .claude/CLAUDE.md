# Website Lotto (WLVLP) — Claude Code Guide

## Platform Purpose
Website Lotto is a marketplace where buyers claim ready-made HTML website templates hosted on virtuallaunch.pro subdomains.

## Business Model
$99/month subscription. Three acquisition mechanics:
1. **Buy Now** — instant claim at $99/mo
2. **Bidding** — 7-day auctions, minimum $29 bid
3. **Scratch to Win** — free ticket, lead gen mechanic (prizes: free month, 50% off, 25% off, $9 credit, free ticket, no prize)

## Template Architecture
- 48 immutable single-file HTML templates in `public/sites/{slug}/index.html`
- **Do NOT convert these to React or modify their HTML**
- Templates are served by the VLP Worker (separate Cloudflare Worker)
- Each template has a `defaultConfig` object injected by the Worker at serve time

## Site Serving
VLP Worker handles:
- Subdomain routing: `{slug}.websitelotto.virtuallaunch.pro`
- Runtime config injection into template HTML
- Edit panel injection for authenticated owners

## Next.js Layer
Next.js handles only:
- `/` — Marketplace gallery
- `/sites/[slug]` — Template detail page
- `/sign-in` — Auth (magic link + Google OAuth)
- `/scratch` — Scratch ticket page
- `/dashboard` — Buyer dashboard (multi-view SPA)
- `/support` — Support page
- `/success` — Post-payment success page

## Auth
- VLP `vlp_session` cookie
- `GET /v1/auth/session` → `{ account_id, email }`
- Redirect to `/sign-in?redirect=<path>` if no session

## API Endpoints (all in lib/api.ts)
- `GET /v1/auth/session`
- `GET /v1/wlvlp/templates` + `GET /v1/wlvlp/templates/:slug`
- `GET /v1/wlvlp/templates/:slug/bids`
- `POST /v1/wlvlp/templates/:slug/vote`
- `POST /v1/wlvlp/templates/:slug/bid`
- `POST /v1/wlvlp/checkout`
- `POST /v1/wlvlp/scratch`
- `POST /v1/wlvlp/scratch/:ticket_id/reveal`
- `GET /v1/wlvlp/buyer/:account_id`
- `PATCH /v1/wlvlp/config/:slug`
- `POST /v1/wlvlp/upload-logo`
- `POST /v1/auth/logout`

## CSS Modules Only
No Tailwind. No inline styles. All styles in `.module.css` files.

## Migration Status
Converted from plain HTML (public/index.html) + Cloudflare Worker to Next.js 15 App Router.
Legacy worker.js and edit-panel.js removed (functionality handled by VLP Worker).
