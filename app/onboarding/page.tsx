'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { getBuyerDashboard, BuyerDashboard, updateConfig, uploadLogo } from '@/lib/api';
import styles from './page.module.css';

export default function OnboardingPage() {
  return (
    <AuthGuard>
      {(session) => <OnboardingWizard accountId={session.account_id} />}
    </AuthGuard>
  );
}

function OnboardingWizard({ accountId }: { accountId: string }) {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<BuyerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1 fields
  const [siteName, setSiteName] = useState('');
  const [tagline, setTagline] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');

  // Step 2 fields
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [uploading, setUploading] = useState(false);

  // Step 3 fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBuyerDashboard(accountId)
      .then((d) => {
        if (!d.template) {
          router.replace('/');
          return;
        }
        setDashboard(d);
        setSiteName(d.site_config.site_name ?? d.template.title);
        setTagline(d.site_config.tagline ?? '');
        setWelcomeMessage(d.site_config.welcome_message ?? '');
        setLogoUrl(d.site_config.logo_url ?? '');
        setPrimaryColor(d.site_config.primary_color ?? '');
        setPhone(d.site_config.phone ?? '');
        setEmail(d.site_config.email ?? '');
        setAddress(d.site_config.address ?? '');
      })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [accountId, router]);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !dashboard) return;
    setUploading(true);
    try {
      const res = await uploadLogo(dashboard.template.slug, file);
      setLogoUrl(res.url);
    } finally {
      setUploading(false);
    }
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!dashboard) return;
    setSaving(true);
    try {
      const config: Record<string, string> = {
        site_name: siteName,
        tagline,
        welcome_message: welcomeMessage,
        primary_color: primaryColor,
        phone,
        email,
        address,
      };
      if (logoUrl) config.logo_url = logoUrl;
      await updateConfig(dashboard.template.slug, config);
      router.push('/dashboard');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className={styles.loadingScreen}><span className={styles.spinner} /></div>;
  if (!dashboard) return null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <p className={styles.stepLabel}>Step {step} of 3</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(step / 3) * 100}%` }} />
          </div>
          <h1 className={styles.title}>
            {step === 1 && 'Set up your site identity'}
            {step === 2 && 'Add your branding'}
            {step === 3 && 'Add your contact info'}
          </h1>
        </div>

        {step === 1 && (
          <form
            className={styles.form}
            onSubmit={(e) => { e.preventDefault(); setStep(2); }}
          >
            <div className={styles.field}>
              <label className={styles.label} htmlFor="site_name">Site Name</label>
              <input
                id="site_name"
                type="text"
                className={styles.input}
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="tagline">
                Tagline <span className={styles.optional}>(optional)</span>
              </label>
              <input
                id="tagline"
                type="text"
                className={styles.input}
                value={tagline}
                maxLength={100}
                onChange={(e) => setTagline(e.target.value)}
              />
              <p className={styles.charCount}>{tagline.length}/100</p>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="welcome_message">
                Welcome Message <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="welcome_message"
                className={styles.textarea}
                value={welcomeMessage}
                maxLength={300}
                rows={4}
                onChange={(e) => setWelcomeMessage(e.target.value)}
              />
              <p className={styles.charCount}>{welcomeMessage.length}/300</p>
            </div>
            <div className={styles.actions}>
              <button type="submit" className={styles.nextBtn}>Next →</button>
            </div>
          </form>
        )}

        {step === 2 && (
          <form
            className={styles.form}
            onSubmit={(e) => { e.preventDefault(); setStep(3); }}
          >
            <div className={styles.field}>
              <label className={styles.label}>Logo <span className={styles.optional}>(optional)</span></label>
              {logoUrl && (
                <img src={logoUrl} alt="Logo preview" className={styles.logoPreview} />
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                className={styles.uploadBtn}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </button>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="primary_color">
                Primary Color <span className={styles.optional}>(optional, hex e.g. #FF6B00)</span>
              </label>
              <input
                id="primary_color"
                type="text"
                className={styles.input}
                value={primaryColor}
                placeholder="#FF6B00"
                pattern="^#[0-9A-Fa-f]{6}$"
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
              <button type="submit" className={styles.nextBtn}>Next →</button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className={styles.form} onSubmit={handleFinish}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                className={styles.input}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="contact_email">Email Address</label>
              <input
                id="contact_email"
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="address">
                Business Address <span className={styles.optional}>(optional)</span>
              </label>
              <textarea
                id="address"
                className={styles.textarea}
                value={address}
                rows={3}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
              <button type="submit" className={styles.nextBtn} disabled={saving}>
                {saving ? 'Saving…' : 'Launch My Site →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
