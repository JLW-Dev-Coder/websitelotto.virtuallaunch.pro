'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  getAssetPage,
  submitSiteRequest,
  getSiteRequestStatus,
  getCustomSiteUrl,
  type AssetPageData,
  type ConversionLeakReport,
} from '@/lib/api';
import styles from './page.module.css';

interface Props {
  initialSlug: string;
}

export default function AssetClient({ initialSlug }: Props) {
  const [slug, setSlug] = useState(initialSlug);
  const [data, setData] = useState<AssetPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let realSlug = initialSlug;
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('asset');
      if (idx !== -1 && parts[idx + 1]) {
        realSlug = parts[idx + 1];
      }
    }
    setSlug(realSlug);

    let cancelled = false;
    (async () => {
      const result = await getAssetPage(realSlug);
      if (cancelled) return;
      if (!result) {
        setNotFound(true);
      } else {
        setData(result);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialSlug]);

  if (loading) {
    return (
      <div className={styles.loadingScreen}>
        <span className="spinner" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerInner}>
            <Link href="/" className={styles.logo}>Website Lotto</Link>
          </div>
        </header>
        <main className={styles.fallbackMain}>
          <h1 className={styles.fallbackTitle}>This preview isn&apos;t available</h1>
          <p className={styles.fallbackDesc}>
            The personalized template preview for <strong>{slug}</strong> couldn&apos;t be loaded.
            Browse our full catalog of 210+ ready-made templates instead.
          </p>
          <div className={styles.fallbackActions}>
            <Link href="/" className={styles.primaryCta}>Browse the Marketplace</Link>
            <Link href="/scratch" className={styles.scratchCta}>Try a Free Scratch Ticket</Link>
          </div>
        </main>
        <footer className={styles.footer}>
          <p>© Website Lotto · websitelotto.virtuallaunch.pro</p>
        </footer>
      </div>
    );
  }

  if (data.conversion_leak_report) {
    return <LeakReport data={data} report={data.conversion_leak_report} slug={slug} />;
  }

  // Fallback: original template-preview layout
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.logo}>Website Lotto</Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.headline}>{data.headline}</h1>
          <p className={styles.subheadline}>{data.subheadline}</p>
          <div className={styles.heroCtas}>
            <a href={data.cta_claim_url} className={styles.primaryCta}>
              Claim This Template — $249
            </a>
            <a href={data.cta_scratch_url} className={styles.scratchCta}>
              Try a Free Scratch Ticket
            </a>
          </div>
        </section>

        <section className={styles.previewSection}>
          <div className={styles.previewFrame}>
            <iframe
              src={data.template_preview_url}
              className={styles.iframe}
              title="Template preview"
              loading="lazy"
            />
          </div>
          <p className={styles.previewCaption}>
            This is one of 210+ ready-made templates. Yours to claim and customize.
          </p>
        </section>

        <section className={styles.valueProps}>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>Live in minutes</h3>
            <p className={styles.valueDesc}>
              No design skills needed. Claim it and the template is yours to customize.
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>$249 one-time</h3>
            <p className={styles.valueDesc}>
              No monthly fees for the template. Hosting starts at $14/mo after year one.
            </p>
          </div>
          <div className={styles.valueCard}>
            <h3 className={styles.valueTitle}>Built for tax pros</h3>
            <p className={styles.valueDesc}>
              Templates designed for {data.practice_type} practices like yours.
            </p>
          </div>
        </section>

        <section className={styles.howItWorks}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <ol className={styles.steps}>
            <li>Browse or claim the template above.</li>
            <li>Customize with your firm name, logo, and contact info.</li>
            <li>Go live — hosting starts at $14/mo after year one.</li>
          </ol>
        </section>

        <section className={styles.scratchSection}>
          <h2 className={styles.sectionTitle}>Not ready to commit?</h2>
          <p className={styles.scratchDesc}>
            Try a free scratch ticket — you might win a discount or free hosting.
          </p>
          <a href={data.cta_scratch_url} className={styles.scratchCta}>
            Get a Free Scratch Ticket
          </a>
        </section>

        <section className={styles.bookingSection}>
          <h2 className={styles.sectionTitle}>Want to see more options?</h2>
          <p className={styles.bookingDesc}>
            Book a 15-minute walkthrough and I&apos;ll show you the full catalog.
          </p>
          <a href={data.cta_booking_url} className={styles.bookingCta}>
            Book a Call
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          © Website Lotto ·{' '}
          <Link href="/" className={styles.footerLink}>websitelotto.virtuallaunch.pro</Link>
        </p>
      </footer>
    </div>
  );
}

