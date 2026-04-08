#!/usr/bin/env node
// WLVLP SCALE batch generator
// Usage: node scale/generate-batch.mjs scale/prospects/new-prospects.csv
//
// Reads a prospect CSV, applies SCALE selection logic, and writes:
//   1. scale/output/wlvlp-batch-{YYYY-MM-DD}.json   (R2 upload payload)
//   2. scale/output/gmail-email1-{YYYY-MM-DD}.csv   (Gmail-ready CSV)
// Then writes wlvlp_email_1_prepared_at back to the source CSV.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ---------- CSV parsing (RFC-4180, handles quoted fields + embedded commas/newlines) ----------

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  // Strip BOM
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += c;
    i++;
  }
  // Final field
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function csvEscape(value) {
  if (value == null) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function rowsToCSV(rows) {
  return rows.map(r => r.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}

// ---------- helpers ----------

const TITLE_RE = /\b(dr|mr|mrs|ms|jr|sr|ii|iii|iv|esq|cpa|ea|jd|atty|attorney)\.?\b/gi;

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(TITLE_RE, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

function isEmptyCell(v) {
  if (v == null) return true;
  const s = String(v).trim().toLowerCase();
  return s === '' || s === 'undefined' || s === 'nan' || s === 'null';
}

function normalizeCredential(profession) {
  const p = String(profession || '').toUpperCase().trim();
  if (p.includes('CPA')) return 'CPA';
  if (p === 'EA' || p.includes('ENROLLED')) return 'EA';
  if (p.includes('ATTY') || p.includes('ATTORNEY') || p === 'JD' || p.includes('LAWYER')) return 'ATTY';
  return 'Unknown';
}

const TEMPLATE_BY_CRED = {
  CPA:     { slug: 'accounting-firm-modern',   label: 'CPA' },
  EA:      { slug: 'tax-professional-clean',   label: 'EA' },
  ATTY:    { slug: 'law-firm-professional',    label: 'tax attorney' },
  Unknown: { slug: 'tax-professional-clean',   label: 'tax professional' },
};

const PRACTICE_LABEL = {
  CPA: 'tax and accounting',
  EA: 'tax',
  ATTY: 'legal and tax',
  Unknown: 'tax',
};

const CREDENTIAL_LABEL_PLURAL = {
  CPA: 'CPA',
  EA: 'EA',
  ATTY: 'tax attorney',
  Unknown: 'tax professional',
};

// ---------- main ----------

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scale/generate-batch.mjs <prospects.csv>');
  process.exit(1);
}

const absCsvPath = resolve(csvPath);
const repoRoot = resolve(dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1'), '..');
const outDir = resolve(repoRoot, 'scale', 'output');
const prospectsDir = resolve(repoRoot, 'scale', 'prospects');
mkdirSync(outDir, { recursive: true });
mkdirSync(prospectsDir, { recursive: true });

const raw = readFileSync(absCsvPath, 'utf8');
const rows = parseCSV(raw);
if (rows.length < 2) {
  console.error('CSV has no data rows.');
  process.exit(1);
}

let headers = rows[0].map(h => h.trim());
const dataRows = rows.slice(1).filter(r => r.length > 0 && r.some(c => c !== ''));

// Ensure tracking columns exist
const TRACKING_COLS = [
  'wlvlp_email_1_prepared_at',
  'wlvlp_email_2_prepared_at',
  'wlvlp_email_1_sent_at',
  'wlvlp_email_2_scheduled_for',
  'wlvlp_email_2_sent_at',
];
for (const col of TRACKING_COLS) {
  if (!headers.includes(col)) {
    headers.push(col);
    for (const r of dataRows) r.push('');
  }
}

const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

function get(row, key) {
  const i = idx[key];
  return i == null ? '' : (row[i] ?? '');
}
function setCell(row, key, value) {
  const i = idx[key];
  if (i == null) return;
  while (row.length <= i) row.push('');
  row[i] = value;
}

// Selection logic
const eligibleRaw = dataRows
  .map((row, originalIndex) => ({ row, originalIndex }))
  .filter(({ row }) => !isEmptyCell(get(row, 'email_found')))
  .filter(({ row }) => String(get(row, 'email_status')).trim().toLowerCase() !== 'invalid')
  .filter(({ row }) => isEmptyCell(get(row, 'wlvlp_email_1_prepared_at')));

// Dedup by email_found (keep first occurrence)
const seenEmails = new Set();
const deduped = [];
let dupCount = 0;
for (const item of eligibleRaw) {
  const email = String(get(item.row, 'email_found')).trim().toLowerCase();
  if (seenEmails.has(email)) { dupCount++; continue; }
  seenEmails.add(email);
  deduped.push(item);
}

// Sort by domain_clean ascending, nulls last
deduped.sort((a, b) => {
  const da = String(get(a.row, 'domain_clean') || '').trim().toLowerCase();
  const db = String(get(b.row, 'domain_clean') || '').trim().toLowerCase();
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db);
});

const selected = deduped.slice(0, 50);

// Generate batch
const usedSlugs = new Map();
function uniqueSlug(base) {
  if (!base) base = 'prospect';
  let s = base;
  let n = 1;
  while (usedSlugs.has(s)) {
    n++;
    s = `${base}-${n}`;
  }
  usedSlugs.set(s, true);
  return s;
}

const batch = [];
const gmailRows = [['email', 'first_name', 'subject', 'body']];
const nowIso = new Date().toISOString();
const today = nowIso.slice(0, 10);

for (const { row } of selected) {
  const firstRaw = get(row, 'First_NAME') || get(row, 'FIRST_NAME') || get(row, 'first_name');
  const lastRaw = get(row, 'LAST_NAME') || get(row, 'last_name');
  const First = titleCase(firstRaw).split(' ')[0] || 'Friend';
  const Last = titleCase(lastRaw);
  const cityRaw = get(row, 'BUS_ADDR_CITY') || get(row, 'city');
  const City = titleCase(cityRaw);
  const State = String(get(row, 'BUS_ST_CODE') || get(row, 'state') || '').toUpperCase().trim();
  const dbaRaw = get(row, 'DBA') || get(row, 'firm');
  const DBA = dbaRaw || `${First} ${Last}`.trim();
  const profession = get(row, 'PROFESSION') || get(row, 'credential');
  const credential = normalizeCredential(profession);
  const firmBucket = String(get(row, 'firm_bucket') || '').trim().toLowerCase() || 'local_firm';
  const email = String(get(row, 'email_found')).trim();
  const domainClean = String(get(row, 'domain_clean') || '').trim();

  const baseSlug = slugify(`${First} ${Last} ${City} ${State}`);
  const slug = uniqueSlug(baseSlug);

  const tmpl = TEMPLATE_BY_CRED[credential];
  const credLabel = tmpl.label;
  const credLabelPlural = CREDENTIAL_LABEL_PLURAL[credential];
  const practiceLabel = PRACTICE_LABEL[credential];

  let subject1, headline;
  if (firmBucket === 'solo_brand') {
    subject1 = `${First} — ${credLabelPlural}s running ${DBA} are spending zero on their web presence`;
    headline = `${First}, here is what a modern site looks like for ${DBA}`;
  } else {
    subject1 = `${First} — ${credLabelPlural}s in ${City} are upgrading their web presence`;
    headline = `${First}, your ${City} practice deserves a site this sharp`;
  }

  const subheadline = `A ready-made professional website for ${credLabelPlural} practices`;

  const body1 =
`${First},

Your clients check your website before they ever pick up the phone. Most ${credLabelPlural} sites still look like they were built ten years ago — and prospects notice.

We have 210+ ready-made professional templates built for ${practiceLabel} practices. Pick one, claim it for $249, and your new site is live in minutes. No designer, no agency, no waiting.

Here is a template I matched to your practice type — take a look, no account needed:
https://websitelotto.virtuallaunch.pro/asset/${slug}

Or try your luck with a free scratch ticket — you might win a discount or free hosting:
https://websitelotto.virtuallaunch.pro/scratch

If you want to see more options, I can walk you through the catalog — 15 minutes on Google Meet.
https://cal.com/vlp/wlvlp-discovery

--
Jamie L Williams, EA
Website Lotto
websitelotto.virtuallaunch.pro
`;

  const firmOrCityRef = firmBucket === 'solo_brand' ? DBA : `your ${City} practice`;
  const subject2 = `Quick question about your firm's website, ${First}`;
  const body2 =
`${First},

I sent you a note a few days ago about upgrading your firm's web presence. Wanted to follow up with a direct link to the template preview I put together for ${firmOrCityRef}:
https://websitelotto.virtuallaunch.pro/asset/${slug}

If committing to $249 feels like a leap, try a free scratch ticket first — some win hosting credits or template discounts:
https://websitelotto.virtuallaunch.pro/scratch

Happy to walk you through the full catalog if you want more options.
https://cal.com/vlp/wlvlp-discovery

--
Jamie L Williams, EA
Website Lotto
websitelotto.virtuallaunch.pro
`;

  const templateSlug = tmpl.slug;
  const assetPage = {
    headline,
    subheadline,
    template_preview_slug: templateSlug,
    template_preview_url: `https://websitelotto.virtuallaunch.pro/sites/${templateSlug}/preview.html`,
    practice_type: credential,
    city: City,
    state: State,
    cta_claim_url: `https://websitelotto.virtuallaunch.pro/sites/${templateSlug}`,
    cta_scratch_url: 'https://websitelotto.virtuallaunch.pro/scratch',
    cta_booking_url: 'https://cal.com/vlp/wlvlp-discovery',
  };

  batch.push({
    slug,
    email,
    name: `${First} ${Last}`.trim(),
    credential,
    city: City,
    state: State,
    firm: DBA,
    firm_bucket: firmBucket,
    domain_clean: domainClean,
    asset_page: assetPage,
    email_1: { subject: subject1, body: body1 },
    email_2: { subject: subject2, body: body2 },
  });

  gmailRows.push([email, First, subject1, body1]);

  // Mark prepared
  setCell(row, 'wlvlp_email_1_prepared_at', nowIso);
}

// Write outputs
const jsonPath = resolve(outDir, `wlvlp-batch-${today}.json`);
const csvOutPath = resolve(outDir, `gmail-email1-${today}.csv`);
writeFileSync(jsonPath, JSON.stringify(batch, null, 2) + '\n', 'utf8');
writeFileSync(csvOutPath, rowsToCSV(gmailRows), 'utf8');

// Write source CSV back with updated tracking column
const updatedRows = [headers, ...dataRows];
writeFileSync(absCsvPath, rowsToCSV(updatedRows), 'utf8');

// Summary
console.log(`Batch complete — ${batch.length} prospects`);
console.log(`Deduped: ${dupCount} duplicate emails removed`);
console.log(`Remaining eligible: ${deduped.length}`);
console.log(`Output:`);
console.log(`  scale/output/wlvlp-batch-${today}.json`);
console.log(`  scale/output/gmail-email1-${today}.csv`);
