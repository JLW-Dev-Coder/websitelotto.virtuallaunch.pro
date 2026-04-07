'use client';
import { useState, useEffect } from 'react';
import AuthGuard from '@/components/AuthGuard';
import { getBuyerDashboard, BuyerDashboard } from '@/lib/api';
import MySite from './components/MySite';
import EditContent from './components/EditContent';
import EditBrand from './components/EditBrand';
import EditContact from './components/EditContact';
import Subscription from './components/Subscription';
import styles from './page.module.css';
import Link from 'next/link';

type Tab = 'site' | 'content' | 'brand' | 'contact' | 'subscription';

export default function DashboardPage() {
  return (
    <AuthGuard>
      {(session) => <DashboardContent accountId={session.account_id} />}
    </AuthGuard>
  );
}

function DashboardContent({ accountId }: { accountId: string }) {
  const [dashboard, setDashboard] = useState<BuyerDashboard | null>(null);
  const [tab, setTab] = useState<Tab>('site');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBuyerDashboard(accountId).then(setDashboard).finally(() => setLoading(false));
  }, [accountId]);

  if (loading) return <div className="loadingScreen"><span className="spinner" /></div>;
  if (!dashboard) return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
        </div>
      </nav>
      <div className={styles.noSite}>
        <h2>No active site</h2>
        <p>You don&apos;t have an active site yet.</p>
        <Link href="/" className={styles.claimBtn}>Browse Templates</Link>
      </div>
    </div>
  );

  const TABS: { id: Tab; label: string }[] = [
    { id: 'site', label: 'My Site' },
    { id: 'content', label: 'Edit Content' },
    { id: 'brand', label: 'Edit Brand' },
    { id: 'contact', label: 'Edit Contact' },
    { id: 'subscription', label: 'Subscription' },
  ];

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
          <div className={styles.navLinks}>
            <span className={styles.siteSlug}>{dashboard.template.slug}.websitelotto.virtuallaunch.pro</span>
            <Link href="/dashboard/sites" className={styles.affiliateLink}>My Sites</Link>
            <Link href="/affiliate" className={styles.affiliateLink}>Affiliate</Link>
          </div>
        </div>
      </nav>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${styles.tabBtn} ${tab === t.id ? styles.tabBtnActive : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
          <Link href="/dashboard/sites" className={styles.tabBtn}>
            My Sites
          </Link>
        </aside>

        <main className={styles.content}>
          {tab === 'site' && <MySite dashboard={dashboard} />}
          {tab === 'content' && <EditContent dashboard={dashboard} onUpdate={setDashboard} />}
          {tab === 'brand' && <EditBrand dashboard={dashboard} onUpdate={setDashboard} />}
          {tab === 'contact' && <EditContact dashboard={dashboard} onUpdate={setDashboard} />}
          {tab === 'subscription' && <Subscription dashboard={dashboard} />}
        </main>
      </div>
    </div>
  );
}
