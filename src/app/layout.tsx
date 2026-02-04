import type { Metadata } from 'next';
import localFont from 'next/font/local';

import './globals.css';
import { Providers } from '@/components/providers';

const geistSans = localFont({
  variable: '--font-geist-sans',
  display: 'swap',
  src: [
    { path: '../assets/fonts/Geist-Variable.woff2', weight: '100 900', style: 'normal' },
  ],
});

const geistMono = localFont({
  variable: '--font-geist-mono',
  display: 'swap',
  src: [
    { path: '../assets/fonts/GeistMono-Variable.woff2', weight: '100 900', style: 'normal' },
  ],
});

export const metadata: Metadata = {
  title: 'Running Tracker',
  description: 'Suivi d’entraînements running moderne et sécurisé',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased scrollbar-custom`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
