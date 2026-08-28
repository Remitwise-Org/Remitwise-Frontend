import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { PerformanceMonitor } from '@/components/performance-monitor'
import { InstallPrompt } from '@/components/pwa/install-prompt'
import { SW_REGISTRATION_SCRIPT } from '@/lib/pwa/service-worker'
import { MotionConfig } from 'framer-motion'

const _geist = Geist({ subsets: ["latin"], display: "swap", preload: true });
const _geistMono = Geist_Mono({ subsets: ["latin"], display: "swap", preload: true });

export const metadata: Metadata = {
  title: 'MERIDIAN - Where Effort Meets Value',
  description:
    'A productivity-powered on-chain economy platform combining focus, payment streams, and yield opportunities.',
  generator: 'v0.app',
  applicationName: 'MERIDIAN',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'MERIDIAN',
    // The dark status bar matches the PWA splash background.
    statusBarStyle: 'black-translucent',
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://meridian.app',
  ),
  openGraph: {
    title: 'MERIDIAN - Where Effort Meets Value',
    description:
      'Earn by staying focused, stream payments in real-time, and participate in yield pools with zero loss.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MERIDIAN - Where Effort Meets Value',
    description:
      'Earn by staying focused, stream payments in real-time, and participate in yield pools with zero loss.',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fcfcfc' },
    { media: '(prefers-color-scheme: dark)', color: '#161616' },
  ],
  // Standalone installs run edge-to-edge; `globals.css` pads with the safe-area
  // insets so content clears the notch and home indicator.
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className="bg-background"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/*
          Registers the service worker before hydration so a repeat visit is
          served from the cache even if the JS bundle never finishes loading.
          The script defers the actual register() call to window load.
        */}
        <script
          id="meridian-sw-registration"
          dangerouslySetInnerHTML={{ __html: SW_REGISTRATION_SCRIPT }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="meridian-theme"
          themes={['light', 'dark', 'system']}
        >
          <MotionConfig reducedMotion="user">
            {children}
          </MotionConfig>
          <Toaster />
          <InstallPrompt />
          <PerformanceMonitor />
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
