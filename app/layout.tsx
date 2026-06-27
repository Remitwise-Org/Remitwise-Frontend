import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "@/components/Providers";
import BackToTop from "@/components/BackToTop";
import { DEFAULT_SEO } from "@/lib/config/seo";

// @ts-ignore
const inter = typeof Inter !== 'undefined' ? Inter({ subsets: ["latin"] }) : null;

export const metadata: Metadata = {
  title: DEFAULT_SEO.title,
  description: DEFAULT_SEO.description,
};

const themeScript = `(function(){try{var key='theme-preference';var theme=localStorage.getItem(key);if(theme!=='light'&&theme!=='dark'&&theme!=='system'){theme='system';}var root=document.documentElement;if(theme==='dark'){root.classList.add('dark');root.classList.remove('light');}else if(theme==='light'){root.classList.remove('dark');root.classList.add('light');}else{root.classList.remove('light');var mql=window.matchMedia('(prefers-color-scheme: dark)');root.classList.toggle('dark', mql.matches);} }catch(e){}})();`; 

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = headers().get("x-nonce") || "";

  return (
    <html lang="en">
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="starry-bg min-h-screen font-sans">
        <Providers>{children}</Providers>
        <BackToTop />
      </body>
    </html>
  );
}
