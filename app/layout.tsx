import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Website Lotto — Claim a ready-made website',
  description: 'Claim a high-converting website template. Buy Now, Bid, or Scratch to Win.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
