---
name: wlvlp-site-manager
description: >
  Manages the WLVLP website template marketplace. Handles site HTML files in
  public/sites/{slug}/index.html, generates schema.json for editable fields,
  creates marketplace listing metadata, and validates site inventory against
  wlvlp-catalog.json. Use this skill when the user mentions WLVLP sites,
  website lotto, site templates, marketplace listings, or site schemas.
---

# WLVLP Site Manager

## Inventory
- Source of truth: `wlvlp-catalog.json` (repo root)
- Site HTML: `public/sites/{slug}/index.html`
- Site schema: `public/sites/{slug}/schema.json` (auto-generated)
- Existing sites: 48 pre-existing + 162 new = 210 total

## Directory convention
Every site is a directory, not a flat file:
```
public/sites/barber-shop-luxury/
  index.html     ← the actual site
  schema.json    ← auto-generated editable fields
```

## Workflow: User pastes HTML from Canva

1. User opens `public/sites/{slug}/index.html` in VS Code
2. File contains a comment with the Canva thread URL
3. User opens that URL, copies the final HTML from the Canva chat
4. User pastes into the file, replacing the comment
5. User saves
6. Run `node scripts/generate-schemas.js` to create schema.json
7. Commit and push

## Workflow: RC generates schemas after paste

When user says "I pasted HTML into [files]":
1. Read `.claude/SKILL.md`
2. Run `node scripts/generate-schemas.js`
3. Verify schemas were created
4. Update `wlvlp-catalog.json` status if needed
5. Commit, push per post-task rules

## Schema format
```json
{
  "slug": "barber-shop-luxury",
  "fields": [
    { "id": "hero_title", "type": "text", "label": "Hero Title", "default": "Luxury Barber Shop" },
    { "id": "phone", "type": "text", "label": "Phone", "default": "(555) 123-4567" },
    { "id": "cta_text", "type": "text", "label": "CTA Text", "default": "Book Now" }
  ]
}
```

## Rules
- Never modify user-pasted HTML — only generate schemas from it
- wlvlp-catalog.json is the master inventory
- Directory convention: `public/sites/{slug}/index.html` — never flat files
- Do not delete existing 48 site directories

---

# WLVLP SCALE Batch Generator

Trigger phrases: "process leads for WLVLP", "generate WLVLP emails",
"build WLVLP asset pages", "run WLVLP batch", "WLVLP outreach".

## Inputs
- Source CSV: `IRS_FOIA_SORTED_-_results-20260401-195853.csv` (uploaded by user)
- Reference: `SCALE.md` for selection logic, copy templates, output paths
- Catalog: `wlvlp-catalog.json` for template slug matching by category

## Selection
1. Filter rows where `email_found` is non-empty, not "undefined", not NaN
2. Filter where `email_status` != "invalid"
3. Filter where `wlvlp_email_1_prepared_at` is empty
4. Sort ascending by `domain_clean` (nulls last)
5. Take first 50

## Per-prospect processing

For each row:

1. **Slug:** `{first}-{last}-{city}-{state}` lowercase, hyphens, strip titles
   (Mr., Mrs., Dr., CPA, EA, JD, Esq.). Dedup with `-2`, `-3` on collision.

2. **Credential label:** map `credential` → "Enrolled Agent" | "CPA" | "Tax Attorney" | "Tax Professional"

3. **Template match:** pick from `wlvlp-catalog.json` by credential:
   - EA / unknown → tax / clean modern category
   - CPA → accounting / corporate category
   - JD/Attorney → legal / professional services category

4. **firm_bucket personalization:**
   - `solo_brand` → solo subject + headline (see SCALE.md)
   - `local_firm` → firm subject + headline

5. **Asset page object:** build per `asset_page` schema in SCALE.md

6. **Email 1 body:** fill the template in SCALE.md with `{First}`, asset page URL,
   scratch URL, booking URL. No emoji. No exclamation marks. Plain text.

## Outputs

1. **JSON batch:** `scale/wlvlp-batches/wlvlp-batch-{YYYY-MM-DD}.json`
   Array of `{ email, first_name, slug, subject, body, asset_page }`

2. **Gmail CSV:** `scale/wlvlp-gmail/email1/{YYYY-MM-DD}-batch.csv`
   Columns exactly: `email, first_name, subject, body`

3. **Asset pages:** one JSON per slug, ready to push to R2 at
   `vlp-scale/wlvlp-asset-pages/{slug}.json`

4. **Updated source CSV:** write `wlvlp_email_1_prepared_at` = current ISO timestamp
   for every selected row

## Hard rules
- Never invent prospects — only use rows from the source CSV
- Never reuse a slug from a prior batch
- Never modify TTMP tracking columns — only `wlvlp_*` columns
- Plain text only. No emoji. No exclamation marks. No "guaranteed", no "lottery"
- Use the term "scratch ticket", never "raffle" or "lottery"
- Templates in `public/sites/` are immutable — do not edit them as part of the batch
