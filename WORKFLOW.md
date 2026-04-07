# WORKFLOW — Website Lotto (WLVLP)
**Owner:** JLW
**Last updated:** 2026-04-06

---

## Daily Operations

### Morning checklist
1. Check Stripe dashboard — new subscriptions, failed payments, churns
2. Check marketplace gallery — templates rendering, no broken thumbnails
3. Check active auctions — any ending today? Verify bid counts
4. Review scratch ticket redemptions — unusual spikes may indicate abuse

### Template management
- Templates are Canva AI Code HTML exports in `public/sites/{slug}/index.html`
- Adding a new template: create in Canva AI Code → copy HTML → save to `public/sites/{slug}/index.html` → run `node scripts/generate-schemas.js` → add to `wlvlp-catalog.json` → commit and push
- Do NOT edit existing template HTML directly

### Deployment
- Push to `main` → Cloudflare Pages auto-deploys
- Build command: `npm run build`
- Output directory: `out`

---

## One-Time Migration: Copying 162 Sites from Canva

### Setup (already done by RC)
- 210 site directories exist in `public/sites/`
- Each new site has `index.html` with a comment containing the Canva thread URL
- 48 sites already have real HTML (pre-existing)

### Copy process
1. Open VS Code to `public/sites/`
2. Pick a site directory (work A→Z)
3. Open `index.html` — the comment shows the Canva thread URL
4. Ctrl+click the URL — opens the Canva AI Code chat
5. In the chat, find the final HTML output
6. Select All → Copy the full HTML source
7. Paste into `index.html` (replaces the comment)
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
- Sites still placeholder: `grep -rl "PASTE HTML FROM CANVA" public/sites/*/index.html | wc -l`

---

## Adding a New Site (ongoing)

1. Create in Canva AI Code (or ask Chat Claude to generate)
2. Copy the final HTML
3. `mkdir public/sites/{slug} && paste into public/sites/{slug}/index.html`
4. Run `node scripts/generate-schemas.js`
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
grep -rl "PASTE HTML" public/sites/*/index.html | wc -l  # Count remaining
```

---

## Troubleshooting

- **Template not loading:** Check `public/sites/{slug}/index.html` exists and has real HTML
- **Auth not working:** Check `vlp_session` cookie → verify `api.virtuallaunch.pro` responds
- **Build failing:** Run `npm run build` locally → check errors
- **Schema not generated:** File still has placeholder comment — paste HTML first
