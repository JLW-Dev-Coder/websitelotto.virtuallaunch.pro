'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getAssetPage, type AssetPageData, type ConversionLeakReport } from '@/lib/api';
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
    return <LeakReport data={data} report={data.conversion_leak_report} />;
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
}

function LeakReport({ data, report }: LeakReportProps) {
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

        {/* CTAs */}
        <section className={styles.ctaSection}>
          <a href={data.cta_claim_url} className={styles.primaryCta}>
            See the upgraded version of your website
          </a>
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
