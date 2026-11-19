import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'T1D India - Diabetes Management for Indian Diets',
    template: '%s | T1D India',
  },
  description: 'Evidence-based hypoglycemia risk forecasting and ICMR-NIN carbohydrate counter for Type 1 Diabetes in India. Tailored for Indian meals, insulin regimens, and lifestyles.',
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
    description: 'Evidence-based hypoglycemia risk forecasting and ICMR-NIN carbohydrate counting for Type 1 Diabetes in India.',
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
    description: 'Clinical diabetes management for Indian T1D diets',
    images: ['/og-image.png'],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#2A3F8F',
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
    <html lang="en-IN" className="antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-[#FAF4E8] text-[#231F2B] dark:bg-[#16131C] dark:text-[#F3EEE4] font-sans antialiased selection:bg-[#E0527F]/20 selection:text-[#231F2B]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}