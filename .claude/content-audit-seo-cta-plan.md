# WLVLP Content Audit + SEO CTA Plan
**Date:** 2026-04-04

---

## Step 1 — Content Page Inventory

| Content Page | Route | Topic | Current CTA | SEO Potential |
|---|---|---|---|---|
| Homepage / Gallery | `/` | Marketplace listing of 48 website templates — hero, how-it-works, pricing, FAQ | "See Templates", "Get Free Scratch Ticket", "Claim a Site", "Browse Auctions", "Get My Ticket" | **High** — primary landing page, category browsing |
| Template Detail | `/sites/[slug]` | Individual template preview with live iframe, voting, bidding, buy-now | "Buy Now — $99/mo", "Place Bid", "Vote" | **High** — 48 unique pages, each targetable for "[profession] website" keywords |
| Scratch-to-Win | `/scratch` | Gamified ticket reveal for free/discounted templates | "Get Your Free Ticket", "Browse Templates" | **Medium** — unique angle, linkable/shareable |
| Sign-In | `/sign-in` | Auth (magic link + Google OAuth) | "Send Magic Link", "Continue with Google" | None |
| Dashboard | `/dashboard` | Buyer site management, editing, subscription | Tab nav, "Affiliate" link | None (authenticated) |
| Onboarding | `/onboarding` | 3-step post-purchase setup wizard | "Next", "Launch My Site" | None (authenticated) |
| Success | `/success` | Post-purchase confirmation + checklist | "Go to Dashboard", "Browse More Templates" | None |
| Affiliate | `/affiliate` | Referral dashboard, earnings, payouts | "Copy Link", "Connect Bank", "Request Payout" | **Low** — could rank for "website affiliate program" |
| Support | `/support` | FAQ + ticket submission | "Open Dashboard" | **Low** |

**Pages with SEO potential: 4** (Homepage, Template Detail x48, Scratch, Affiliate)

---

## Step 2 — SEO Assessment

### Can marketplace listings rank for "professional website for [profession]"?

**Honest answer: Not yet, but the surface area is there.**

**What works:**
- 48 unique template detail pages at `/sites/[slug]` — each maps naturally to a profession or niche (e.g., `barber-shop-luxury` → "barber website", `criminal-attorney` → "attorney website", `dental-office-with-glow` → "dental website")
- Live preview via iframe gives real content signal
- Pricing is clear and competitive ($99/mo vs agency $2k-10k)
- Unique acquisition model (bid, scratch) is linkbait-worthy

**What's missing:**
1. **No page-level metadata** — every page uses the root layout title/description. Google sees identical meta for all 48 templates.
2. **No sitemap.xml** or **robots.txt**
3. **No structured data** (Product, Offer, AggregateRating schema)
4. **No keyword-targeted copy** on template detail pages — descriptions are generic or empty
5. **No blog or content hub** — zero informational pages to capture top-of-funnel searches
6. **Static export** means no SSR metadata — but `generateMetadata` with `generateStaticParams` can still produce unique `<title>` and `<meta>` tags at build time

### Target keyword families:
- `[profession] website template` (e.g., "barber website template")
- `professional website for [profession]` (e.g., "professional website for dentists")
- `cheap website for small business`
- `website without hiring a developer`
- `ready-made website templates`

### Recommended article topics (5-10):

1. **"How Much Does a Small Business Website Cost in 2026?"** — comparison of agency vs DIY vs template marketplace. CTA: browse templates.
2. **"10 Things Every Barber Shop Website Needs"** — profession-specific, links to barber templates.
3. **"Why Your Dental Practice Needs a Website (Not Just a Google Profile)"** — targets dentists specifically.
4. **"Website Templates vs Custom Design: What Small Businesses Actually Need"** — positions marketplace as the middle ground.
5. **"How to Launch a Professional Website in Under 10 Minutes"** — tutorial-style, walks through the claim → onboard → launch flow.
6. **"Free Website Options for Small Businesses — What's the Catch?"** — targets "free website" searchers, positions scratch-to-win as genuine free option.
7. **"The Best Website Layout for [Service Businesses / Restaurants / Attorneys]"** — series, each linking to relevant templates.
8. **"Do I Need a Website If I Have Instagram?"** — awareness-stage content for solopreneurs.

---

## Step 3 — CTA Placement Plan

**Primary CTA message:**
> "Get a professionally designed website without paying agency prices"

**Secondary CTA:** Browse listings → `/` or `/pricing` (if created)

### Placement recommendations:

| Location | CTA Type | Implementation |
|---|---|---|
| **Homepage hero** | Already exists | Update subtitle copy to include "without agency prices" messaging |
| **Template detail pages** (sidebar) | **New — sticky CTA bar** | Below the action panel: "Still looking? Browse all 48 templates →" |
| **Template detail pages** (below preview) | **New — value prop banner** | "Professional design. No agency. $99/mo. Yours in 10 minutes." |
| **Homepage FAQ section** | **New — inline CTA** | After FAQ: "Ready to claim your site?" button |
| **Scratch page** | **Enhance existing** | Add "Or browse all templates →" below ticket area |
| **Blog articles** (future) | **In-content CTA** | Mid-article and end-of-article CTAs linking to relevant template categories |
| **404 page** (if exists) | **Recovery CTA** | "This page doesn't exist — but your future website could. Browse templates →" |
| **Footer** (all pages) | **New — persistent CTA** | Slim banner: "48 ready-made websites. From $29. Browse now →" |

### CTA priority for implementation:
1. Template detail page value prop banner (highest impact — visitors are already interested)
2. Footer persistent CTA (site-wide visibility)
3. Homepage hero copy update (low effort)
4. Scratch page cross-link

---

## Step 4 — Technical SEO Quick Wins

These require no new content pages:

1. **Add `generateMetadata` to `/sites/[slug]`** — unique title/description per template
2. **Create `app/sitemap.ts`** — auto-generate from template list
3. **Create `app/robots.ts`** — allow crawling, point to sitemap
4. **Add JSON-LD Product schema** to template detail pages
5. **Add OG image tags** — use template thumbnails

---

## Summary

| Metric | Value |
|---|---|
| Content pages with SEO potential | 4 routes (51 total pages counting 48 slugs) |
| Current page-level metadata | 0 pages (only root layout) |
| Current sitemap/robots | None |
| Recommended article topics | 8 |
| CTA placements identified | 7 locations |
| Technical SEO quick wins | 5 items |

**Bottom line:** The 48 template detail pages are the biggest untapped SEO asset. Each one can target a profession-specific keyword with minimal effort (metadata + copy). A blog would add top-of-funnel reach but is lower priority than fixing the existing pages' SEO basics.
