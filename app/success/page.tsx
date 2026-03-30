import Link from 'next/link';
import styles from './page.module.css';

export default function SuccessPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
        </div>
      </nav>
      <main className={styles.main}>
        <div className={styles.icon}>🎉</div>
        <h1 className={styles.title}>You&apos;re live!</h1>
        <p className={styles.desc}>Your site has been claimed and is now live. Here&apos;s what to do next:</p>
        <ol className={styles.steps}>
          <li>Visit your dashboard to customize your site</li>
          <li>Add your brand name, tagline, and contact info</li>
          <li>Upload your logo and set your brand colors</li>
          <li>Share your site URL with the world</li>
        </ol>
        <div className={styles.actions}>
          <Link href="/dashboard" className={styles.primaryBtn}>Go to Dashboard</Link>
          <Link href="/" className={styles.secondaryBtn}>Browse More Templates</Link>
        </div>
        <p className={styles.emailNote}>Check your email for login instructions and your site URL.</p>
      </main>
    </div>
  );
}