function formatMoney(n: number): string {
  if (!isFinite(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('en-US');
}

function formatInt(n: number): string {
  if (!isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-US');
}

function scoreColor(score: number): string {
  if (score >= 70) return '#00F0D0';
  if (score >= 40) return '#FFE534';
  return '#FF2D8A';
}

interface LeakReportProps {
  data: AssetPageData;
  report: ConversionLeakReport;
  slug: string;
}

function LeakReport({ data, report, slug }: LeakReportProps) {
  const firm = data.firm ?? data.practice_type ?? 'your firm';
  const [visitors, setVisitors] = useState(report.metrics.visitors_month);
  const [currentRate, setCurrentRate] = useState(report.metrics.current_rate);
  const [avgValue, setAvgValue] = useState(report.metrics.avg_client_value);
  const [closeRate, setCloseRate] = useState(report.metrics.close_rate);

  const optimizedRate = report.metrics.optimized_rate ?? 3.6;

  const calc = useMemo(() => {
    const leadsCaptured = (visitors * currentRate) / 100;
    const leadsOptimized = (visitors * optimizedRate) / 100;
    const leadsLost = Math.max(0, leadsOptimized - leadsCaptured);
    const revenueLostMonth = leadsLost * (closeRate / 100) * avgValue;
    const revenueLostYear = revenueLostMonth * 12;
    const recoveryEstimate = leadsOptimized * (closeRate / 100) * avgValue * 12;
    return { leadsCaptured, leadsLost, revenueLostMonth, revenueLostYear, recoveryEstimate };
  }, [visitors, currentRate, optimizedRate, avgValue, closeRate]);

  const color = scoreColor(report.score);
  const circumference = 2 * Math.PI * 54;
  const progress = (report.score / 100) * circumference;

  return (
    <div className={styles.reportPage}>
      <header className={styles.reportHeader}>
        <div className={styles.reportHeaderInner}>
          <div className={styles.brand}>Conversion Leak Report</div>
          <span className={styles.badge}>Tax professionals</span>
        </div>
      </header>

      <main className={styles.reportMain}>
        {/* Hero */}
        <section className={styles.reportHero}>
          <div className={styles.eyebrow}>
            Prepared for {firm} — {data.city}, {data.state}
          </div>
          <h1 className={styles.reportTitle}>{data.headline}</h1>
          <p className={styles.reportSub}>{data.subheadline}</p>
        </section>

        {/* Score ring + recovery estimate */}
        <section className={styles.scoreSection}>
          <div className={styles.scoreRingWrap}>
            <svg className={styles.scoreRing} viewBox="0 0 120 120" width="160" height="160">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`}
                transform="rotate(-90 60 60)"
              />
              <text
                x="60"
                y="66"
                textAnchor="middle"
                fontFamily="Sora, sans-serif"
                fontSize="32"
                fontWeight="800"
                fill={color}
              >
                {report.score}
              </text>
            </svg>
            <div className={styles.scoreLabel}>Conversion score</div>
          </div>
          <div className={styles.recoveryBox}>
            <div className={styles.recoveryLabel}>Estimated revenue recovery / year</div>
            <div className={styles.recoveryValue}>{formatMoney(calc.recoveryEstimate)}</div>
            <div className={styles.recoveryNote}>
              If your site converted at the {optimizedRate}% industry benchmark.
            </div>
          </div>
        </section>

        {/* Metrics grid */}
        <section className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricLabel}>Leads captured / month</div>
            <div className={styles.metricValue}>{formatInt(calc.leadsCaptured)}</div>
          </div>
          <div className={`${styles.metricCard} ${styles.metricDanger}`}>
            <div className={styles.metricLabel}>Leads lost / month</div>
            <div className={styles.metricValue}>{formatInt(calc.leadsLost)}</div>
          </div>
          <div className={`${styles.metricCard} ${styles.metricDanger}`}>
            <div className={styles.metricLabel}>Revenue lost / month</div>
            <div className={styles.metricValue}>{formatMoney(calc.revenueLostMonth)}</div>
          </div>
          <div className={`${styles.metricCard} ${styles.metricDanger}`}>
            <div className={styles.metricLabel}>Revenue lost / year</div>
            <div className={styles.metricValue}>{formatMoney(calc.revenueLostYear)}</div>
          </div>
        </section>

        {/* Leaks */}
        <section className={styles.leaksSection}>
          <h2 className={styles.sectionHeading}>Where the leaks are</h2>
          <div className={styles.leaksGrid}>
            {report.leaks.map((leak, i) => (
              <div key={i} className={styles.leakCard}>
                <div className={styles.leakIcon} aria-hidden="true">!</div>
                <div className={styles.leakBody}>
                  <h3 className={styles.leakTitle}>{leak.title}</h3>
                  <p className={styles.leakDesc}>{leak.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Before vs After */}
        <section className={styles.beforeAfterSection}>
          <h2 className={styles.sectionHeading}>Before vs After</h2>
          <div className={styles.beforeAfterGrid}>
            <div className={`${styles.baCard} ${styles.baBefore}`}>
              <div className={styles.baTag}>Current</div>
              <h3 className={styles.baHeadline}>{report.before_after.current_headline}</h3>
              <div className={styles.chipRow}>
                {report.before_after.current_problems.map((p, i) => (
                  <span key={i} className={`${styles.chip} ${styles.chipGhost}`}>{p}</span>
                ))}
              </div>
            </div>
            <div className={`${styles.baCard} ${styles.baAfter}`}>
              <div className={styles.baTag}>Upgraded</div>
              <h3 className={styles.baHeadline}>{report.before_after.upgraded_headline}</h3>
              <p className={styles.baDesc}>{report.before_after.upgraded_description}</p>
              <div className={styles.chipRow}>
                {report.before_after.upgraded_chips.map((c, i) => (
                  <span key={i} className={`${styles.chip} ${styles.chipSolid}`}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Interactive calculator */}
        <section className={styles.calcSection}>
          <h2 className={styles.sectionHeading}>Run your own numbers</h2>
          <p className={styles.calcHint}>
            Adjust any field — the leak estimate updates live. Optimized benchmark: {optimizedRate}%.
          </p>
          <div className={styles.calcGrid}>
            <label className={styles.calcField}>
              <span className={styles.calcLabel}>Visitors / month</span>
              <input
                type="number"
                min={0}
                className={styles.calcInput}
                value={visitors}
                onChange={(e) => setVisitors(Number(e.target.value) || 0)}
              />
            </label>
            <label className={styles.calcField}>
              <span className={styles.calcLabel}>Current conversion rate (%)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className={styles.calcInput}
                value={currentRate}
                onChange={(e) => setCurrentRate(Number(e.target.value) || 0)}
              />
            </label>
            <label className={styles.calcField}>
              <span className={styles.calcLabel}>Avg client value ($)</span>
              <input
                type="number"
                min={0}
                className={styles.calcInput}
                value={avgValue}
                onChange={(e) => setAvgValue(Number(e.target.value) || 0)}
              />
            </label>
            <label className={styles.calcField}>
              <span className={styles.calcLabel}>Close rate (%)</span>
              <input
                type="number"
                min={0}
                step={0.1}
                className={styles.calcInput}
                value={closeRate}
                onChange={(e) => setCloseRate(Number(e.target.value) || 0)}
              />
            </label>
          </div>
        </section>

        {/* Questionnaire */}
        <Questionnaire slug={slug} data={data} />

        {/* CTAs */}
        <section className={styles.ctaSection}>
          <a href={data.cta_booking_url} className={styles.bookingCta}>
            Talk through my numbers — 15 min call
          </a>
          <a href="https://websitelotto.virtuallaunch.pro" className={styles.ghostCta}>
            Browse tax professional templates
          </a>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Prepared for {firm} ·{' '}
          <Link href="/" className={styles.footerLink}>websitelotto.virtuallaunch.pro</Link>
        </p>
      </footer>
    </div>
  );
}

const SERVICE_OPTIONS = [
  'Tax Preparation',
  'Tax Resolution',
  'IRS Representation',
  'Bookkeeping',
  'Estate Planning',
  'Business Advisory',
  'Payroll Services',
];

interface ColorSwatch {
  id: string;
  label: string;
  primary: string;
  secondary: string;
}

const COLOR_SWATCHES: ColorSwatch[] = [
  { id: 'professional-blue', label: 'Professional Blue', primary: '#1d4ed8', secondary: '#f8fafc' },
  { id: 'modern-teal', label: 'Modern Teal', primary: '#0d9488', secondary: '#f0fdfa' },
  { id: 'classic-navy', label: 'Classic Navy', primary: '#1e3a5f', secondary: '#f8fafc' },
  { id: 'warm-charcoal', label: 'Warm Charcoal', primary: '#374151', secondary: '#f9fafb' },
];

interface QuestionnaireProps {
  slug: string;
  data: AssetPageData;
}

function Questionnaire({ slug, data }: QuestionnaireProps) {
  const [firmName, setFirmName] = useState(data.firm ?? '');
  const [services, setServices] = useState<Set<string>>(new Set());
  const [otherChecked, setOtherChecked] = useState(false);
  const [otherService, setOtherService] = useState('');
  const [targetClients, setTargetClients] = useState('');
  const [colorScheme, setColorScheme] = useState<string>('professional-blue');
  const [customColor, setCustomColor] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedReady, setGeneratedReady] = useState(false);

  const toggleService = (svc: string) => {
    setServices((prev) => {
      const next = new Set(prev);
      if (next.has(svc)) next.delete(svc);
      else next.add(svc);
      return next;
    });
  };

  useEffect(() => {
    if (!submitted || generatedReady) return;
    let cancelled = false;
    const interval = setInterval(async () => {
      const result = await getSiteRequestStatus(slug);
      if (cancelled) return;
      if (result.ok && result.status === 'generated') {
        setGeneratedReady(true);
        clearInterval(interval);
      }
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [submitted, generatedReady, slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firmName.trim()) {
      setError('Please enter your firm name.');
      return;
    }
    const allServices = Array.from(services);
    if (otherChecked && otherService.trim()) {
      allServices.push(otherService.trim());
    }
    if (allServices.length === 0) {
      setError('Please select at least one service.');
      return;
    }

    setSubmitting(true);
    const colorValue =
      colorScheme === 'custom'
        ? `Custom: ${customColor}`
        : COLOR_SWATCHES.find((c) => c.id === colorScheme)?.label ?? colorScheme;

    const payload = {
      slug,
      firm_name: firmName.trim(),
      credential: '',
      city: data.city ?? '',
      state: data.state ?? '',
      services: allServices,
      target_clients: targetClients.trim(),
      color_scheme: colorValue,
      logo_url: logoUrl.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website_url: '',
      additional_notes: notes.trim(),
    };

    const result = await submitSiteRequest(payload);
    setSubmitting(false);
    if (result.ok) {
      setSubmitted(true);
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.');
    }
  };

  if (submitted) {
    return (
      <section className={styles.questionnaireSection}>
        <div className={styles.confirmPanel}>
          {generatedReady ? (
            <>
              <h2 className={styles.confirmHeadline}>Your homepage is ready.</h2>
              <p className={styles.confirmMessage}>
                We&apos;ve generated a custom homepage for {firmName}. Preview it below or open in a new tab.
              </p>
              <a
                href={getCustomSiteUrl(slug)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.primaryCta}
              >
                Preview your new homepage
              </a>
              <div className={styles.previewFrameWrap}>
                <iframe
                  src={getCustomSiteUrl(slug)}
                  className={styles.previewIframe}
                  title="Your custom homepage"
                  loading="lazy"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className={styles.confirmHeadline}>Your homepage is being built.</h2>
              <p className={styles.confirmMessage}>
                We are generating a custom homepage for {firmName}.
                {email
                  ? ` You will receive an email at ${email} when it is ready`
                  : " We'll let you know when it is ready"}
                {' '}— typically within 24 hours.
              </p>
              <a href="https://websitelotto.virtuallaunch.pro" className={styles.ghostCta}>
                In the meantime, browse 210+ templates
              </a>
            </>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.questionnaireSection}>
      <div className={styles.questionnaireHeader}>
        <h2 className={styles.sectionHeading}>Fix these leaks. Your upgraded homepage ships in 24 hours.</h2>
        <p className={styles.questionnaireSub}>
          Answer a few questions and we will generate a custom homepage for your practice — free, no commitment.
        </p>
      </div>

      <form className={styles.questionnaireForm} onSubmit={handleSubmit}>
        <label className={styles.qField}>
          <span className={styles.qLabel}>Firm name</span>
          <input
            type="text"
            className={styles.qInput}
            value={firmName}
            onChange={(e) => setFirmName(e.target.value)}
            placeholder="e.g., Acme Tax & Accounting"
          />
        </label>

        <div className={styles.qField}>
          <span className={styles.qLabel}>What services do you offer?</span>
          <div className={styles.checkboxGrid}>
            {SERVICE_OPTIONS.map((svc) => {
              const checked = services.has(svc);
              return (
                <label
                  key={svc}
                  className={`${styles.checkboxItem} ${checked ? styles.checkboxItemActive : ''}`}
                >
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={checked}
                    onChange={() => toggleService(svc)}
                  />
                  <span className={styles.checkboxBox} aria-hidden="true" />
                  <span>{svc}</span>
                </label>
              );
            })}
            <label
              className={`${styles.checkboxItem} ${otherChecked ? styles.checkboxItemActive : ''}`}
            >
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={otherChecked}
                onChange={() => setOtherChecked((v) => !v)}
              />
              <span className={styles.checkboxBox} aria-hidden="true" />
              <span>Other</span>
            </label>
          </div>
          {otherChecked && (
            <input
              type="text"
              className={styles.qInput}
              value={otherService}
              onChange={(e) => setOtherService(e.target.value)}
              placeholder="Tell us what other services you offer"
              style={{ marginTop: 10 }}
            />
          )}
        </div>

        <label className={styles.qField}>
          <span className={styles.qLabel}>Who are your ideal clients?</span>
          <input
            type="text"
            className={styles.qInput}
            value={targetClients}
            onChange={(e) => setTargetClients(e.target.value)}
            placeholder="e.g., small business owners in Texas, high-net-worth individuals"
          />
        </label>

        <div className={styles.qField}>
          <span className={styles.qLabel}>Preferred color scheme</span>
          <div className={styles.swatchRow}>
            {COLOR_SWATCHES.map((sw) => {
              const active = colorScheme === sw.id;
              return (
                <button
                  type="button"
                  key={sw.id}
                  className={`${styles.swatch} ${active ? styles.swatchActive : ''}`}
                  onClick={() => setColorScheme(sw.id)}
                  aria-label={sw.label}
                >
                  <span
                    className={styles.swatchCircle}
                    style={{
                      background: `linear-gradient(135deg, ${sw.primary} 0%, ${sw.primary} 50%, ${sw.secondary} 50%, ${sw.secondary} 100%)`,
                    }}
                  />
                  <span className={styles.swatchLabel}>{sw.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              className={`${styles.swatch} ${colorScheme === 'custom' ? styles.swatchActive : ''}`}
              onClick={() => setColorScheme('custom')}
              aria-label="Match my current branding"
            >
              <span className={`${styles.swatchCircle} ${styles.swatchCustom}`}>?</span>
              <span className={styles.swatchLabel}>Match my branding</span>
            </button>
          </div>
          {colorScheme === 'custom' && (
            <input
              type="text"
              className={styles.qInput}
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              placeholder="e.g., #1d4ed8 or describe your brand colors"
              style={{ marginTop: 10 }}
            />
          )}
        </div>

        <label className={styles.qField}>
          <span className={styles.qLabel}>Your logo</span>
          <input
            type="url"
            className={styles.qInput}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://yoursite.com/logo.png (optional)"
          />
        </label>

        <div className={styles.qFieldGrid}>
          <label className={styles.qField}>
            <span className={styles.qLabel}>Phone number</span>
            <input
              type="tel"
              className={styles.qInput}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </label>
          <label className={styles.qField}>
            <span className={styles.qLabel}>Email</span>
            <input
              type="email"
              className={styles.qInput}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.com"
            />
          </label>
        </div>

        <label className={styles.qField}>
          <span className={styles.qLabel}>Anything else we should know?</span>
          <textarea
            className={styles.qTextarea}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional — anything that should shape your homepage"
            rows={4}
          />
        </label>

        {error && <div className={styles.formError}>{error}</div>}

        <button type="submit" className={styles.submitCta} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Generate My Upgraded Homepage'}
        </button>
      </form>
    </section>
  );
}
