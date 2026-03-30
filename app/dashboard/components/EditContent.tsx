'use client';
import { useState } from 'react';
import { BuyerDashboard, updateConfig } from '@/lib/api';
import styles from './components.module.css';

interface Props {
  dashboard: BuyerDashboard;
  onUpdate: (d: BuyerDashboard) => void;
}

export default function EditContent({ dashboard, onUpdate }: Props) {
  const { template, site_config } = dashboard;
  const [form, setForm] = useState({
    brand_name: site_config.brand_name ?? '',
    tagline: site_config.tagline ?? '',
    hero_title: site_config.hero_title ?? '',
    hero_subtitle: site_config.hero_subtitle ?? '',
    cta_text: site_config.cta_text ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateConfig(template.slug, form);
      onUpdate({ ...dashboard, site_config: { ...site_config, ...form } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Edit Content</h2>
      <form className={styles.form} onSubmit={handleSave}>
        {([
          ['brand_name', 'Brand Name'],
          ['tagline', 'Tagline'],
          ['hero_title', 'Hero Title'],
          ['hero_subtitle', 'Hero Subtitle'],
          ['cta_text', 'CTA Button Text'],
        ] as const).map(([key, label]) => (
          <div key={key} className={styles.field}>
            <label className={styles.label}>{label}</label>
            <input
              className={styles.input}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <button type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
