'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect }),
      });
      if (!res.ok) throw new Error('Failed to send link');
      setStatus('sent');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.logo}><Link href="/">Website Lotto</Link></div>
          <div className={styles.sentMsg}>
            <span className={styles.sentIcon}>✉️</span>
            <h2>Check your email</h2>
            <p>We sent a magic link to <strong>{email}</strong>. Click the link to sign in.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}><Link href="/">Website Lotto</Link></div>
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>Enter your email — we&apos;ll send a magic link.</p>

        <form className={styles.form} onSubmit={handleMagicLink}>
          <input
            type="email"
            className={styles.input}
            placeholder="you@example.com"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          {status === 'error' && <p className={styles.error}>{errorMsg}</p>}
          <button type="submit" className={styles.btn} disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending…' : 'Send Magic Link'}
          </button>
        </form>

        <div className={styles.divider}><span>or</span></div>

        <a
          href={`/api/auth/google?redirect=${encodeURIComponent(redirect)}`}
          className={styles.googleBtn}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </a>

        <p className={styles.terms}>By signing in, you agree to our <Link href="/support">Terms of Service</Link>.</p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
