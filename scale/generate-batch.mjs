#!/usr/bin/env node
// WLVLP SCALE batch generator
// Usage: node scale/generate-batch.mjs scale/prospects/new-prospects.csv
//
// Reads a prospect CSV, applies SCALE selection logic, crawls each prospect's
// website to build a Conversion Leak Report, and writes:
//   1. scale/output/wlvlp-batch-{YYYY-MM-DD}.json   (R2 upload payload)
//   2. scale/output/gmail-email1-{YYYY-MM-DD}.csv   (Gmail-ready CSV)
// Then writes wlvlp_email_1_prepared_at back to the source CSV.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ---------- CSV parsing (RFC-4180) ----------

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
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

const TRAFFIC_BY_CRED = { CPA: 500, EA: 300, ATTY: 400, Unknown: 300 };
const VALUE_BY_CRED   = { CPA: 2500, EA: 1500, ATTY: 3500, Unknown: 1500 };

// ---------- website crawl ----------

async function crawlSite(domainClean) {
  const fallback = {
    has_above_fold_cta: false,
    has_phone_visible: false,
    has_intake_form: false,
    form_field_count: 0,
    has_reviews_or_testimonials: false,
    has_credentials_visible: false,
    headline_text: 'Not available',
    meta_description: '',
    page_title: '',
    fetch_ok: false,
    status: 0,
    elapsed_ms: 0,
  };
  if (!domainClean) return fallback;

  const url = `https://${domainClean}`;
  const start = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 10000);
  let res, html;
  try {
    res = await fetch(url, {
      signal: ac.signal,
      redirect: 'follow',
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; WLVLP-ConversionAudit/1.0; +https://websitelotto.virtuallaunch.pro)',
        'accept': 'text/html,application/xhtml+xml',
      },
    });
    html = await res.text();
  } catch (e) {
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    console.log(`Crawling ${domainClean}... ERR ${e.name || 'fetch'} (${elapsed}ms)`);
    return { ...fallback, elapsed_ms: elapsed };
  }
  clearTimeout(timer);
  const elapsed = Date.now() - start;
  console.log(`Crawling ${domainClean}... ${res.status} (${elapsed}ms)`);

  if (!res.ok || !html) {
    return { ...fallback, fetch_ok: false, status: res.status, elapsed_ms: elapsed };
  }

  // Extract <body>...</body>; if missing, use the whole doc.
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  const first2k = body.slice(0, 2000);
  const first3k = body.slice(0, 3000);

  // Above-fold CTA: any <a>, <button>, or form button text in first 2000 chars containing action words
  const ACTION = /(book|call|schedule|consult|contact|get started|free)/i;
  const ctaCandidates = first2k.match(/<(a|button)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
  let has_above_fold_cta = false;
  for (const c of ctaCandidates) {
    const text = c.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (ACTION.test(text)) { has_above_fold_cta = true; break; }
  }

  // Phone visible
  const PHONE = /(\(\d{3}\)\s*\d{3}[-.\s]?\d{4}|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b\d{10}\b)/;
  const has_phone_visible = PHONE.test(first3k.replace(/<[^>]+>/g, ' '));

  // Forms
  const formMatches = body.match(/<form[\s\S]*?<\/form>/gi) || [];
  const has_intake_form = formMatches.length > 0;
  let form_field_count = 0;
  for (const f of formMatches) {
    const inputs = (f.match(/<input\b[^>]*>/gi) || []).filter(t => !/type=["']?(hidden|submit|button|image|reset)["']?/i.test(t));
    const textareas = f.match(/<textarea\b/gi) || [];
    const selects = f.match(/<select\b/gi) || [];
    form_field_count += inputs.length + textareas.length + selects.length;
  }

  // Reviews / testimonials
  const REVIEW_RE = /(review|testimonial|client says|stars|rating)/i;
  const has_reviews_or_testimonials = REVIEW_RE.test(body);

  // Credentials visible
  const CRED_RE = /(\bCPA\b|\bEA\b|Enrolled Agent|\bJD\b|Attorney|licensed|certified|member of)/i;
  const has_credentials_visible = CRED_RE.test(body);

  // Headline: first <h1>, fallback first <h2>
  function firstTagText(tag) {
    const m = body.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!m) return '';
    return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const headline_text = firstTagText('h1') || firstTagText('h2') || 'Not available';

  // Meta description
  const metaMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  const meta_description = metaMatch ? metaMatch[1].trim() : '';

  // Page title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const page_title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  return {
    has_above_fold_cta,
    has_phone_visible,
    has_intake_form,
    form_field_count,
    has_reviews_or_testimonials,
    has_credentials_visible,
    headline_text,
    meta_description,
    page_title,
    fetch_ok: true,
    status: res.status,
    elapsed_ms: elapsed,
  };
}

// ---------- conversion leak report ----------

function isGenericHeadline(h) {
  if (!h || h === 'Not available') return true;
  const s = h.toLowerCase();
  const hasTax = /\btax\b/.test(s);
  const hasGeneric = /(services?|help|solutions?)/.test(s);
  // No specifics: no city, no number, no outcome keyword
  const hasSpecific = /(\$|\d|irs|penalt|audit|refund|resolv|reduc|save|recover|file|return)/i.test(s);
  return hasTax && hasGeneric && !hasSpecific;
}

function calculateScore(c) {
  let score = 100;
  if (!c.has_above_fold_cta) score -= 25;
  if (!c.has_intake_form) score -= 15;
  if (c.form_field_count > 6) score -= 10;
  if (!c.has_reviews_or_testimonials) score -= 15;
  if (!c.has_credentials_visible) score -= 10;
  if (isGenericHeadline(c.headline_text)) score -= 15;
  if (!c.has_phone_visible) score -= 10;
  return Math.max(10, score);
}

function identifyLeaks(c) {
  const leaks = [];
  if (!c.has_above_fold_cta) {
    leaks.push({
      title: 'No above-the-fold call to action',
      description: 'Visitors land and scroll without a clear next step. High-intent traffic should see a booking or consult CTA immediately.',
    });
  }
  if (!c.has_intake_form || c.form_field_count > 6) {
    leaks.push({
      title: 'Intake path creates friction',
      description: 'Long or vague forms cause drop-off. A shorter, clearer path captures more qualified leads without looking cheap.',
    });
  }
  if (isGenericHeadline(c.headline_text)) {
    leaks.push({
      title: 'Weak first-impression positioning',
      description: 'If the headline does not state who you help and what outcome you create, visitors hesitate. That hesitation becomes lost calls.',
    });
  }
  if (!c.has_reviews_or_testimonials || !c.has_credentials_visible) {
    leaks.push({
      title: 'Trust signals underperforming',
      description: 'Credentials, reviews, and results are not doing enough work. Strong visual trust markers turn uncertain visitors into booked consultations.',
    });
  }
  return leaks;
}

function estimateConversionRate(score) {
  if (score >= 70) return 2.8;
  if (score >= 40) return 1.8;
  return 1.2;
}

function upgradedHeadlineFor(credential) {
  switch (credential) {
    case 'EA':   return 'Resolve IRS issues faster — without the back-and-forth.';
    case 'CPA':  return 'Tax strategy that saves you money — not just files your return.';
    case 'ATTY': return 'Tax disputes resolved. Penalties reduced. Your case, handled.';
    default:     return 'Stop losing clients to a website that does not convert.';
  }
}

function upgradedDescriptionFor(prospect) {
  const { credential, City } = prospect;
  const where = City ? ` in ${City}` : '';
  switch (credential) {
    case 'EA':   return `Enrolled agent representation${where}. Free 15-minute consult — see if we can help before you commit.`;
    case 'CPA':  return `Tax planning and accounting${where} for owner-operators who want their numbers working harder.`;
    case 'ATTY': return `Tax controversy and IRS defense${where}. Confidential consultation, clear next steps.`;
    default:     return `Book a free consultation${where} and find out exactly what is costing you clients.`;
  }
}

function buildLeakReport(prospect, crawl) {
  const score = calculateScore(crawl);
  const leaks = identifyLeaks(crawl);
  const credential = prospect.credential;
  const visitors_month = TRAFFIC_BY_CRED[credential] || 300;
  const avg_client_value = VALUE_BY_CRED[credential] || 1500;
  const current_rate = estimateConversionRate(score);

  const current_problems = [];
  if (isGenericHeadline(crawl.headline_text)) current_problems.push('Generic headline');
  if (!crawl.has_above_fold_cta) current_problems.push('Weak CTA');
  if (!crawl.has_intake_form || crawl.form_field_count > 6) current_problems.push('Friction-heavy intake');
  if (!crawl.has_reviews_or_testimonials) current_problems.push('No social proof');
  if (current_problems.length === 0) current_problems.push('Generic headline', 'Weak CTA');

  return {
    score,
    leaks,
    metrics: {
      visitors_month,
      current_rate,
      optimized_rate: 3.6,
      avg_client_value,
      close_rate: 40,
    },
    before_after: {
      current_headline: crawl.headline_text || 'Generic tax services headline',
      current_problems,
      upgraded_headline: upgradedHeadlineFor(credential),
      upgraded_description: upgradedDescriptionFor(prospect),
      upgraded_chips: ['Book a consultation', 'See services'],
    },
    crawl_meta: {
      fetched: crawl.fetch_ok,
      status: crawl.status,
      elapsed_ms: crawl.elapsed_ms,
      page_title: crawl.page_title,
      meta_description: crawl.meta_description,
    },
  };
}

// Lead/revenue math derived from leak report
function deriveLeadEconomics(report) {
  const { visitors_month, current_rate, optimized_rate, avg_client_value, close_rate } = report.metrics;
  const currentLeads = visitors_month * (current_rate / 100);
  const optimizedLeads = visitors_month * (optimized_rate / 100);
  const lostLeads = Math.max(0, optimizedLeads - currentLeads);
  const lostLeadsMonth = Math.round(lostLeads);
  const lostClientsYear = lostLeads * 12 * (close_rate / 100);
  const revenueLostYear = Math.round(lostClientsYear * avg_client_value);
  return { lost_leads_month: lostLeadsMonth, revenue_lost_year: revenueLostYear };
}

function formatMoney(n) {
  if (n >= 1000) {
    const k = n / 1000;
    return `$${k.toFixed(k < 10 ? 1 : 0).replace(/\.0$/, '')}k`;
  }
  return `$${n}`;
}

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

// Selection
const eligibleRaw = dataRows
  .map((row, originalIndex) => ({ row, originalIndex }))
  .filter(({ row }) => !isEmptyCell(get(row, 'email_found')))
  .filter(({ row }) => String(get(row, 'email_status')).trim().toLowerCase() !== 'invalid')
  .filter(({ row }) => isEmptyCell(get(row, 'wlvlp_email_1_prepared_at')));

const seenEmails = new Set();
const deduped = [];
let dupCount = 0;
for (const item of eligibleRaw) {
  const email = String(get(item.row, 'email_found')).trim().toLowerCase();
  if (seenEmails.has(email)) { dupCount++; continue; }
  seenEmails.add(email);
  deduped.push(item);
}

deduped.sort((a, b) => {
  const da = String(get(a.row, 'domain_clean') || '').trim().toLowerCase();
  const db = String(get(b.row, 'domain_clean') || '').trim().toLowerCase();
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db);
});

