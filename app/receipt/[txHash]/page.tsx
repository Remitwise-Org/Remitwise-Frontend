import { Metadata } from "next";
import Link from "next/link";
import {
  fetchTransactionReceipt,
  isValidTxHash,
} from "@/lib/remittance/horizon";
import { RECEIPT_SEO, SITE_URL } from "@/lib/config/seo";
import ReceiptPageContent from "@/components/ReceiptPageContent";
import type { ReceiptData } from "@/lib/remittance/horizon";

type Props = {
  params: Promise<{ txHash: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { txHash } = await params;
  const isValid = isValidTxHash(txHash);
  const title = isValid
    ? `Receipt ${txHash.substring(0, 8)}… | RemitWise`
    : RECEIPT_SEO.titlePrefix;
  const description = isValid
    ? `View receipt for transaction ${txHash.substring(0, 8)}… on RemitWise.`
    : RECEIPT_SEO.description;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${SITE_URL}/receipt/${txHash}`,
      siteName: "RemitWise",
      images: [
        {
          url: `${SITE_URL}${RECEIPT_SEO.ogImagePath}`,
          width: 1200,
          height: 630,
          alt: "Transaction Receipt",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: RECEIPT_SEO.twitterHandle,
      title,
      description,
      images: [`${SITE_URL}${RECEIPT_SEO.ogImagePath}`],
    },
  };
}

export default async function ReceiptPage({ params }: Props) {
  const { txHash } = await params;
  let receiptData: ReceiptData | null = null;
  let notFound = false;

  if (isValidTxHash(txHash)) {
    try {
      receiptData = await fetchTransactionReceipt(txHash);
      if (!receiptData) {
        notFound = true;
      }
    } catch {
      notFound = true;
    }
  } else {
    notFound = true;
  }

  return (
    <main className="min-h-screen bg-[#010101]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            ← Back to Home
          </Link>
        </nav>

        <ReceiptPageContent
          txHash={txHash}
          receiptData={receiptData}
          notFound={notFound}
        />
      </div>
    </main>
  );
}
