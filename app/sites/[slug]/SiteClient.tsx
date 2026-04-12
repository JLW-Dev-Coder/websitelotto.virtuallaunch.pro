'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTemplate, getTemplateBids, voteTemplate, AlreadyVotedError, placeBid, createCheckout, getSession, Template, Bid } from '@/lib/api';
import { getTierForSlug, getPrice } from '@/lib/pricing';
import { TEMPLATES, getCategoryLabel } from '@/lib/templates';
import styles from './page.module.css';

interface Props {
  slug: string;
}

export default function SiteClient({ slug }: Props) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [session, setSession] = useState<{ account_id: string } | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    Promise.all([
      getTemplate(slug).catch(() => null),
      getTemplateBids(slug).catch(() => [] as Bid[]),
      getSession().catch(() => null),
    ]).then(([t, b, s]) => {
      if (t) {
        setTemplate(t);
      } else {
        const entry = TEMPLATES.find(e => e.slug === slug);
        if (entry) {
          setTemplate({
            slug: entry.slug,
            title: entry.title,
            category: getCategoryLabel(entry.category),
            status: 'available',
            vote_count: 0,
            price_monthly: 0,
          });
        }
      }
      setBids(b);
      setSession(s);
    }).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!template?.auction_ends_at) return;
    const tick = () => {
      const diff = new Date(template.auction_ends_at!).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [template]);

  const [voted, setVoted] = useState(false);
  const [voting, setVoting] = useState(false);

  async function handleVote() {
    if (!session) { router.push('/sign-in?redirect=/sites/' + slug); return; }
    if (voted || voting) return;
    setVoting(true);
    try {
      const res = await voteTemplate(slug);
      setTemplate(t => t ? { ...t, vote_count: res.vote_count } : t);
      setVoted(true);
    } catch (e) {
      if (e instanceof AlreadyVotedError) {
        setVoted(true);
      }
    } finally {
      setVoting(false);
    }
  }

  const tier = getTierForSlug(slug);
  const price = getPrice(tier);

  async function handleBuyNow() {
    if (!session) { router.push('/sign-in?redirect=/sites/' + slug); return; }
    try {
      const res = await createCheckout(slug, tier);
      const url = res.session_url ?? res.url;
      if (url) window.location.href = url;
      else setError('Checkout failed: no session URL');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Checkout failed'); }
  }

  async function handlePlaceBid() {
    if (!session) { router.push('/sign-in?redirect=/sites/' + slug); return; }
    const amount = Number(bidAmount);
    if (amount < 29) { setError('Minimum bid is $29'); return; }
    try {
      await placeBid(slug, amount);
      const [t, b] = await Promise.all([getTemplate(slug), getTemplateBids(slug)]);
      setTemplate(t); setBids(b); setBidAmount(''); setError('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Bid failed'); }
  }

  if (loading) return <div className="loadingScreen"><span className="spinner" /></div>;
  if (!template) return <div className="loadingScreen"><p>Template not found.</p></div>;

  return (
    <div className={styles.page}>
      <div className={styles.marqueeStrip} />
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
          <div className={styles.navLinks}>
            <Link href="/">← Back to Gallery</Link>
            {session ? <Link href="/dashboard">Dashboard</Link> : <Link href="/sign-in">Sign In</Link>}
          </div>
        </div>
      </nav>

      <main className={styles.hero}>
        <div className={styles.previewWrap}>
          <iframe
            src={`/sites/${slug}/preview.html`}
            className={styles.previewFrame}
            title={template.title}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        <div className={styles.actionPanel}>
          <div className={`${styles.cardStatus} ${styles['status' + (template.status || 'available').charAt(0).toUpperCase() + (template.status || 'available').slice(1)]}`}>
            {template.status === 'available' ? 'Available' : template.status === 'auction' ? 'Auction' : 'Sold'}
          </div>
          <h1 className={styles.templateTitle}>{template.title}</h1>
          <div className={styles.templateCategory}>{template.category}</div>
          {template.description && <p className={styles.templateDesc}>{template.description}</p>}

          <div className={styles.voteRow}>
            <span>▲ {template.vote_count} votes</span>
            <button className={styles.voteBtn} onClick={handleVote} disabled={voted || voting}>{voted ? 'Voted ✓' : voting ? '...' : 'Vote'}</button>
          </div>

          {error && <div className={styles.errorMsg}>{error}</div>}

          {template.status === 'available' && (
            <div className={styles.statusPanel}>
              <button className={styles.buyBtn} onClick={handleBuyNow}>Buy Now — ${price}</button>
              <div className={styles.bidSection}>
                <p className={styles.bidLabel}>Or place a bid (min $29):</p>
                <div className={styles.bidRow}>
                  <input
                    type="number"
                    className={styles.bidInput}
                    placeholder="$29"
                    min={29}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                  />
                  <button className={styles.bidBtn} onClick={handlePlaceBid}>Place Bid</button>
                </div>
              </div>
            </div>
          )}

          {template.status === 'auction' && (
            <div className={styles.statusPanel}>
              {template.auction_ends_at && (
                <div className={styles.countdown}>Ends in: {timeLeft}</div>
              )}
              <div className={styles.currentBid}>Current bid: ${template.current_bid ?? 0}</div>
              <div className={styles.bidSection}>
                <div className={styles.bidRow}>
                  <input
                    type="number"
                    className={styles.bidInput}
                    placeholder={`$${(template.current_bid ?? 28) + 1}`}
                    min={(template.current_bid ?? 28) + 1}
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                  />
                  <button className={styles.bidBtn} onClick={handlePlaceBid}>Place Bid</button>
                </div>
              </div>
              {bids.length > 0 && (
                <div className={styles.bidHistory}>
                  <p className={styles.bidHistoryTitle}>Bid history:</p>
                  {bids.map((b, i) => (
                    <div key={i} className={styles.bidItem}>
                      <span>{b.account_id.slice(0, 8)}…</span>
                      <span>${b.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {template.status === 'sold' && (
            <div className={styles.soldMessage}>
              <p>This template has been claimed.</p>
              <Link href="/scratch" className={styles.bidBtn}>Join Waitlist via Scratch Ticket</Link>
            </div>
          )}
        </div>
      </main>

      <section className={styles.ctaBanner}>
        <div className={styles.ctaInner}>
          <h2 className={styles.ctaTitle}>Get this website for your business</h2>
          <div className={styles.ctaOptions}>
            <div className={styles.ctaOption}>
              <span className={styles.ctaOptionLabel}>Buy now</span>
              <span className={styles.ctaOptionPrice}>${price} one-time</span>
            </div>
            <div className={styles.ctaOption}>
              <span className={styles.ctaOptionLabel}>Hosting</span>
              <span className={styles.ctaOptionPrice}>12 mo included</span>
            </div>
            <div className={styles.ctaOption}>
              <span className={styles.ctaOptionLabel}>After year 1</span>
              <span className={styles.ctaOptionPrice}>from $14/mo</span>
            </div>
          </div>
          <Link href="/" className={styles.ctaLink}>Or browse all templates →</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.navInner}>
          <p>© 2025 Website Lotto · <Link href="/support">Support</Link></p>
        </div>
      </footer>
    </div>
  );
}