const selected = deduped.slice(0, 50);

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

let crawlOk = 0;
let crawlFail = 0;
const scoreList = [];

for (let s = 0; s < selected.length; s++) {
  const { row } = selected[s];
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

  // Crawl with rate limiting
  const crawl = await crawlSite(domainClean);
  if (crawl.fetch_ok) crawlOk++; else crawlFail++;
  if (s < selected.length - 1) {
    await new Promise(r => setTimeout(r, 2000));
  }

  const prospectCtx = { credential, City };
  const report = buildLeakReport(prospectCtx, crawl);
  scoreList.push(report.score);
  const econ = deriveLeadEconomics(report);
  const lostLeadsMonth = econ.lost_leads_month;
  const revenueLostYear = econ.revenue_lost_year;
  const revenueLostStr = formatMoney(revenueLostYear);
  const leakCount = report.leaks.length;

  const tmpl = TEMPLATE_BY_CRED[credential];
  const credLabelPlural = CREDENTIAL_LABEL_PLURAL[credential];

  // Subjects (updated to reference score)
  let subject1;
  if (firmBucket === 'solo_brand') {
    subject1 = `${First} — ${DBA} site scored ${report.score}/100 on conversion`;
  } else {
    subject1 = `${First} — your ${City || 'local'} practice site scored ${report.score}/100 on conversion`;
  }

  const headline = `${First}, your website may be losing ${lostLeadsMonth}+ leads every month`;
  const subheadline = `Based on your current site structure, CTA placement, and intake flow, this report estimates how many potential clients leave before they book, call, or submit a form.`;

  const firmOrCityRef = firmBucket === 'solo_brand' ? DBA : `your ${City || 'local'} practice`;

  const body1 =
`${First},

Your clients check your website before they ever pick up the phone. Based on a quick look at ${domainClean || 'your site'}, your site may be leaving ${lostLeadsMonth}+ leads on the table every month — that is roughly ${revenueLostStr}/year in unrealized revenue.

I put together a free Conversion Leak Report for ${firmOrCityRef} that breaks down exactly where the drop-off is happening and what a fix looks like.

Take a look — no account needed:
https://websitelotto.virtuallaunch.pro/asset/${slug}

If any of this resonates, I can walk you through the numbers — 15 minutes on Google Meet.
https://cal.com/vlp/wlvlp-discovery

--
Jamie L Williams, EA
Website Lotto
websitelotto.virtuallaunch.pro
`;

  const subject2 = `${First} — ${leakCount} conversion leaks on ${domainClean || 'your site'}, ${revenueLostStr}/yr at stake`;
  const body2 =
`${First},

I sent you a note a few days ago with a Conversion Leak Report for ${firmOrCityRef}. Your site scored ${report.score}/100 — the report breaks down ${leakCount} specific issues costing an estimated ${revenueLostStr}/year.

Here is the direct link:
https://websitelotto.virtuallaunch.pro/asset/${slug}

The report includes a before/after of your homepage copy and an interactive calculator so you can adjust the numbers yourself.

Happy to walk through it live if you want.
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
    firm: DBA,
    conversion_leak_report: report,
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
  setCell(row, 'wlvlp_email_1_prepared_at', nowIso);
}

const jsonPath = resolve(outDir, `wlvlp-batch-${today}.json`);
const csvOutPath = resolve(outDir, `gmail-email1-${today}.csv`);
writeFileSync(jsonPath, JSON.stringify(batch, null, 2) + '\n', 'utf8');
writeFileSync(csvOutPath, rowsToCSV(gmailRows), 'utf8');

const updatedRows = [headers, ...dataRows];
writeFileSync(absCsvPath, rowsToCSV(updatedRows), 'utf8');

const min = scoreList.length ? Math.min(...scoreList) : 0;
const max = scoreList.length ? Math.max(...scoreList) : 0;
const avg = scoreList.length ? (scoreList.reduce((a, b) => a + b, 0) / scoreList.length).toFixed(1) : 0;

console.log(`\nBatch complete — ${batch.length} prospects`);
console.log(`Deduped: ${dupCount} duplicate emails removed`);
console.log(`Crawls: ${crawlOk} ok / ${crawlFail} fail`);
console.log(`Score: min=${min} max=${max} avg=${avg}`);
console.log(`Output:`);
console.log(`  scale/output/wlvlp-batch-${today}.json`);
console.log(`  scale/output/gmail-email1-${today}.csv`);
