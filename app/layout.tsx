import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "@/components/Providers";
import BackToTop from "@/components/BackToTop";
import ScrollRestoration from "@/components/ScrollRestoration";
import { DEFAULT_SEO } from "@/lib/config/seo";
import { getDefaultThemePreference } from "@/lib/config/theme";

// @ts-ignore
const inter = typeof Inter !== 'undefined' ? Inter({ subsets: ["latin"] }) : null;

export const metadata: Metadata = {
  metadataBase: new URL(DEFAULT_SEO.appUrl),
  title: DEFAULT_SEO.title,
  description: DEFAULT_SEO.description,
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  openGraph: {
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    url: DEFAULT_SEO.appUrl,
    siteName: "RemitWise",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: DEFAULT_SEO.ogImage,
        width: DEFAULT_SEO.imageWidth,
        height: DEFAULT_SEO.imageHeight,
        alt: DEFAULT_SEO.title,
      },
    ],
  },
  twitter: {
    card: DEFAULT_SEO.twitterCard,
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    images: [DEFAULT_SEO.ogImage],
  },
};

// `viewportFit: "cover"` is required for `env(safe-area-inset-*)` to resolve
// to real device values on iOS Safari; without it every inset reads as 0.
export const viewport: Viewport = {
  viewportFit: "cover",
};

// Mirrors ThemeContext's `applyThemePreference` -- see docs/THEMING.md's
// "Theme-Switching Architecture" section for why this is duplicated as an
// inline script rather than imported. The default (used when no stored
// preference exists yet) is baked in from NEXT_PUBLIC_DEFAULT_THEME at
// build time via getDefaultThemePreference(), so it stays in sync with the
// same env var ThemeContext falls back to.
const themeScript = `(function(){try{var key='theme-preference';var theme=localStorage.getItem(key);if(theme!=='light'&&theme!=='dark'&&theme!=='system'){theme='${getDefaultThemePreference()}';}var root=document.documentElement;if(theme==='dark'){root.classList.add('dark');root.classList.remove('light');}else if(theme==='light'){root.classList.remove('dark');root.classList.add('light');}else{root.classList.remove('light');var mql=window.matchMedia('(prefers-color-scheme: dark)');root.classList.toggle('dark', mql.matches);} }catch(e){}})();`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || "";

  return (
    <html lang="en">
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="starry-bg min-h-screen font-sans">
        <Providers>{children}</Providers>
        <ScrollRestoration />
        <BackToTop />
      </body>
    </html>
  );
}
