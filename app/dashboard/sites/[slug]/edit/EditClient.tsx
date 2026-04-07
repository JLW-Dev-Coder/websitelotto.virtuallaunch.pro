'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import styles from './page.module.css';

interface SchemaField {
  id: string;
  type: 'text' | 'image' | 'tel' | string;
  label: string;
  default: string;
}

interface SiteSchema {
  slug: string;
  fields: SchemaField[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'https://api.virtuallaunch.pro';

export default function EditClient({ slug }: { slug: string }) {
  return (
    <AuthGuard>
      {() => <EditSiteContent slug={slug} />}
    </AuthGuard>
  );
}

function EditSiteContent({ slug }: { slug: string }) {

  const [schema, setSchema] = useState<SiteSchema | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/sites/${slug}/schema.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Schema ${r.status}`);
        return r.json() as Promise<SiteSchema>;
      })
      .then((data) => {
        if (cancelled) return;
        setSchema(data);
        const initial: Record<string, string> = {};
        for (const f of data.fields) initial[f.id] = '';
        setValues(initial);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Failed to load schema');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function setField(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!schema) return;
    setSaving(true);
    setSaveState('idle');
    setSaveError('');
    try {
      // Send only fields that the user actually filled in (non-empty).
      const fields: Record<string, string> = {};
      for (const f of schema.fields) {
        const v = values[f.id];
        if (v && v.trim() !== '') fields[f.id] = v;
      }
      const res = await fetch(`${API_BASE}/v1/wlvlp/sites/${slug}/data`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields }),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      setSaveState('success');
    } catch (err: unknown) {
      setSaveState('error');
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
          <div className={styles.navLinks}>
            <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
            <Link href="/dashboard/sites" className={styles.navLinkActive}>My Sites</Link>
            <Link href="/affiliate" className={styles.navLink}>Affiliate</Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.header}>
          <Link href="/dashboard/sites" className={styles.back}>← Back to My Sites</Link>
          <h1 className={styles.title}>Edit Site</h1>
          <p className={styles.subtitle}>{slug}</p>
        </header>

        {loading && <div className={styles.state}><span className="spinner" /></div>}

        {!loading && loadError && (
          <div className={styles.errorBox}>
            <p className={styles.errorTitle}>Couldn&apos;t load template schema</p>
            <p className={styles.errorMsg}>{loadError}</p>
          </div>
        )}

        {!loading && !loadError && schema && (
          <form className={styles.form} onSubmit={handleSave}>
            {schema.fields.map((f) => (
              <FieldRow
                key={f.id}
                field={f}
                value={values[f.id] ?? ''}
                onChange={(v) => setField(f.id, v)}
              />
            ))}

            {saveState === 'success' && (
              <div className={styles.successBox}>Saved successfully.</div>
            )}
            {saveState === 'error' && (
              <div className={styles.errorBox}>
                <p className={styles.errorTitle}>Save failed</p>
                <p className={styles.errorMsg}>{saveError}</p>
              </div>
            )}

            <div className={styles.actions}>
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: SchemaField;
  value: string;
  onChange: (v: string) => void;
}) {
  const inputType =
    field.type === 'tel' ? 'tel' :
    field.type === 'image' ? 'url' :
    'text';

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={field.id}>{field.label}</label>
      <input
        id={field.id}
        type={inputType}
        className={styles.input}
        value={value}
        placeholder={field.default}
        onChange={(e) => onChange(e.target.value)}
      />
      {field.type === 'image' && (
        <p className={styles.hint}>Paste an image URL. File upload coming soon.</p>
      )}
    </div>
  );
}
