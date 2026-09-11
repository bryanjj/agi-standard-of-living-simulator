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
  title: 'Common Wealth: Economic Scenarios for Transformative AI',
  description: 'An independent open-source reconstruction of the economic framework developed by Korinek, Jones, Sacher, Cotter, and McCrory.',
  openGraph: {
    title: 'Economic Scenarios for Transformative AI',
    description: 'Explore how AI could reshape growth, wages, jobs, and the division of national income through 2030 and beyond.',
    type: 'website',
    images: [{ url: '/og.png', width: 1680, height: 945, alt: 'Common Wealth economic scenarios for transformative AI' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Economic Scenarios for Transformative AI',
    description: 'Explore how AI could reshape growth, wages, jobs, and the division of national income through 2030 and beyond.',
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
