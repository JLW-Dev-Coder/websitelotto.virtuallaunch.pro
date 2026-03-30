'use client';
import { useState, useRef } from 'react';
import { BuyerDashboard, updateConfig, uploadLogo } from '@/lib/api';
import styles from './components.module.css';

interface Props {
  dashboard: BuyerDashboard;
  onUpdate: (d: BuyerDashboard) => void;
}

export default function EditBrand({ dashboard, onUpdate }: Props) {
  const { template, site_config } = dashboard;
  const fileRef = useRef<HTMLInputElement>(null);
  const [colors, setColors] = useState({
    background_color: site_config.background_color ?? '#ffffff',
    primary_action_color: site_config.primary_action_color ?? '#000000',
    text_color: site_config.text_color ?? '#000000',
  });
  const [logoUrl, setLogoUrl] = useState(site_config.logo_url ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadLogo(template.slug, file);
      setLogoUrl(res.url);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const config = { ...colors, logo_url: logoUrl };
      await updateConfig(template.slug, config);
      onUpdate({ ...dashboard, site_config: { ...site_config, ...config } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Edit Brand</h2>
      <form className={styles.form} onSubmit={handleSave}>
        <div className={styles.field}>
          <label className={styles.label}>Logo</label>
          {logoUrl && <img src={logoUrl} alt="Logo" className={styles.logoPreview} />}
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className={styles.fileInput} />
          <button type="button" className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload Logo'}
          </button>
        </div>
        {([
          ['background_color', 'Background Color'],
          ['primary_action_color', 'Primary Action Color'],
          ['text_color', 'Text Color'],
        ] as const).map(([key, label]) => (
          <div key={key} className={styles.field}>
            <label className={styles.label}>{label}</label>
            <div className={styles.colorRow}>
              <input type="color" value={colors[key]} onChange={e => setColors(c => ({ ...c, [key]: e.target.value }))} className={styles.colorPicker} />
              <input type="text" value={colors[key]} onChange={e => setColors(c => ({ ...c, [key]: e.target.value }))} className={styles.input} />
            </div>
          </div>
        ))}
        <button type="submit" className={styles.saveBtn} disabled={saving}>
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
