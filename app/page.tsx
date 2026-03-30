'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTemplates, getSession, voteTemplate, Template } from '@/lib/api';
import styles from './page.module.css';

const CATEGORIES = ['All', 'Available', 'health', 'finance', 'legal', 'food/bev', 'creative', 'services', 'other'];

export default function HomePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState<'votes' | 'newest' | 'price'>('votes');
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<{ account_id: string } | null>(null);

  useEffect(() => {
    getTemplates().then(setTemplates).finally(() => setLoading(false));
    getSession().then(setSession).catch(() => {});
  }, []);

  const filtered = templates
    .filter(t => {
      if (filter === 'All') return true;
      if (filter === 'Available') return t.status === 'available';
      return t.category === filter;
    })
    .sort((a, b) => {
      if (sort === 'votes') return b.vote_count - a.vote_count;
      if (sort === 'price') return a.price_monthly - b.price_monthly;
      return 0;
    });

  async function handleVote(slug: string) {
    if (!session) {
      router.push('/sign-in?redirect=/');
      return;
    }
    try {
      const res = await voteTemplate(slug);
      setTemplates(prev => prev.map(t => t.slug === slug ? { ...t, vote_count: res.vote_count } : t));
    } catch {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.marqueeStrip} />
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navLogo}>Website Lotto</Link>
          <div className={styles.navLinks}>
            <a href="#how">How it works</a>
            <a href="#sites">Templates</a>
            <a href="#pricing">Pricing</a>
            <Link href="/scratch">Free Ticket</Link>
            {session ? <Link href="/dashboard">Dashboard</Link> : <Link href="/sign-in">Sign In</Link>}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className={styles.hero} id="hero">
        <div className={styles.heroBg} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Website Lotto</h1>
          <p className={styles.heroTagline}>Don&apos;t gamble on your website design.</p>
          <p className={styles.heroDesc}>Claim a ready-made, high-converting website today. Hosted on a reliable domain with Cloudflare-backed security. Plug in your Stripe link and start selling in minutes.</p>
          <div className={styles.badges}>
            <span className={styles.badge}>$99/mo</span>
            <span className={styles.badge}>Easy to transfer</span>
            <span className={styles.badge}>Cloudflare-backed</span>
          </div>
          <div className={styles.heroButtons}>
            <a href="#sites" className={styles.btnPrimary}>See Templates</a>
            <Link href="/scratch" className={styles.btnSecondary}>Get Free Scratch Ticket</Link>
          </div>
        </div>
      </section>

      <div className={styles.neonLine} />

      {/* HOW IT WORKS */}
      <section className={styles.section} id="how">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>How It Works</h2>
          <div className={styles.howGrid}>
            <div className={styles.stepCard}>
              <span className={styles.stepNum}>1</span>
              <h3>Pick a site</h3>
              <p>Browse 48 templates and choose one that fits your business.</p>
            </div>
            <div className={styles.stepCard}>
              <span className={styles.stepNum}>2</span>
              <h3>Connect payments</h3>
              <p>Plug in your Stripe account or payment link. Done.</p>
            </div>
            <div className={styles.stepCard}>
              <span className={styles.stepNum}>3</span>
              <h3>Launch &amp; sell</h3>
              <p>Your site is live on a branded subdomain. Start making money.</p>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.neonLine} />

      {/* TEMPLATE GALLERY */}
      <section className={styles.section} id="sites">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Template Library</h2>

          <div className={styles.filterRow}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`${styles.filterPill} ${filter === cat ? styles.filterPillActive : ''}`}
                onClick={() => setFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className={styles.sortRow}>
            <span>Sort:</span>
            {(['votes', 'newest', 'price'] as const).map(s => (
              <button key={s} className={`${styles.sortBtn} ${sort === s ? styles.sortBtnActive : ''}`} onClick={() => setSort(s)}>
                {s === 'votes' ? 'Most Voted' : s === 'newest' ? 'Newest' : 'Price'}
              </button>
            ))}
          </div>

          {loading ? (
            <div className={styles.loadingRow}><span className="spinner" /></div>
          ) : (
            <div className={styles.grid}>
              {filtered.map(t => (
                <div key={t.slug} className={styles.card}>
                  <Link href={`/sites/${t.slug}`} className={styles.cardThumb}>
                    {t.thumbnail_url
                      ? <img src={t.thumbnail_url} alt={t.title} />
                      : <span className={styles.cardEmoji}>🌐</span>}
                  </Link>
                  <div className={styles.cardBody}>
                    <div className={`${styles.cardStatus} ${styles['status' + (t.status.charAt(0).toUpperCase() + t.status.slice(1))]}`}>
                      {t.status === 'available' ? 'Available' : t.status === 'auction' ? 'Auction' : 'Sold'}
                    </div>
                    <div className={styles.cardTitle}>{t.title}</div>
                    <div className={styles.cardCategory}>{t.category}</div>
                    {t.status === 'auction' && t.current_bid && (
                      <div className={styles.currentBid}>Bid: ${t.current_bid}</div>
                    )}
                    <div className={styles.cardVotes}>▲ {t.vote_count} votes</div>
                    <div className={styles.cardActions}>
                      {t.status === 'sold' ? (
                        <span className={styles.soldBadge}>Sold</span>
                      ) : (
                        <>
                          {t.status === 'available' && (
                            <Link href={`/sites/${t.slug}`} className={styles.cardActionBtn}>Buy Now</Link>
                          )}
                          <Link href={`/sites/${t.slug}`} className={styles.cardActionBtn}>
                            {t.status === 'auction' ? `Bid $${t.current_bid ?? ''}` : 'Place Bid'}
                          </Link>
                          <button className={styles.voteBtn} onClick={() => handleVote(t.slug)}>Vote</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <div className={styles.neonLine} />

      {/* FEATURES */}
      <section className={styles.section} id="features">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>What&apos;s Included</h2>
          <div className={styles.featureGrid}>
            {[
              { icon: '⚡', title: 'High-converting layout', desc: 'Professionally designed templates built to convert visitors into customers.' },
              { icon: '🌐', title: 'Branded subdomain', desc: 'Your site lives on a memorable .virtuallaunch.pro subdomain.' },
              { icon: '💳', title: 'Stripe-ready', desc: 'Plug in your Stripe link or payment button in seconds.' },
              { icon: '🔒', title: 'Cloudflare security', desc: 'DDoS protection, SSL, and global CDN included.' },
              { icon: '✏️', title: 'Easy customization', desc: 'Edit your content, brand colors, and contact info from the dashboard.' },
              { icon: '🎫', title: 'Scratch to Win', desc: 'Win a free month, discounts, or credits with our scratch ticket mechanic.' },
            ].map(f => (
              <div key={f.title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className={styles.neonLine} />

      {/* PRICING */}
      <section className={styles.section} id="pricing">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Pricing</h2>
          <div className={styles.pricingRow}>
            <div className={styles.pricingBox}>
              <div className={styles.pricingBadge}>Most Popular</div>
              <div className={styles.pricingPrice}>$99<span>/mo</span></div>
              <div className={styles.pricingLabel}>Buy Now</div>
              <ul className={styles.pricingFeatures}>
                <li>Instant site claim</li>
                <li>Branded subdomain</li>
                <li>Edit content &amp; brand</li>
                <li>Cloudflare CDN + SSL</li>
                <li>Cancel anytime</li>
              </ul>
              <a href="#sites" className={styles.btnPrimary}>Claim a Site</a>
            </div>
            <div className={styles.pricingBox}>
              <div className={styles.pricingPrice}>$29+</div>
              <div className={styles.pricingLabel}>Bidding</div>
              <ul className={styles.pricingFeatures}>
                <li>7-day auctions</li>
                <li>Minimum $29 bid</li>
                <li>Winner gets full access</li>
                <li>Same features as Buy Now</li>
              </ul>
              <a href="#sites" className={styles.btnSecondary}>Browse Auctions</a>
            </div>
            <div className={styles.pricingBox}>
              <div className={styles.pricingPrice}>Free</div>
              <div className={styles.pricingLabel}>Scratch to Win</div>
              <ul className={styles.pricingFeatures}>
                <li>One free scratch ticket</li>
                <li>Win a free month</li>
                <li>Or 50%/25% off</li>
                <li>Or $9 credit</li>
              </ul>
              <Link href="/scratch" className={styles.btnSecondary}>Get My Ticket</Link>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.neonLine} />

      {/* FAQ */}
      <section className={styles.section} id="faq">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>FAQ</h2>
          <div className={styles.faqList}>
            {[
              { q: 'Can I cancel anytime?', a: 'Yes. Cancel your subscription and your site is returned to the available pool.' },
              { q: 'What happens when a template is sold?', a: 'It is marked Sold and removed from the available pool. The buyer has exclusive use.' },
              { q: 'Can I use my own domain?', a: 'Your site runs on a .virtuallaunch.pro subdomain. Custom domain support is coming soon.' },
              { q: 'How do auctions work?', a: '7-day auctions with a $29 minimum bid. Highest bid at auction end wins.' },
              { q: 'What is Scratch to Win?', a: 'Create a free account and get a scratch ticket. Prizes include free months, discounts, and credits.' },
            ].map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.sectionInner}>
          <p>© 2025 Website Lotto · <Link href="/support">Support</Link> · <Link href="/sign-in">Sign In</Link></p>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button className={styles.faqQ} onClick={() => setOpen(!open)}>
        {q}<span>{open ? '−' : '+'}</span>
      </button>
      {open && <div className={styles.faqA}>{a}</div>}
    </div>
  );
}
