'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, Session } from '@/lib/api';

interface Props {
  children: (session: Session) => React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(setSession)
      .catch(() => {
        router.replace('/sign-in?redirect=' + encodeURIComponent(window.location.pathname));
      })
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div className="loadingScreen"><span className="spinner" /></div>;
  if (!session) return null;
  return <>{children(session)}</>;
}
