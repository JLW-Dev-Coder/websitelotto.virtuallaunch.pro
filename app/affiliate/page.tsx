'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import {
  getAffiliate,
  getAffiliateEvents,
  startAffiliateOnboarding,
  requestPayout,
  Affiliate,
  AffiliateEvent,
} from '@/lib/api';
import styles from './page.module.css';

export default function AffiliatePage() {
  return (
    <AuthGuard>
      {(session) => <AffiliateContent accountId={session.account_id} />}
    </AuthGuard>
  );
}

function AffiliateContent({ accountId }: { accountId: string }) {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null);
  const [events, setEvents] = useState<AffiliateEvent[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  useEffect(() => {
    Promise.all([getAffiliate(accountId), getAffiliateEvents(accountId)])
      .then(([aff, evts]) => {
        setAffiliate(aff);
        setEvents(evts);
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  function handleCopy() {
    if (!affiliate) return;
    navigator.clipboard.writeText(affiliate.referral_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handlePayout() {
    if (!affiliate) return;
    setPayoutLoading(true);
    try {
      const result = await requestPayout(affiliate.balance_pending);
      setPayoutMsg(`Payout requested! ID: ${result.payout_id}`);
      setAffiliate({ ...affiliate, balance_pending: 0 });
    } catch {
      setPayoutMsg('Payout request failed. Please try again.');
    } finally {
      setPayoutLoading(false);
    }
  }

  async function handleConnect() {
    try {
      const { onboard_url } = await startAffiliateOnboarding();
      window.location.href = onboard_url;
    } catch {
      // silently ignore — user stays on page
    }
  }

  const payoutDisabledBalance = !affiliate || affiliate.balance_pending < 1000;
  const payoutDisabledConnect = !affiliate || affiliate.connect_status !== 'active';
  const payoutDisabled = payoutDisabledBalance || payoutDisabledConnect || payoutLoading;
  const payoutTooltip = payoutDisabledBalance
    ? 'Minimum payout is $10'
    : payoutDisabledConnect
    ? 'Connect your bank account to withdraw'
    : undefined;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
          <div className={styles.navLinks}>
            <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
            <Link href="/affiliate" className={styles.navLink}>Affiliate</Link>
          </div>
        </div>
      </nav>

      <main className={styles.main}>
        {/* Section 1 — Referral Link */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Your Referral Link</h2>
          {loading ? (
            <div className={styles.skeleton} style={{ height: 80 }} />
          ) : (
            <>
              <div className={styles.referralRow}>
                <input
                  className={styles.referralInput}
                  type="text"
                  readOnly
                  value={affiliate?.referral_url ?? ''}
                />
                <button className={styles.copyBtn} onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className={styles.referralSubtext}>
                Share this link. Earn 20% commission on every purchase your referrals make, for life.
              </p>
            </>
          )}
        </section>

        {/* Section 2 — Earnings Summary */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Earnings Summary</h2>
          {loading ? (
            <div className={styles.skeleton} style={{ height: 120 }} />
          ) : (
            <>
              <div className={styles.statCards}>
                <div className={styles.statCard}>
                  <p className={styles.statAmount}>
                    ${((affiliate?.balance_pending ?? 0) / 100).toFixed(2)}
                  </p>
                  <p className={styles.statLabel}>Available to withdraw</p>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statAmount}>
                    ${((affiliate?.balance_paid ?? 0) / 100).toFixed(2)}
                  </p>
                  <p className={styles.statLabel}>Total earned and paid</p>
                </div>
              </div>

              {payoutMsg ? (
                <p className={styles.payoutSuccess}>{payoutMsg}</p>
              ) : (
                <div className={payoutDisabled && payoutTooltip ? styles.tooltipWrap : ''}>
                  <button
                    className={styles.payoutBtn}
                    onClick={handlePayout}
                    disabled={payoutDisabled}
                  >
                    {payoutLoading ? 'Requesting…' : 'Request Payout'}
                  </button>
                  {payoutDisabled && payoutTooltip && (
                    <span className={styles.tooltip}>{payoutTooltip}</span>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Section 3 — Stripe Connect */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Bank Account</h2>
          {loading ? (
            <div className={styles.skeleton} style={{ height: 80 }} />
          ) : affiliate?.connect_status === 'active' ? (
            <span className={styles.connectedBadge}>&#10003; Bank account connected</span>
          ) : (
            <div className={styles.onboardCard}>
              <h3>Connect your bank account</h3>
              <p>Connect via Stripe to receive commission payouts directly to your bank.</p>
              <button className={styles.connectBtn} onClick={handleConnect}>
                Connect Bank Account
              </button>
            </div>
          )}
        </section>

        {/* Section 4 — Commission History */}
        <section className={styles.section}>
          <h2 className={styles.sectionHeading}>Commission History</h2>
          {loading ? (
            <div className={styles.skeleton} />
          ) : events && events.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Platform</th>
                    <th>Sale Amount</th>
                    <th>Your Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt, i) => (
                    <tr key={i}>
                      <td>{new Date(evt.created_at).toLocaleDateString()}</td>
                      <td>{evt.platform}</td>
                      <td>${(evt.gross_amount / 100).toFixed(2)}</td>
                      <td>${(evt.commission_amount / 100).toFixed(2)}</td>
                      <td>
                        <span className={evt.status === 'paid' ? styles.badgePaid : styles.badgePending}>
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.emptyState}>
              No commissions yet. Share your referral link to start earning.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
