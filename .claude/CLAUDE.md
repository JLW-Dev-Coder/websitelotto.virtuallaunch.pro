# Website Lotto (WLVLP) — Claude Code Guide
**Repo:** `websitelotto.virtuallaunch.pro`
**Product:** Website Lotto
**Domain:** `websitelotto.virtuallaunch.pro`
**Last updated:** 2026-04-04

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

**Backend dependency:** VLP Worker at `api.virtuallaunch.pro` — owns all `/v1/wlvlp/*` and `/v1/auth/*` endpoints.

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
  affiliate/          → Affiliate program dashboard
  onboarding/         → New-user onboarding flow
  success/            → Post-payment confirmation
  support/            → Support page
components/           → Shared components (AuthGuard)
lib/
  api.ts              → All API functions — source of truth for endpoints
public/sites/         → 48 immutable HTML templates (Canva exports)
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
