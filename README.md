# Website Lotto (WLVLP)
**Domain:** `websitelotto.virtuallaunch.pro`

Canva-site marketplace where buyers claim ready-made HTML website templates via buy-now, bidding, or scratch-to-win mechanics.

---

## System Overview

**What it is:** Next.js 15 frontend for browsing, voting on, bidding on, and claiming HTML website templates.

**What it is NOT:** Not a backend, not a site builder, not a template editor. Templates are immutable Canva exports served by the VLP Worker.

**Where it fits:** One of several VirtualLaunch.pro sub-platforms. Backend API and auth are handled by the central VLP Worker at `api.virtuallaunch.pro`.

---

## Architecture

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | Next.js 15 (App Router) + React 19 | CSS Modules, no Tailwind |
| Backend | VLP Worker (Cloudflare) | `api.virtuallaunch.pro` — all `/v1/wlvlp/*` endpoints |
| Auth | `vlp_session` cookie | Shared with VLP ecosystem |
| Hosting | Cloudflare Pages | Static export via `wrangler.toml` |
| Templates | 48 HTML files in `public/sites/` | Immutable Canva exports |

---

## Repo Structure

```
app/                  → Next.js App Router pages
components/           → Shared components (AuthGuard)
lib/api.ts            → All API functions
public/sites/         → 48 immutable HTML templates
scripts/              → Build/utility scripts
```

---

## Setup / Local Development

```bash
npm install
npm run dev          # http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
```

---

## Deployment

Cloudflare Pages — auto-deploys on push to `main`. Build output directory: `out`.

---

## Constraints

1. Next.js is the system layer — do NOT convert Canva exports to React
2. No PII in public responses
3. CSS Modules only — no Tailwind, no inline styles
4. Do not modify templates in `public/sites/`
5. All API endpoints defined in `lib/api.ts` — do not invent new ones

---

## Related Systems

| System | Repo | Role |
|--------|------|------|
| VLP Worker | `virtuallaunch.pro` | Backend API + auth + template serving |
| Games VLP | `games.virtuallaunch.pro` | Sibling platform |
| TaxClaim VLP | `taxclaim.virtuallaunch.pro` | Sibling platform |
| TaxMonitor | `taxmonitor.pro` | Sibling platform |
