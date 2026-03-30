import { readdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const SITES_DIR = join(process.cwd(), 'public', 'sites');
const OUTPUT = join(process.cwd(), 'scripts', 'seed-wlvlp-templates.sql');

function toTitle(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function inferCategory(slug: string): string {
  const s = slug.toLowerCase();
  if (/dental|chiro|doctor|health|wellness|adhd|baby|dogs|bee/.test(s)) return 'health';
  if (/tax|financial|mortgage|crypto|casino/.test(s)) return 'finance';
  if (/attorney|criminal|law/.test(s)) return 'legal';
  if (/coffee|restaurant|dessert|candle|cake/.test(s)) return 'food/bev';
  if (/art|cinema|digital|anime|comic|circus|ballet/.test(s)) return 'creative';
  if (/barber|carpet|construction|demolition|clean/.test(s)) return 'services';
  return 'other';
}

const slugs = readdirSync(SITES_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const rows = slugs.map(slug => {
  const title = toTitle(slug);
  const category = inferCategory(slug);
  const pngPath = join(SITES_DIR, slug, `${slug}.png`);
  const thumbnail = existsSync(pngPath) ? `/sites/${slug}/${slug}.png` : 'NULL';
  const thumbnailVal = thumbnail === 'NULL' ? 'NULL' : `'${thumbnail}'`;
  return `INSERT OR IGNORE INTO wlvlp_templates (slug, title, category, status, vote_count, price_monthly, thumbnail_url) VALUES ('${slug}', '${title}', '${category}', 'available', 0, 99, ${thumbnailVal});`;
});

const sql = `-- Seed WLVLP templates — generated ${new Date().toISOString()}\n\n` + rows.join('\n') + '\n';
writeFileSync(OUTPUT, sql);
console.log(`Written ${rows.length} rows to ${OUTPUT}`);
