# WORKER TODO — WLVLP Site Editor (Phase 2)

This work belongs in the **VLP Worker** repo (`virtuallaunch.pro`), not in this
WLVLP frontend repo. The WLVLP editor at
`/dashboard/sites/[slug]/edit` calls the endpoint described below.

## Endpoint

`PATCH /v1/wlvlp/sites/:slug/data`

### Auth
- Requires a valid `vlp_session` cookie.
- Verify the authenticated `account_id` actually owns this site by checking
  the `wlvlp_purchases` table for a row matching `(account_id, slug)`.
- If no purchase row → return `403 { error: "not_owner" }`.
- If no session → return `401 { error: "unauthorized" }`.

### Request body
```json
{
  "fields": {
    "<field_id>": "<string value>",
    "...": "..."
  }
}
```

`field_id` values must match IDs from the corresponding
`public/sites/<slug>/schema.json` shipped by the WLVLP frontend. The Worker
should treat unknown field IDs as a no-op (ignore, do not error) so a
schema/version mismatch never blocks a save.

### Storage
Write/merge the customizations to R2:

```
Bucket: <wlvlp R2 bucket>
Key:    wlvlp/sites/<slug>/customizations.json
Body:   {
  "slug": "<slug>",
  "account_id": "<owner account_id>",
  "updated_at": "<ISO timestamp>",
  "fields": { ... merged fields ... }
}
```

Strategy: read existing object (if any), shallow-merge `fields` from the
request over the existing fields, then write the new object back.

### Response
```json
{ "ok": true }
```

On error:
```json
{ "ok": false, "error": "<message>" }
```

## Notes / follow-ups
- Phase 2.5 will add the actual HTML rendering step that applies
  `customizations.json` over `preview.html`. See
  `scripts/apply-customizations.js` in the WLVLP repo for the planned
  merge logic — the Worker (or a build hook) will likely run an
  equivalent server-side step.
- Image fields currently accept URLs only. A future task will add a
  Worker-side upload endpoint and reuse `POST /v1/wlvlp/upload-logo` or a
  new `/v1/wlvlp/sites/:slug/upload` route.
