import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alexandra – Tervezőtér',
  description: 'Az ötlettől a tiszta tervig. Vezetett rendszertervezés és strukturált fejlesztői brief.',
  icons: { icon: '/logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
