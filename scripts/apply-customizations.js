#!/usr/bin/env node
/**
 * apply-customizations.js
 *
 * Phase 2.5 — applies a site's customizations.json over its base preview.html
 * to produce a customized rendered HTML file.
 *
 * Inputs:
 *   - public/sites/<slug>/preview.html      (base template, immutable)
 *   - public/sites/<slug>/schema.json       (field defs, immutable)
 *   - customizations.json                   (fetched from R2; passed in or read locally)
 *
 * Output:
 *   - <out_dir>/<slug>/index.html           (rendered, with field values applied)
 *
 * Usage:
 *   node scripts/apply-customizations.js <slug> [customizations.json] [out_dir]
 *
 * The replacement strategy is intentionally simple for Phase 2.5: for each
 * schema field, find the field's `default` text in preview.html and replace
 * the first match with the customized value. This works because the default
 * was extracted from the same HTML when schema.json was generated. A more
 * robust DOM-based replacement is planned for a later phase.
 */

const fs = require('fs');
const path = require('path');

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function applyCustomizations({ baseHtml, schema, fields }) {
  let html = baseHtml;

  for (const field of schema.fields) {
    const value = fields[field.id];
    if (value == null || value === '') continue;
    if (!field.default) continue;

    if (field.type === 'image') {
      // Replace any occurrences of the default image URL with the new one.
      const re = new RegExp(escapeRegex(field.default), 'g');
      html = html.replace(re, escapeHtml(value));
    } else {
      // Text/tel — replace the first occurrence of the default with the new value.
      const idx = html.indexOf(field.default);
      if (idx === -1) continue;
      html =
        html.slice(0, idx) +
        escapeHtml(value) +
        html.slice(idx + field.default.length);
    }
  }

  return html;
}

function main() {
  const [, , slug, customizationsPath, outDir = 'rendered'] = process.argv;
  if (!slug) {
    console.error('usage: node scripts/apply-customizations.js <slug> [customizations.json] [out_dir]');
    process.exit(1);
  }

  const siteDir = path.join('public', 'sites', slug);
  const baseHtml = fs.readFileSync(path.join(siteDir, 'preview.html'), 'utf8');
  const schema = JSON.parse(fs.readFileSync(path.join(siteDir, 'schema.json'), 'utf8'));

  let fields = {};
  if (customizationsPath && fs.existsSync(customizationsPath)) {
    const cust = JSON.parse(fs.readFileSync(customizationsPath, 'utf8'));
    fields = cust.fields ?? {};
  }

  const rendered = applyCustomizations({ baseHtml, schema, fields });

  const outPath = path.join(outDir, slug, 'index.html');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rendered);
  console.log(`Wrote ${outPath} (${rendered.length} bytes)`);
}

if (require.main === module) main();

module.exports = { applyCustomizations };
