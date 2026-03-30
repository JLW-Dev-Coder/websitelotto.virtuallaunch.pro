'use client';
import { useState } from 'react';
import { BuyerDashboard, updateConfig } from '@/lib/api';
import styles from './components.module.css';

interface Props {
  dashboard: BuyerDashboard;
  onUpdate: (d: BuyerDashboard) => void;
}

export default function EditContact({ dashboard, onUpdate }: Props) {
  const { template, site_config } = dashboard;
  const [form, setForm] = useState({
    phone: site_config.phone ?? '',
    email: site_config.email ?? '',
    address: site_config.address ?? '',
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
      <h2 className={styles.panelTitle}>Edit Contact</h2>
      <form className={styles.form} onSubmit={handleSave}>
        {([
          ['phone', 'Phone Number'],
          ['email', 'Email Address'],
          ['address', 'Business Address'],
        ] as const).map(([key, label]) => (
          <div key={key} className={styles.field}>
            <label className={styles.label}>{label}</label>
            <input
              className={styles.input}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
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
