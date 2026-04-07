import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Website Lotto — Claim a ready-made website',
  description: 'Claim a high-converting website template. Buy Now, Bid, or Scratch to Win.',
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
