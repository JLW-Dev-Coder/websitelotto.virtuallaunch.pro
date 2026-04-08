# SCALE — Website Lotto (WLVLP)
**Last updated:** 2026-04-07

## Objective
Convert tax professionals from the FOIA list into WLVLP template buyers.
Entry ask: "Your practice deserves a site that looks as sharp as your work."
Conversion path: email → asset page (template preview) → claim ($249) or scratch ticket (free entry).

## Platform Focus: WLVLP
- Domain: websitelotto.virtuallaunch.pro
- Product: Ready-made HTML website templates for tax professionals
- Pricing: $249 standard / $399 premium one-time, $14/$49/mo hosting
- Target: 66,000+ U.S. tax professionals (CPAs, EAs, tax attorneys) from IRS FOIA list
- Catalog: 210+ templates

## Tech Stack
Same as TTMP:
- Claude Max ($100/mo) for batch generation and personalization
- Gmail (via VLP Worker) for delivery
- Cal.com for booking
- Stripe for payment
- Cloudflare R2 for asset page + send-queue storage
- VLP Worker cron for sends and tracking

## Pipeline
1. **Source:** Same FOIA CSV as TTMP (`IRS_FOIA_SORTED_-_results-20260401-195853.csv`)
2. **Generate:** Claude processes uploaded file — asset page data + email copy per prospect
3. **Store:** Push JSON to R2 (`vlp-scale/wlvlp-asset-pages/{slug}.json`)
4. **Send:** VLP Worker cron delivers Email 1 via Gmail
5. **Track:** Worker logs asset page views, CTA clicks
6. **Follow up:** Automated Email 2 after 3-day delay
7. **Close:** Booked calls on Google Meet, demo WLVLP, close sale

## Source CSV Schema
Identical to TTMP — same columns, same prospect tracking columns, but with `wlvlp_` prefixed tracking columns:
- `wlvlp_email_1_prepared_at`
- `wlvlp_email_2_prepared_at`
- `wlvlp_email_1_sent_at`
- `wlvlp_email_2_scheduled_for`
- `wlvlp_email_2_sent_at`

## Selection Logic
Same as TTMP but filter on `wlvlp_email_1_prepared_at` instead:
1. Filter: `email_found` not empty, not "undefined", not NaN
2. Filter: `email_status` not "invalid"
3. Filter: `wlvlp_email_1_prepared_at` is empty
4. Sort: ascending by `domain_clean` (nulls last)
5. Select: first 50 eligible records

## Per-Prospect Generation

### Slug
`{first}-{last}-{city}-{state}` — lowercase, hyphens, strip titles
Dedup: append `-2`, `-3` on collision

### Template Matching by Credential
| Credential | Suggested template category |
|------------|----------------------------|
| EA | Tax professional / clean modern |
| CPA | Accounting firm / corporate |
| JD/Attorney | Legal / professional services |
| Unknown | Tax professional / clean modern |

### Asset page object (key: `asset_page`)
```json
{
  "headline": "{First}, your {City} practice deserves a site this sharp",
  "subheadline": "A ready-made professional website for {credential_label} practices",
  "template_preview_slug": "{matched template slug from catalog}",
  "template_preview_url": "https://websitelotto.virtuallaunch.pro/sites/{slug}/preview.html",
  "practice_type": "EA | CPA | Attorney",
  "city": "...",
  "state": "...",
  "cta_claim_url": "https://websitelotto.virtuallaunch.pro/sites/{template_slug}",
  "cta_scratch_url": "https://websitelotto.virtuallaunch.pro/scratch",
  "cta_booking_url": "https://cal.com/vlp/wlvlp-discovery"
}
```

Asset page URL: `https://websitelotto.virtuallaunch.pro/asset/{slug}`

### Personalization by `firm_bucket`

**solo_brand:**
- Subject: `{First} — I found a site template that fits {DBA}`
- Headline: `{First}, your {City} practice deserves a site this sharp`

**local_firm:**
- Subject: `{First} — {City} {credential_label} firms are upgrading their web presence`
- Headline: `{First}, here's what a modern site looks like for a {City} practice`

### Email 1 body structure (plain text)
```
{First},

[Pain — your website is the first thing prospects see, most tax pro sites
look like they were built a decade ago — 2 sentences]

[Pitch — 210+ ready-made templates, claim in one click, $249 one-time,
live in minutes — 2 sentences]

Here's a template I matched to your practice type — take a look, no account needed:
https://websitelotto.virtuallaunch.pro/asset/{slug}

Or try your luck with a free scratch ticket — you might win a discount or free hosting:
https://websitelotto.virtuallaunch.pro/scratch

If you want to see more options, I can walk you through the catalog — 15 minutes on Google Meet.
https://cal.com/vlp/wlvlp-discovery

—
Jamie L Williams
Website Lotto
websitelotto.virtuallaunch.pro
```

### Email 2 body structure
- Subject: `Quick question about your firm's website, {First}`
- Reference prior email
- Lead with asset page URL
- Mention scratch ticket as low-commitment entry
- CTAs: asset page + booking

## Output Files
1. **JSON batch:** `scale/wlvlp-batches/wlvlp-batch-{YYYY-MM-DD}.json`
2. **Gmail CSV:** `scale/wlvlp-gmail/email1/{YYYY-MM-DD}-batch.csv`
   Columns exactly: `email, first_name, subject, body`
3. **Updated source CSV:** write `wlvlp_email_1_prepared_at` timestamp

## Tone Rules
- Direct, no fluff
- No emoji anywhere
- No exclamation marks
- Problem-first
- Specific numbers always
- Exciting but not gimmicky — the gamification (scratch tickets) is real, not a trick
