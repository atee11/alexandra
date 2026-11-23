import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { asset } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Alexandra – Tervezőtér',
  description: 'Az ötlettől a tiszta tervig. Vezetett rendszertervezés és strukturált fejlesztői brief.',
  icons: { icon: asset('/logo.png') },
  // Kipróbálási szakaszban a keresők ne listázzák az oldalt.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={GeistSans.variable}>
      <body>{children}</body>
    </html>
  );
}
