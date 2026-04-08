'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAssetPage, type AssetPageData } from '@/lib/api';
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
    // The build emits a single shell page; the real prospect slug lives in
    // the URL after a Cloudflare Pages rewrite. Pull it from window.location.
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
