'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { getMySites, createHostingRenewalCheckout, PurchasedSite } from '@/lib/api';
import styles from './page.module.css';

export default function MySitesPage() {
  return (
    <AuthGuard>
      {(session) => <MySitesContent accountId={session.account_id} />}
    </AuthGuard>
  );
}

function MySitesContent({ accountId }: { accountId: string }) {
  const [sites, setSites] = useState<PurchasedSite[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMySites(accountId)
      .then(setSites)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Failed to load sites'))
      .finally(() => setLoading(false));
  }, [accountId]);

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
          <h1 className={styles.title}>My Sites</h1>
          <p className={styles.subtitle}>Templates you&apos;ve claimed and are hosting with Website Lotto.</p>
        </header>

        {loading && <div className={styles.state}><span className="spinner" /></div>}

        {!loading && error && (
          <div className={styles.errorBox}>
            <p className={styles.errorTitle}>Couldn&apos;t load your sites</p>
            <p className={styles.errorMsg}>{error}</p>
          </div>
        )}

        {!loading && !error && sites && sites.length === 0 && (
          <div className={styles.emptyBox}>
            <h2 className={styles.emptyTitle}>No sites yet</h2>
            <p className={styles.emptyMsg}>Browse the marketplace to claim your first template.</p>
            <Link href="/" className={styles.browseBtn}>Browse Templates</Link>
          </div>
        )}

        {!loading && !error && sites && sites.length > 0 && (
          <div className={styles.grid}>
            {sites.map((s) => (
              <SiteCard key={s.slug} site={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SiteCard({ site }: { site: PurchasedSite }) {
  const [renewing, setRenewing] = useState(false);
  const [renewError, setRenewError] = useState('');

  const purchased = new Date(site.purchased_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const expiresDate = site.hosting_expires_at ? new Date(site.hosting_expires_at) : null;
  const expires = expiresDate
    ? expiresDate.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : null;

  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilExpiry = expiresDate
    ? Math.ceil((expiresDate.getTime() - now) / msPerDay)
    : null;

  const isExpired = site.hosting_status === 'expired';
  const isExpiringSoon =
    !isExpired && daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

  const statusClass =
    site.hosting_status === 'active' ? styles.statusActive
    : site.hosting_status === 'expired' ? styles.statusExpired
    : styles.statusPending;

  async function handleRenew() {
    setRenewing(true);
    setRenewError('');
    try {
      const res = await createHostingRenewalCheckout(site.slug);
      const url = res.session_url ?? res.url;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err: unknown) {
      setRenewError(err instanceof Error ? err.message : 'Failed to start renewal');
      setRenewing(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.cardTitle}>{site.title}</h3>
        <span className={`${styles.statusBadge} ${statusClass}`}>
          {site.hosting_status === 'active' ? 'Active'
            : site.hosting_status === 'expired' ? 'Expired'
            : 'Pending'}
        </span>
      </div>
      {site.category && <div className={styles.cardCategory}>{site.category}</div>}

      {isExpired && (
        <div className={styles.alertExpired}>
          Hosting expired — renew to keep your site live
        </div>
      )}
      {isExpiringSoon && expires && (
        <div className={styles.alertWarning}>
          Hosting expires {expires}
        </div>
      )}

      <dl className={styles.meta}>
        <div className={styles.metaRow}>
          <dt>Purchased</dt>
          <dd>{purchased}</dd>
        </div>
        {expires && (
          <div className={styles.metaRow}>
            <dt>{isExpired ? 'Expired on' : 'Renews on'}</dt>
            <dd>{expires}</dd>
          </div>
        )}
      </dl>

      {renewError && (
        <div className={styles.errorBox}>
          <p className={styles.errorMsg}>{renewError}</p>
        </div>
      )}

      <div className={styles.actions}>
        <a
          href={site.site_url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.viewBtn}
        >
          View Site ↗
        </a>
        <Link href={`/dashboard/sites/${site.slug}/edit`} className={styles.editBtn}>
          Edit Site
        </Link>
      </div>

      {(isExpired || isExpiringSoon) && (
        <button
          type="button"
          className={styles.renewBtn}
          onClick={handleRenew}
          disabled={renewing}
        >
          {renewing ? 'Starting checkout…' : 'Renew Hosting — $14/mo'}
        </button>
      )}
    </div>
  );
}
