'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTemplates, getSession, voteTemplate, Template } from '@/lib/api';
import { getPriceForSlug } from '@/lib/pricing';
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
          <p className={styles.heroTagline}>Own your website. One payment. No subscriptions.</p>
          <p className={styles.heroDesc}>Browse 210+ professional websites and buy the one that fits your business. One-time payment, 12 months hosting included, Cloudflare-backed security. Plug in your Stripe link and start selling in minutes.</p>
          <div className={styles.badges}>
            <span className={styles.badge}>From $249 one-time</span>
            <span className={styles.badge}>12 mo hosting included</span>
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
              <p>Browse 210+ templates and choose one that fits your business.</p>
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
                    <div className={styles.cardPrice}>${getPriceForSlug(t.slug)}</div>
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
                            <Link href={`/sites/${t.slug}`} className={styles.cardActionBtn}>Buy Now — ${getPriceForSlug(t.slug)}</Link>
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
              <div className={styles.pricingPrice}>$249<span> one-time</span></div>
              <div className={styles.pricingLabel}>Standard Site</div>
              <ul className={styles.pricingFeatures}>
                <li>Professional website template</li>
                <li>Lifestyle, hobby, food, beauty, entertainment &amp; sports niches</li>
                <li>12 months hosting included</li>
                <li>Branded subdomain</li>
                <li>Cloudflare CDN + SSL</li>
                <li>Mobile responsive</li>
              </ul>
              <a href="#sites" className={styles.btnSecondary}>Browse Standard Sites</a>
            </div>
            <div className={styles.pricingBox}>
              <div className={styles.pricingBadge}>Most Popular</div>
              <div className={styles.pricingPrice}>$399<span> one-time</span></div>
              <div className={styles.pricingLabel}>Premium Site</div>
              <ul className={styles.pricingFeatures}>
                <li>Niche-specific professional website</li>
                <li>Tax, legal, services, real estate &amp; tech niches</li>
                <li>12 months hosting included</li>
                <li>Branded subdomain</li>
                <li>Cloudflare CDN + SSL</li>
                <li>Mobile responsive</li>
              </ul>
              <a href="#sites" className={styles.btnPrimary}>Browse Premium Sites</a>
            </div>
            <div className={styles.pricingBox}>
              <div className={styles.pricingPrice}>$14<span>/mo</span></div>
              <div className={styles.pricingLabel}>After Year 1</div>
              <ul className={styles.pricingFeatures}>
                <li>Standard hosting: $14/mo</li>
                <li>Premium hosting: $49/mo</li>
                <li>Premium includes content updates</li>
                <li>Premium includes SEO</li>
                <li>Premium includes priority support</li>
                <li><strong>First 12 months included with purchase</strong></li>
              </ul>
              <a href="#sites" className={styles.btnSecondary}>See Templates</a>
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
              { q: 'Is this a subscription?', a: 'No. You pay one time ($249 standard or $399 premium) and own the site. Hosting for the first 12 months is included.' },
              { q: 'What happens after 12 months?', a: 'Continue with standard hosting at $14/mo or upgrade to premium hosting at $49/mo (includes content updates, SEO, and priority support).' },
              { q: 'What is the difference between standard and premium?', a: 'Premium sites cover higher-value niches (tax, legal, services, real estate, tech). Standard sites cover lifestyle, hobby, food, beauty, entertainment, and sports.' },
              { q: 'What happens when a template is sold?', a: 'It is marked Sold and removed from the available pool. The buyer has exclusive use.' },
              { q: 'Can I use my own domain?', a: 'Your site runs on a .virtuallaunch.pro subdomain. Custom domain support is coming soon.' },
            ].map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className={styles.section} id="cta">
        <div className={styles.sectionInner}>
          <div className={styles.ctaBlock}>
            <h2 className={styles.ctaBlockTitle}>210+ professional websites. Ready to launch.</h2>
            <p className={styles.ctaBlockDesc}>Skip the agency. Get a designer-quality website for your practice or business — one-time payment, 12 months hosting included.</p>
            <a href="#sites" className={styles.btnPrimary}>Browse templates</a>
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
