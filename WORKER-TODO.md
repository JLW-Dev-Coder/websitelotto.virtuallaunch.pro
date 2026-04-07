# VLP Worker — Pending WLVLP Endpoints

These endpoints are consumed by the WLVLP frontend but not yet implemented in
the VLP Worker (`virtuallaunch.pro` repo). Add them server-side, then this
file can be removed.

## GET /v1/wlvlp/sites/by-account/{account_id}

**Purpose:** Powers the buyer "My Sites" dashboard at `/dashboard/sites`.

**Auth:** Required. Caller's `vlp_session` cookie must resolve to an
`account_id` matching the path param (or be an admin).

**Implementation:**
- Query D1: `SELECT * FROM wlvlp_purchases WHERE account_id = ? ORDER BY purchased_at DESC`
- Join with template metadata (title, category) where available.
- Compute `hosting_status`:
  - `active` if `hosting_expires_at > now()`
  - `expired` if `hosting_expires_at <= now()`
  - `pending` if no `hosting_expires_at` set yet (post-checkout, pre-provision)

**Response:** `PurchasedSite[]`
```ts
interface PurchasedSite {
  slug: string;
  title: string;
  category?: string;
  purchased_at: string;       // ISO 8601
  hosting_status: 'active' | 'expired' | 'pending';
  hosting_expires_at?: string; // ISO 8601
  site_url: string;            // e.g. https://{slug}.websitelotto.virtuallaunch.pro
}
```

**Frontend caller:** `getMySites()` in `lib/api.ts`.

**No PII:** Do not include email, payment info, or any other buyer PII in this
response.
