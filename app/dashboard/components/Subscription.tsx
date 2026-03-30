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
      <h2 className={styles.panelTitle}>Subscription</h2>
      <div className={styles.subInfo}>
        <div className={styles.subPlan}>Website Lotto · $99/mo</div>
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
        <p>Cancelling your subscription will return your site to the available pool. You will lose access immediately.</p>
      </div>
      <button className={styles.logoutBtn} onClick={handleLogout}>Sign Out</button>
    </div>
  );
}
