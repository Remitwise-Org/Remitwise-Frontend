export const DEFAULT_SEO = {
  title: "RemitWise - Smart Remittance & Financial Planning",
  description: "A remittance app that helps families save, plan, and protect — not just send money.",
};

export const RECEIPT_SEO = {
  titlePrefix: "Receipt | RemitWise",
  description: "View transaction details and confirmation on RemitWise.",
  ogImagePath: "/logo.svg",
  twitterHandle: "@RemitWise",
} as const;

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://remitwise.app";
