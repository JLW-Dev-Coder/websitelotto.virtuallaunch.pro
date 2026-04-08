#!/usr/bin/env node
/**
 * bulk-register.mjs
 *
 * Scans public/sites/ for new template directories not yet present in
 * wlvlp-catalog.json. For each new site, derives a title from the
 * preview.html <title> tag, auto-detects a category from slug keywords,
 * and appends a catalog entry. Then runs scripts/generate-schemas.js to
 * produce schema.json files for any sites missing them.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');
const SITES_DIR = path.join(ROOT, 'public', 'sites');
const CATALOG_PATH = path.join(ROOT, 'wlvlp-catalog.json');

function detectCategory(slug) {
  const s = slug.toLowerCase();
  if (s.includes('tax')) return 'Tax Services';
  if (s.includes('accounting') || s.includes('bookkeeping') || s.includes('cpa')) return 'Accounting';
  if (s.includes('law') || s.includes('attorney') || s.includes('legal')) return 'Legal';
  if (s.includes('real-estate')) return 'Real Estate';
  return 'Professional Services';
}

function slugToTitle(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function extractTitle(html, slug) {
  const m = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (m) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return slugToTitle(slug);
}

function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Catalog not found: ${CATALOG_PATH}`);
    process.exit(1);
  }
  if (!fs.existsSync(SITES_DIR)) {
    console.error(`Sites directory not found: ${SITES_DIR}`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
  const existingSlugs = new Set((catalog.sites || []).map((s) => s.slug));

  const dirs = fs
    .readdirSync(SITES_DIR)
    .filter((name) => fs.statSync(path.join(SITES_DIR, name)).isDirectory());

  let alreadyInCatalog = 0;
  const newEntries = [];

  for (const slug of dirs) {
    const htmlPath = path.join(SITES_DIR, slug, 'preview.html');
    if (!fs.existsSync(htmlPath)) continue;
    const stat = fs.statSync(htmlPath);
    if (stat.size <= 100) continue;

    if (existingSlugs.has(slug)) {
      alreadyInCatalog++;
      continue;
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    const title = extractTitle(html, slug);
    const category = detectCategory(slug);

    const entry = {
      slug,
      title,
      categories: [category],
      status: 'available',
      price: 249,
    };
    newEntries.push(entry);
  }

  if (newEntries.length > 0) {
    catalog.sites = [...(catalog.sites || []), ...newEntries];
    catalog.total_sites = catalog.sites.length;
    catalog.generated = new Date().toISOString();
    fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n');
  }

  // Run schema generation for any sites missing schema.json
  let schemasGenerated = 0;
  const needsSchemas = dirs.some((slug) => {
    const htmlPath = path.join(SITES_DIR, slug, 'preview.html');
    const schemaPath = path.join(SITES_DIR, slug, 'schema.json');
    return fs.existsSync(htmlPath) && !fs.existsSync(schemaPath);
  });

  if (needsSchemas) {
    const out = execSync('node scripts/generate-schemas.js', {
      cwd: ROOT,
      encoding: 'utf8',
    });
    const m = out.match(/Schemas generated:\s*(\d+)/);
    if (m) schemasGenerated = parseInt(m[1], 10);
  }

  console.log(`Scanned: ${dirs.length} site directories`);
  console.log(`Already in catalog: ${alreadyInCatalog}`);
  console.log(`New sites added: ${newEntries.length}`);
  for (const e of newEntries) {
    console.log(`  - ${e.slug} → "${e.title}" [${e.categories[0]}]`);
  }
  console.log(`Schemas generated: ${schemasGenerated}`);
  console.log(
    newEntries.length > 0
      ? `Catalog updated: wlvlp-catalog.json`
      : `Catalog unchanged: wlvlp-catalog.json`
  );
}

main();
