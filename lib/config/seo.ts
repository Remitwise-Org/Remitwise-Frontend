export const DEFAULT_SEO = {
  title: "RemitWise - Smart Remittance & Financial Planning",
  description: "A remittance app that helps families save, plan, and protect — not just send money.",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://remitwise.com",
  ogImage: "/og-image.jpg",
  imageWidth: 1200,
  imageHeight: 630,
  twitterCard: "summary_large_image" as const,
};

export const RECEIPT_SEO = {
  titlePrefix: "Receipt | RemitWise",
  description: "View transaction details and confirmation on RemitWise.",
  ogImagePath: "/logo.svg",
  twitterHandle: "@RemitWise",
} as const;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://remitwise.app";
