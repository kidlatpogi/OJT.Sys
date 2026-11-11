import type { Metadata, Viewport } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
});

const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-roboto-mono',
  display: 'swap',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
    ? process.env.NEXT_PUBLIC_SITE_URL
    : 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'OJT.SYS | Internship Attendance & Report Tracker',
    template: '%s | OJT.SYS',
  },
  description:
    'Mobile-first OJT time tracker, smart task checklist, automated past-tense accomplishment summarizer, and 1:1 DOCX & PDF report generator.',
  keywords: [
    'OJT tracker',
    'internship attendance',
    'weekly accomplishment report',
    'monthly accomplishment report',
    'OJT.SYS',
  ],
  authors: [{ name: 'OJT.SYS' }],
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'OJT.SYS',
    title: 'OJT.SYS | Internship Attendance & Report Tracker',
    description:
      'Mobile-first OJT punch clock, automated past-tense accomplishments, and 1:1 DOCX & PDF reports.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OJT.SYS | Internship Attendance & Report Tracker',
    description:
      'Mobile-first OJT punch clock, automated past-tense accomplishments, and 1:1 DOCX & PDF reports.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OJT.SYS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f8f8f8',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable} scroll-smooth`}>
      <head>
        <link
          rel="preload"
          href="/fonts/Array-Semibold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/ClashDisplay-Semibold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-[100dvh] bg-[#f8f8f8] text-black font-sans antialiased selection:bg-[#C44900]/20 selection:text-black">
        {children}
      </body>
    </html>
  );
}
