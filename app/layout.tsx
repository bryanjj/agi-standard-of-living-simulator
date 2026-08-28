import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://common-wealth-agi-simulator.bryan0.chatgpt.site'),
  title: 'Common Wealth — AGI Standard of Living Simulator',
  description: 'Explore how wages, capital ownership, government support, abundance, and scarce costs could shape your material standard of living in an AGI economy.',
  openGraph: {
    title: 'How would AGI change your standard of living?',
    description: 'An exploratory household simulator.',
    type: 'website',
    images: [{ url: '/og.png', width: 1680, height: 945, alt: 'Common Wealth — an exploratory AGI household simulator' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How would AGI change your standard of living?',
    description: 'An exploratory household simulator.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
