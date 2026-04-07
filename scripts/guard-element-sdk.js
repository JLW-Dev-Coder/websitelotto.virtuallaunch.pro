#!/usr/bin/env node
// Wrap window.elementSdk.init({...}) calls in `if (window.elementSdk) { ... }`
const fs = require('fs');
const path = require('path');

function process(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (text.includes('if (window.elementSdk)')) return 'already-guarded';
  if (!text.includes('window.elementSdk.init(')) return 'no-init';

  const lines = text.split('\n');
  const out = [];
  let i = 0;
  let patched = false;
  while (i < lines.length) {
    const line = lines[i];
    if (!patched && /^(await\s+)?window\.elementSdk\.init\(/.test(line.trimStart())) {
      out.push('if (window.elementSdk) {');
      out.push(line);
      // Find matching closing paren — count parens from this line forward.
      let depth = 0;
      let started = false;
      let j = i;
      let done = false;
      while (j < lines.length && !done) {
        const cur = lines[j];
        for (const ch of cur) {
          if (ch === '(') { depth++; started = true; }
          else if (ch === ')') { depth--; }
        }
        if (started && depth === 0) { done = true; break; }
        j++;
      }
      for (let k = i + 1; k <= j; k++) out.push(lines[k]);
      out.push('}');
      i = j + 1;
      patched = true;
      continue;
    }
    out.push(line);
    i++;
  }
  if (!patched) return 'no-patch';
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  return 'patched';
}

const files = fs.readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
let count = 0;
const skipped = [];
for (const f of files) {
  const r = process(f);
  if (r === 'patched') count++;
  else skipped.push(`${f}: ${r}`);
}
console.log(`Patched: ${count}`);
if (skipped.length) {
  console.log(`Skipped: ${skipped.length}`);
  for (const s of skipped) console.log('  ' + s);
}
