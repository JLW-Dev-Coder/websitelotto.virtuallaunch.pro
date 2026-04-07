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
