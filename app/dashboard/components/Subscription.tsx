'use client';
import { BuyerDashboard, logout } from '@/lib/api';
import { useRouter } from 'next/navigation';
import styles from './components.module.css';

interface Props {
  dashboard: BuyerDashboard;
}

export default function Subscription({ dashboard }: Props) {
  const router = useRouter();
  const { subscription_status, stripe_portal_url } = dashboard;

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Hosting</h2>
      <div className={styles.subInfo}>
        <div className={styles.subPlan}>Website Lotto · 12 months included</div>
        <div className={`${styles.subStatus} ${subscription_status === 'active' ? styles.statusActive : styles.statusInactive}`}>
          {subscription_status}
        </div>
      </div>
      {stripe_portal_url && (
        <a href={stripe_portal_url} className={styles.portalBtn} target="_blank" rel="noopener noreferrer">
          Manage Billing ↗
        </a>
      )}
      <div className={styles.cancelWarn}>
        <p>Your one-time purchase includes 12 months of hosting. After that, hosting continues at $14/mo (standard) or $49/mo (premium with content updates, SEO, and priority support).</p>
      </div>
      <button className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
    </div>
  );
}
