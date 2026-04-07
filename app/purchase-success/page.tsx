'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';

function PurchaseSuccessInner() {
  const params = useSearchParams();
  const sessionId = params.get('session_id');

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
        </div>
      </nav>
      <main className={styles.main}>
        <div className={styles.icon}>🎉</div>
        <h1 className={styles.title}>Your site has been claimed</h1>
        <p className={styles.desc}>
          We&apos;ll set it up and send you access details within 24 hours.
        </p>
        {sessionId && (
          <p className={styles.refNote}>
            Reference: <code>{sessionId}</code>
          </p>
        )}
        <div className={styles.actions}>
          <Link href="/" className={styles.primaryBtn}>Back to Marketplace</Link>
          <Link href="/dashboard" className={styles.secondaryBtn}>Go to Dashboard</Link>
        </div>
      </main>
    </div>
  );
}

export default function PurchaseSuccessPage() {
  return (
    <Suspense fallback={<div className={styles.page} />}>
      <PurchaseSuccessInner />
    </Suspense>
  );
}
