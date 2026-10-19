import { describe, it, expect, vi } from "vitest";

// Mock Providers and Google font to avoid loading heavy client side libraries in layout test
vi.mock("@/components/Providers", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("next/font/google", () => ({
  Inter: () => ({ className: "mocked-inter-class" }),
}));

import { DEFAULT_SEO } from "@/lib/config/seo";
import { metadata } from "@/app/layout";

describe("Metadata Configuration - Unit Tests", () => {
  it("should have correct properties in DEFAULT_SEO", () => {
    expect(DEFAULT_SEO.title).toBe("RemitWise - Smart Remittance & Financial Planning");
    expect(DEFAULT_SEO.description).toBe(
      "A remittance app that helps families save, plan, and protect — not just send money."
    );
    expect(DEFAULT_SEO.ogImage).toBe("/og-image.jpg");
    expect(DEFAULT_SEO.imageWidth).toBe(1200);
    expect(DEFAULT_SEO.imageHeight).toBe(630);
    expect(DEFAULT_SEO.twitterCard).toBe("summary_large_image");
    expect(DEFAULT_SEO.appUrl).toBeDefined();
  });

  it("should define openGraph properties correctly in layout metadata", () => {
    expect(metadata.openGraph).toBeDefined();
    expect(metadata.openGraph?.title).toBe(DEFAULT_SEO.title);
    expect(metadata.openGraph?.description).toBe(DEFAULT_SEO.description);
    expect(metadata.openGraph?.url).toBe(DEFAULT_SEO.appUrl);
    expect(metadata.openGraph?.siteName).toBe("RemitWise");
    expect(metadata.openGraph?.locale).toBe("en_US");
    expect(metadata.openGraph?.type).toBe("website");
    expect(metadata.openGraph?.images).toBeDefined();
    
    const ogImages = metadata.openGraph?.images as Array<any>;
    expect(ogImages).toHaveLength(1);
    expect(ogImages[0].url).toBe(DEFAULT_SEO.ogImage);
    expect(ogImages[0].width).toBe(DEFAULT_SEO.imageWidth);
    expect(ogImages[0].height).toBe(DEFAULT_SEO.imageHeight);
    expect(ogImages[0].alt).toBe(DEFAULT_SEO.title);
  });

  it("should define twitter properties correctly in layout metadata", () => {
    expect(metadata.twitter).toBeDefined();
    expect(metadata.twitter?.card).toBe(DEFAULT_SEO.twitterCard);
    expect(metadata.twitter?.title).toBe(DEFAULT_SEO.title);
    expect(metadata.twitter?.description).toBe(DEFAULT_SEO.description);
    expect(metadata.twitter?.images).toBeDefined();
    
    const twitterImages = metadata.twitter?.images as Array<string>;
    expect(twitterImages).toHaveLength(1);
    expect(twitterImages[0]).toBe(DEFAULT_SEO.ogImage);
  });

  it("should define metadataBase as a URL", () => {
    expect(metadata.metadataBase).toBeDefined();
    expect(metadata.metadataBase instanceof URL).toBe(true);
    expect(metadata.metadataBase?.toString()).toContain(DEFAULT_SEO.appUrl);
  });
});
