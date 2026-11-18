import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'T1D India - Diabetes Management for Indian Diets',
    template: '%s | T1D India',
  },
  description: 'AI-powered hypoglycemia prediction and carb-counting tool for Type 1 Diabetes in India. Built for Indian meals, insulin regimens, and lifestyles.',
  keywords: ['diabetes', 'type 1 diabetes', 'T1D', 'hypoglycemia', 'carb counting', 'insulin', 'Indian food', 'health'],
  authors: [{ name: 'T1D India Team' }],
  creator: 'T1D India',
  publisher: 'T1D India',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://app.t1d-india.example.com',
    siteName: 'T1D India',
    title: 'T1D India - Diabetes Management for Indian Diets',
    description: 'AI-powered hypoglycemia prediction and carb-counting for Type 1 Diabetes in India.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'T1D India - Diabetes Management App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'T1D India',
    description: 'AI-powered diabetes management for Indian T1D diets',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-IN" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" media="print" onLoad="this.media='all'" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}