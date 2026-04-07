#!/usr/bin/env node
/**
 * generate-schemas.js
 *
 * Walks public/sites/<slug>/preview.html and produces public/sites/<slug>/schema.json
 * containing the editable fields detected in the HTML (headings, phone numbers,
 * email addresses, button/link text, image sources).
 *
 * Files that still contain only the "PASTE HTML FROM CANVA" placeholder comment
 * are skipped.
 */

const fs = require('fs');
const path = require('path');

const SITES_DIR = path.join(__dirname, '..', 'public', 'sites');
const PLACEHOLDER = 'PASTE HTML FROM CANVA';

const PHONE_RE = /(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function matchAll(html, re) {
  const out = [];
  let m;
  const r = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
  while ((m = r.exec(html)) !== null) out.push(m);
  return out;
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function toFieldId(label, prefix, idx) {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 32);
  return slug ? `${prefix}_${slug}` : `${prefix}_${idx}`;
}

function extractFields(html) {
  const fields = [];

  // Headings
  ['h1', 'h2', 'h3'].forEach((tag) => {
    matchAll(html, new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')).forEach((m, i) => {
      const text = stripTags(m[1]);
      if (text && text.length < 200) {
        fields.push({
          id: toFieldId(text, tag, i),
          type: 'text',
          label: `${tag.toUpperCase()} — ${text.slice(0, 40)}`,
          default: text,
        });
      }
    });
  });

  // Buttons
  matchAll(html, /<button\b[^>]*>([\s\S]*?)<\/button>/gi).forEach((m, i) => {
    const text = stripTags(m[1]);
    if (text) {
      fields.push({
        id: toFieldId(text, 'button', i),
        type: 'text',
        label: `Button — ${text.slice(0, 40)}`,
        default: text,
      });
    }
  });

  // Anchor (CTA) text
  matchAll(html, /<a\b[^>]*>([\s\S]*?)<\/a>/gi).forEach((m, i) => {
    const text = stripTags(m[1]);
    if (text && text.length < 60) {
      fields.push({
        id: toFieldId(text, 'link', i),
        type: 'text',
        label: `Link — ${text.slice(0, 40)}`,
        default: text,
      });
    }
  });

  // Phone numbers
  uniq((html.match(PHONE_RE) || []).map((s) => s.trim())).forEach((phone, i) => {
    fields.push({
      id: `phone_${i}`,
      type: 'tel',
      label: 'Phone',
      default: phone,
    });
  });

  // Emails
  uniq(html.match(EMAIL_RE) || []).forEach((email, i) => {
    fields.push({
      id: `email_${i}`,
      type: 'email',
      label: 'Email',
      default: email,
    });
  });

  // Images
  matchAll(html, /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi).forEach((m, i) => {
    fields.push({
      id: `image_${i}`,
      type: 'image',
      label: `Image ${i + 1}`,
      default: m[1],
    });
  });

  // De-dupe by id
  const seen = new Set();
  return fields.filter((f) => {
    if (seen.has(f.id)) return false;
    seen.add(f.id);
    return true;
  });
}

function main() {
  if (!fs.existsSync(SITES_DIR)) {
    console.error(`Sites directory not found: ${SITES_DIR}`);
    process.exit(1);
  }

  const slugs = fs.readdirSync(SITES_DIR).filter((name) => {
    return fs.statSync(path.join(SITES_DIR, name)).isDirectory();
  });

  let generated = 0;
  let skipped = 0;
  let missing = 0;

  for (const slug of slugs) {
    const htmlPath = path.join(SITES_DIR, slug, 'preview.html');
    if (!fs.existsSync(htmlPath)) {
      missing++;
      continue;
    }
    const html = fs.readFileSync(htmlPath, 'utf8');
    const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '').trim();
    if (withoutComments.length < 100 || withoutComments.includes(PLACEHOLDER)) {
      skipped++;
      continue;
    }
    const fields = extractFields(html);
    const schema = { slug, fields };
    fs.writeFileSync(
      path.join(SITES_DIR, slug, 'schema.json'),
      JSON.stringify(schema, null, 2) + '\n'
    );
    generated++;
  }

  console.log(`Schemas generated: ${generated}`);
  console.log(`Placeholder/empty (skipped): ${skipped}`);
  console.log(`Missing preview.html: ${missing}`);
  console.log(`Total site directories: ${slugs.length}`);
}

main();
