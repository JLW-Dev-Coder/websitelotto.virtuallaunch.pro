import Link from 'next/link';
import styles from './page.module.css';

export default function SupportPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
        </div>
      </nav>
      <main className={styles.main}>
        <h1 className={styles.title}>Support</h1>
        <p className={styles.desc}>Need help? We&apos;re here for you.</p>
        <div className={styles.card}>
          <h2>Submit a Ticket</h2>
          <p>Log into your account and submit a support ticket from your dashboard.</p>
          <Link href="/sign-in?redirect=/dashboard" className={styles.btn}>Open Dashboard</Link>
        </div>
        <div className={styles.card}>
          <h2>Common Questions</h2>
          <ul className={styles.list}>
            <li>Billing: Manage your subscription from your dashboard.</li>
            <li>Site editing: Use the Dashboard → Edit Content panel.</li>
            <li>Cancellation: Cancel anytime — your site returns to available.</li>
            <li>Domains: Sites run on .virtuallaunch.pro subdomains.</li>
          </ul>
        </div>
        <div className={styles.card}>
          <h2>Response Time</h2>
          <p>We respond to support requests within 1 business day.</p>
        </div>
      </main>
    </div>
  );
}
