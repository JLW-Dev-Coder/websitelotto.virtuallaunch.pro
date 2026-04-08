'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import styles from './page.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.virtuallaunch.pro';

type Row = Record<string, string>;

function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cur.push(field);
        field = '';
      } else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        cur.push(field);
        field = '';
        if (cur.some((c) => c.length > 0)) rows.push(cur);
        cur = [];
      } else {
        field += ch;
      }
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field);
    if (cur.some((c) => c.length > 0)) rows.push(cur);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const obj: Row = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
}

function UploadView() {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setPreviewCount(null);
    setMessage(null);
    if (!f) return;
    setParsing(true);
    try {
      const text = await f.text();
      const rows = parseCsv(text);
      setPreviewCount(rows.length);
      setMessage({ kind: 'info', text: `Parsed ${rows.length} prospect rows. Click Upload to send to the Worker.` });
    } catch (err) {
      setMessage({ kind: 'error', text: `Failed to parse CSV: ${(err as Error).message}` });
    } finally {
      setParsing(false);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const text = await file.text();
      const prospects = parseCsv(text);
      if (prospects.length === 0) {
        setMessage({ kind: 'error', text: 'CSV contained no rows.' });
        setUploading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/v1/wlvlp/admin/upload-prospects`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospects }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`${res.status}: ${errText}`);
      }
      const data = (await res.json().catch(() => ({}))) as { count?: number };
      const count = data.count ?? prospects.length;
      setMessage({ kind: 'success', text: `Uploaded ${count} prospects. The Worker cron will pick them up on the next run.` });
      setFile(null);
      setPreviewCount(null);
    } catch (err) {
      setMessage({ kind: 'error', text: `Upload failed: ${(err as Error).message}` });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
        </div>
      </nav>
      <main className={styles.main}>
        <h1 className={styles.title}>Admin — Upload Prospects</h1>
        <p className={styles.desc}>
          Upload the FOIA CSV. The Worker cron handles slug generation, asset page creation,
          email queueing, and sending automatically — no manual batch generation required.
        </p>

        <div className={styles.card}>
          <label className={styles.fileLabel}>
            <span>Choose CSV file</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={parsing || uploading}
              className={styles.fileInput}
            />
          </label>

          {file && (
            <div className={styles.fileInfo}>
              <strong>{file.name}</strong> — {(file.size / 1024).toFixed(1)} KB
              {previewCount !== null && <span> — {previewCount} rows</span>}
            </div>
          )}

          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || parsing || uploading || previewCount === null || previewCount === 0}
            className={styles.btn}
          >
            {uploading ? 'Uploading…' : 'Upload to Worker'}
          </button>

          {message && (
            <div className={`${styles.message} ${styles[message.kind]}`}>
              {message.text}
            </div>
          )}
        </div>

        <div className={styles.card}>
          <h2>What happens after upload</h2>
          <ol className={styles.list}>
            <li>Prospects are stored in R2 under <code>vlp-scale/wlvlp-prospects/</code></li>
            <li>Worker cron selects the next batch using SCALE.md selection logic</li>
            <li>Asset pages and Email 1 / Email 2 are generated automatically</li>
            <li>Gmail sends are queued and tracked by the Worker</li>
          </ol>
        </div>
      </main>
    </div>
  );
}

export default function AdminUploadPage() {
  return <AuthGuard>{() => <UploadView />}</AuthGuard>;
}
