'use client';
import { useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { createScratchTicket, revealScratchTicket, ScratchTicket } from '@/lib/api';
import styles from './page.module.css';

const PRIZE_CONFIG: Record<string, { emoji: string; title: string; desc: string }> = {
  free_month: { emoji: '🎉', title: 'You won a free template!', desc: 'Claim any available template at no cost — includes 12 months of hosting.' },
  '50_off': { emoji: '🎊', title: '$50 off your template!', desc: 'Use your discount code at checkout.' },
  '25_off': { emoji: '🎁', title: '$25 off your template!', desc: 'Use your discount code at checkout.' },
  credit_9: { emoji: '💰', title: 'You won a $9 credit!', desc: 'Apply this credit toward any template purchase.' },
  free_ticket: { emoji: '🎟️', title: 'Try again!', desc: 'You won another scratch ticket.' },
  no_prize: { emoji: '😔', title: 'Better luck next time!', desc: 'Browse available templates and find your perfect site.' },
};

export default function ScratchPage() {
  return (
    <AuthGuard>
      {(session) => <ScratchContent accountId={session.account_id} />}
    </AuthGuard>
  );
}

function ScratchContent({ accountId: _accountId }: { accountId: string }) {
  const [ticket, setTicket] = useState<ScratchTicket | null>(null);
  const [scratched, setScratched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prize, setPrize] = useState<typeof PRIZE_CONFIG[string] | null>(null);

  async function handleGetTicket() {
    setLoading(true);
    try {
      const t = await createScratchTicket();
      setTicket(t);
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal() {
    if (!ticket || scratched) return;
    setScratched(true);
    try {
      const result = await revealScratchTicket(ticket.ticket_id);
      const prizeKey = result.prize ?? 'no_prize';
      setPrize(PRIZE_CONFIG[prizeKey] ?? PRIZE_CONFIG.no_prize);
      setTicket(result);
    } catch {
      setPrize(PRIZE_CONFIG.no_prize);
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
        </div>
      </nav>

      <main className={styles.main}>
        <h1 className={styles.title}>Scratch to Win</h1>
        <p className={styles.subtitle}>One free ticket per account. Win a free template, discounts, or credits.</p>

        {!ticket && (
          <div className={styles.getTicket}>
            <div className={styles.ticketPlaceholder}>🎫</div>
            <button className={styles.getBtn} onClick={handleGetTicket} disabled={loading}>
              {loading ? 'Getting your ticket…' : 'Get Your Free Ticket'}
            </button>
          </div>
        )}

        {ticket && !scratched && (
          <div className={styles.scratchArea}>
            <p className={styles.scratchHint}>Click the card to reveal your prize!</p>
            <div className={styles.scratchCard} onClick={handleReveal}>
              <div className={styles.scratchOverlay}>
                <span className={styles.scratchOverlayText}>SCRATCH</span>
              </div>
              <div className={styles.scratchPrize}>🎁</div>
            </div>
          </div>
        )}

        {scratched && prize && (
          <div className={styles.prizeReveal}>
            <div className={styles.prizeEmoji}>{prize.emoji}</div>
            <h2 className={styles.prizeTitle}>{prize.title}</h2>
            <p className={styles.prizeDesc}>{prize.desc}</p>
            {ticket?.prize_code && (
              <div className={styles.prizeCode}>
                Code: <strong>{ticket.prize_code}</strong>
              </div>
            )}
            <div className={styles.postReveal}>
              <Link href="/" className={styles.browseBtn}>Browse Templates</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
