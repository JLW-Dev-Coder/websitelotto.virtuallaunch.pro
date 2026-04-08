# WORKFLOW — Website Lotto (WLVLP)
**Owner:** JLW
**Last updated:** 2026-04-07

---

## Operational Phases (current state)

- **Phase 1 — Catalog:** 210+ sites in `public/sites/{slug}/preview.html` with auto-generated `schema.json`. Catalog index at `wlvlp-catalog.json`. Marketplace gallery rendering from VLP Worker with catalog fallback.
- **Phase 2 — Buyer experience:** Site editor at `/dashboard/sites/{slug}/edit` (schema-driven form, saves via API). Custom domain UI + hosting expiry warnings live in dashboard.
- **Phase 3 — Acquisition mechanics:** Vote / Bid / Scratch all wired to VLP Worker endpoints. Prize copy reflects current pricing ($249 / $399 templates, $14 / $49 hosting).

---

## Daily Operations

### Morning checklist
1. Check Stripe dashboard — new subscriptions, failed payments, churns
2. Check marketplace gallery — templates rendering, no broken thumbnails
3. Check active auctions — any ending today? Verify bid counts
4. Review scratch ticket redemptions — unusual spikes may indicate abuse

### Template management
- Templates are Canva AI Code HTML exports in `public/sites/{slug}/preview.html`
- Each site also has `public/sites/{slug}/schema.json` (auto-generated editable field schema)
- Adding a new template: create in Canva AI Code → copy HTML → save to `public/sites/{slug}/preview.html` → run `node scripts/generate-schemas.js` → add to `wlvlp-catalog.json` → commit and push
- Do NOT edit existing template HTML directly — buyers edit via `/dashboard/sites/{slug}/edit` (schema-driven form, saves through API)

### Deployment
- Push to `main` → Cloudflare Pages auto-deploys
- Build command: `npm run build`
- Output directory: `out`

---

## One-Time Migration: Copying Sites from Canva

### Setup (already done by RC)
- 210+ site directories exist in `public/sites/`
- Each new site has `preview.html` with a comment containing the Canva thread URL
- Pre-existing sites already have real HTML

### Copy process
1. Open VS Code to `public/sites/`
2. Pick a site directory (work A→Z)
3. Open `preview.html` — the comment shows the Canva thread URL
4. Ctrl+click the URL — opens the Canva AI Code chat
5. In the chat, find the final HTML output
6. Select All → Copy the full HTML source
7. Paste into `preview.html` (replaces the comment)
8. Save → move to next site

### Batch commits
After every 20-30 sites:
```bash
git add -A
git commit -m "[WLVLP] Add sites {letter range} HTML"
git push origin main
```

### After each batch
```bash
node scripts/generate-schemas.js
git add -A
git commit -m "[WLVLP] Generate schemas for {letter range}"
git push origin main
```

### Tracking progress
- Sites with real HTML: check file size > 100 bytes
- Sites still placeholder: `grep -rl "PASTE HTML FROM CANVA" public/sites/*/preview.html | wc -l`

---

## Adding a New Site (ongoing)

**Canva-to-repo pipeline:**
- All site HTML originates from Canva AI Code chats
- Open the Canva chat → find the final HTML → copy all → paste into `public/sites/{slug}/preview.html` (replacing any comment placeholder) → save
- Once HTML is in repo, RC scans it, auto-generates `schema.json`, and creates the marketplace listing
- Future sites created via Canva AI Code or the Canva connector follow the same flow

1. Create in Canva AI Code (or ask Chat Claude to generate)
2. Copy the final HTML
3. `mkdir public/sites/{slug} && paste into public/sites/{slug}/preview.html`
4. Run `node scripts/generate-schemas.js` (creates `schema.json`)
5. Add entry to `wlvlp-catalog.json`
6. Commit and push

### Asking RC to help after pasting
Prompt: "Read .claude/SKILL.md. I pasted HTML into these sites: [list]. Generate schemas and update the catalog."

---

## Weekly Operations

- Auction review: completed auctions, revenue
- Scratch ticket metrics: issued vs redeemed vs converted
- Template performance: most votes/views → feature candidates
- Affiliate check: new affiliates, pending payouts
- Content refresh: add new templates from Canva pipeline

---

## Key Commands

```bash
npm run dev                          # Local dev
npm run build                        # Production build
node scripts/generate-schemas.js     # Auto-generate schemas from HTML
grep -rl "PASTE HTML" public/sites/*/preview.html | wc -l  # Count remaining
```

---

## SCALE Campaign Operations

### Daily batch
1. Upload FOIA CSV to Claude
2. Claude generates next 50 WLVLP prospects (email copy + asset page data)
3. Push email1 queue to R2: `vlp-scale/wlvlp-send-queue/email1-pending.json`
4. Push asset pages to R2: `vlp-scale/wlvlp-asset-pages/{slug}.json`
5. VLP Worker cron sends Email 1
6. 3 days later: generate Email 2 batch, push to R2

### Asset page route
- URL: `websitelotto.virtuallaunch.pro/asset/[slug]`
- Served by: VLP Worker reading from R2

### Tracking
- Email sends, opens, clicks (VLP Worker)
- Asset page views per slug (VLP Worker)
- Scratch ticket redemptions
- Template claims (Stripe)

See `SCALE.md` for full campaign spec and `.claude/SKILL.md` for batch generator skill.

---

## Troubleshooting

- **Template not loading:** Check `public/sites/{slug}/preview.html` exists and has real HTML
- **Editor form empty:** `public/sites/{slug}/schema.json` missing — re-run `node scripts/generate-schemas.js`
- **Auth not working:** Check `vlp_session` cookie → verify `api.virtuallaunch.pro` responds
- **Build failing:** Run `npm run build` locally → check errors
- **Schema not generated:** File still has placeholder comment — paste HTML first
