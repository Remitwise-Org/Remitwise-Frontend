import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RemitWise - Smart Remittance & Financial Planning",
  description:
    "A remittance app that helps families save, plan, and protect — not just send money.",
};

const themeScript = `(function(){try{var key='theme-preference';var theme=localStorage.getItem(key);if(theme!=='light'&&theme!=='dark'&&theme!=='system'){theme='system';}var root=document.documentElement;if(theme==='dark'){root.classList.add('dark');root.classList.remove('light');}else if(theme==='light'){root.classList.remove('dark');root.classList.add('light');}else{root.classList.remove('light');var mql=window.matchMedia('(prefers-color-scheme: dark)');root.classList.toggle('dark', mql.matches);} }catch(e){}})();`; 

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} starry-bg min-h-screen`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
