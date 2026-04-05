# STYLE — Website Lotto (WLVLP)
**Last updated:** 2026-04-04

---

## Stack

- **CSS approach:** CSS Modules (`.module.css` per page/component)
- **Global tokens:** `app/globals.css`
- **What is NOT used:** Tailwind, inline styles, global class selectors

---

## Design Tokens (from globals.css)

### Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--void` | `#07070A` | Deepest background |
| `--charcoal` | `#12121A` | Secondary background |
| `--neon-blue` | `#00D4FF` | Primary accent, CTAs |
| `--neon-yellow` | `#FFE534` | Secondary accent, highlights |
| `--neon-magenta` | `#FF2D8A` | Tertiary accent, alerts |
| `--neon-cyan` | `#00F0D0` | Success states |
| `--text` | `#ffffff` | Primary text |
| `--text-muted` | `#888888` | Secondary text |
| `--glass` | `rgba(255,255,255,0.04)` | Glass-morphism background |
| `--glass-border` | `rgba(255,255,255,0.08)` | Glass-morphism border |

### Typography
| Property | Value |
|----------|-------|
| Heading font | `'Sora', sans-serif` (weights: 400, 600, 700, 800) |
| Body font | `'DM Sans', sans-serif` (weights: 400, 500, 600) |

### Background
```css
background: linear-gradient(180deg, #07070A 0%, #0D0D15 40%, #12121A 100%);
```

---

## Layout Patterns

- Dark theme throughout — neon accents on dark void/charcoal backgrounds
- Glass-morphism cards: `background: var(--glass); border: 1px solid var(--glass-border);`
- Body uses full-height gradient background

---

## Existing CSS Modules

| File | Page |
|------|------|
| `app/page.module.css` | Marketplace gallery (home) |
| `app/sites/[slug]/page.module.css` | Template detail |
| `app/sign-in/page.module.css` | Auth page |
| `app/scratch/page.module.css` | Scratch-to-win |
| `app/dashboard/page.module.css` | Buyer dashboard |
| `app/dashboard/components/components.module.css` | Dashboard sub-components |
| `app/affiliate/page.module.css` | Affiliate dashboard |
| `app/onboarding/page.module.css` | Onboarding flow |
| `app/success/page.module.css` | Post-payment success |
| `app/support/page.module.css` | Support page |

---

## Existing Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AuthGuard | `components/AuthGuard.tsx` | Wraps authenticated pages, redirects if no session |

---

## Self-Check (before delivering any styled page)

- [ ] Uses CSS Modules (`.module.css`), not inline styles or Tailwind
- [ ] Colors reference `var(--token)` from globals.css
- [ ] Fonts are Sora (headings) or DM Sans (body)
- [ ] Dark theme maintained — no white/light backgrounds
- [ ] Glass-morphism pattern used for cards/panels
- [ ] Loading states use the `.spinner` class from globals.css
