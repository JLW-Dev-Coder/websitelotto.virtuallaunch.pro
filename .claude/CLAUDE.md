# Website Lotto (WLVLP) — Claude Code Guide
**Repo:** `websitelotto.virtuallaunch.pro`
**Product:** Website Lotto
**Domain:** `websitelotto.virtuallaunch.pro`
**Last updated:** 2026-04-07

One-line: Canva-site marketplace — vote, bid, buy-now, or scratch-to-win HTML templates.

---

## System Definition

**What it is:** A Next.js 15 App Router frontend for a Canva-site template marketplace. Buyers browse, vote, bid on, or instantly claim ready-made HTML website templates.

**What it is NOT:**
- Not a backend — all API logic lives in the VLP Worker (`virtuallaunch.pro`)
- Not a template editor — templates are immutable single-file HTML served by VLP Worker
- Not a site builder — Next.js is the system layer, not a rendering engine for templates

**Audience:** Small-business owners, freelancers, and solopreneurs who want a ready-to-go website without design or dev work.

**Stack:**
- Next.js 15 (App Router) + React 19
- TypeScript 5
- CSS Modules (no Tailwind, no inline styles)
- Cloudflare Pages (static export via `wrangler.toml`)

**Backend dependency:** VLP Worker at `api.virtuallaunch.pro` (VLP family) — owns all `/v1/wlvlp/*` and `/v1/auth/*` endpoints.

---

## Pricing (current)

| Stripe Product | Price | Type | When charged |
|----------------|-------|------|-------------|
| WLVLP Site — Standard | $249 | One-time | At purchase |
| WLVLP Site — Premium | $399 | One-time | At purchase |
| WLVLP Hosting | $14/mo | Subscription | After year 1 |
| WLVLP Premium Hosting | $49/mo | Subscription | Optional upgrade anytime |

Auctions and scratch tickets discount the one-time template price; hosting is billed separately.

---

## Purchase Flow

1. Visitor browses WLVLP, clicks "Buy Now" on a site
2. Site's category determines price ($249 or $399)
3. Stripe checkout opens (anonymous allowed, same pattern as TMP)
4. After payment, webhook creates site instance, assigns to account
5. Hosting is free for 12 months (tracked by `purchased_at` date)
6. Month 11: email reminder about hosting renewal
7. Month 13+: $14/mo subscription auto-starts

---

## Canva Folder Structure

| Folder | Canva ID |
|--------|----------|
| WLVLP Templates (parent) | FAHGJNOrtCY |
| Services | FAHGJDzQLsA |
| Tax and Finance | FAHGJGDn5YE |
| Food and Beverage | FAHGJB9wuqE |
| Entertainment | FAHGJNstHBo |
| Real Estate and Home | FAHGJHTNC7c |
| Beauty and Fashion | FAHGJJ1w_PE |
| Legal | FAHGJDTUvMs |
| Sports and Fitness | FAHGJIFCNLs |
| Tech and Digital | FAHGJHSPsr8 |
| Travel and Adventure | FAHGJBX47vk |
| Lifestyle and Hobby | FAHGJPBcFUE |

---

## Catalog

- **210+ sites** in `public/sites/` — each has `preview.html` (Canva HTML) and `schema.json` (editable fields)
- Schemas auto-generated via `node scripts/generate-schemas.js`
- Catalog index: `wlvlp-catalog.json`
- Site editor lives at `/dashboard/sites/{slug}/edit` — schema-driven form, saves via API

---

## Hard Constraints

1. **Next.js is the system layer — do NOT convert Canva exports to React.**
2. **No PII in public responses.**
3. Do not modify HTML templates in `public/sites/` — they are immutable Canva exports.
4. Do not invent API endpoints — use only those defined in `lib/api.ts`.
5. No backend changes in this repo — all API logic is in the VLP Worker.
6. CSS Modules only — no Tailwind, no inline styles, no global class selectors.
7. Auth uses `vlp_session` cookie — do not create a separate auth system.

---

## Terminology

| Use | Do NOT use |
|-----|-----------|
| template | theme, page, design |
| claim | purchase, buy (except in "Buy Now" button copy) |
| slug | id, template_id (in URL context) |
| marketplace | store, shop |
| scratch ticket | lottery, raffle |

---

## Repo Structure

```
app/                  → Next.js App Router pages
  page.tsx            → Marketplace gallery (home)
  sites/[slug]/       → Template detail page
  sign-in/            → Auth (magic link + Google OAuth)
  scratch/            → Scratch-to-win page
  dashboard/          → Buyer dashboard (multi-view SPA)
  dashboard/sites/[slug]/edit/  → Site editor (schema-driven form)
  affiliate/          → Affiliate program dashboard
  onboarding/         → New-user onboarding flow
  success/            → Post-payment confirmation
  support/            → Support page
  asset/[slug]/       → Public, unauthenticated landing page for SCALE campaign prospects (data from R2 via /v1/wlvlp/asset-pages/:slug; served via _redirects rewrite). When asset data includes `conversion_leak_report`, the page renders the Conversion Leak Report layout (score ring, metrics grid, leaks list, before/after, interactive live-updating calculator, CTAs). Otherwise it falls back to the legacy template-preview layout.
components/           → Shared components (AuthGuard)
lib/
  api.ts              → All API functions — source of truth for endpoints
public/sites/         → 210+ template directories (Canva exports)
  {slug}/preview.html → Immutable Canva HTML export
  {slug}/schema.json  → Editable field schema (generated)
scripts/              → Build/utility scripts
.claude/              → Claude Code config, canonicals, style guide
```

---

## API Endpoints (source of truth: lib/api.ts)

All calls go to `api.virtuallaunch.pro` with `credentials: 'include'`.

- Auth: `GET /v1/auth/session`, `POST /v1/auth/logout`
- Templates: `GET /v1/wlvlp/templates`, `GET /v1/wlvlp/templates/:slug`
- Bids: `GET /v1/wlvlp/templates/:slug/bids`, `POST /v1/wlvlp/templates/:slug/bid`
- Voting: `POST /v1/wlvlp/templates/:slug/vote`
- Checkout: `POST /v1/wlvlp/checkout`
- Scratch: `POST /v1/wlvlp/scratch`, `POST /v1/wlvlp/scratch/:ticket_id/reveal`
- Dashboard: `GET /v1/wlvlp/buyer/:account_id`
- Config: `PATCH /v1/wlvlp/config/:slug`
- Upload: `POST /v1/wlvlp/upload-logo`
- Affiliate: `GET /v1/affiliates/:account_id`, `GET /v1/affiliates/:account_id/events`, `POST /v1/affiliates/connect/onboard`, `POST /v1/affiliates/payout/request`
- Asset pages: `GET /v1/wlvlp/asset-pages/:slug`
- Site requests: `POST /v1/wlvlp/site-requests`, `GET /v1/wlvlp/site-requests/:slug`
- Custom sites: `GET /v1/wlvlp/custom-sites/:slug` (generated homepage preview)

---

## Conversion Leak Report Questionnaire

The asset page (`/asset/{slug}`) renders an inline questionnaire under the Conversion Leak Report layout. Prospects answer questions about their firm and submit a free site generation request:

1. Form fields: firm_name (required, pre-filled from `data.firm`), services (checkboxes — at least one required, includes "Other" with text input), target_clients, color_scheme (5 visual swatches incl. "match my branding" custom hex), logo_url, phone, email, additional_notes.
2. City and state are pre-filled from the asset page data and submitted with the request.
3. Submit calls `POST /v1/wlvlp/site-requests` with the full payload including the asset slug.
4. On success the form is replaced by a confirmation panel: "Your homepage is being built." The panel then polls `GET /v1/wlvlp/site-requests/:slug` every 30 s.
5. When `status === 'generated'`, the panel switches to "Your homepage is ready." with an iframe + new-tab link to `GET /v1/wlvlp/custom-sites/:slug`.
6. The legacy "See the upgraded version of your website" CTA was removed; the questionnaire replaces it. The booking call CTA and "Browse templates" CTA remain.

---

## Auth

- Cookie: `vlp_session` (set by VLP Worker)
- Session check: `GET /v1/auth/session` → `{ account_id, email }`
- No session → redirect to `/sign-in?redirect=<path>`
- AuthGuard component in `components/AuthGuard.tsx`

---

## Post-Task Requirements

After every task, verify:
1. `npm run build` passes
2. No new TypeScript errors
3. No PII exposed in any public-facing component
4. CSS Modules only — no Tailwind, no inline styles added
5. Templates in `public/sites/` not modified

## Post-Task Rules (mandatory after every task)

1. **Commit:** After completing any task, commit all changed files with a descriptive message. Never leave work uncommitted.
2. **Push:** After committing, always run `git push origin main`. Do not ask for confirmation.
3. **Deploy:** Push triggers Cloudflare Pages automatically for WLVLP. No manual deploy needed.
4. **Report:** After commit+push, report the commit hash and any errors.

---

## Migration Status

Fully migrated from plain HTML + Cloudflare Worker to Next.js 15 App Router.
- Legacy `worker.js` and `edit-panel.js` removed
- Frontend calls `api.virtuallaunch.pro` (VLP Worker)
- Auth via shared `vlp_session` cookie
- Deployed as Cloudflare Pages (static export)

---

## Related Systems

| System | Repo | Relationship |
|--------|------|-------------|
| VLP Worker | `virtuallaunch.pro` | Backend API, auth, template serving |
| TaxMonitor | `taxmonitor.pro` | Sibling platform |
| Games VLP | `games.virtuallaunch.pro` | Sibling platform |
| TaxClaim VLP | `taxclaim.virtuallaunch.pro` | Sibling platform |
