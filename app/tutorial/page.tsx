"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import TutorialList from "../../components/tutorials/TutorialList";
import PageHeadingLink from "@/components/PageHeadingLink";
import { useSeo } from "@/lib/hooks/useSeo";
import { TUTORIALS } from "@/lib/tutorials";

export default function TutorialPage() {
  useSeo({
    title: "Tutorials | RemitWise",
    description: "Learn how to use RemitWise with step-by-step tutorials for sending money, managing wallets, savings goals, and more.",
  });

  return (
    <div className="min-h-screen bg-bg1">
      {/* Header */}
      <header className="bg-transparent shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="text-foreground hover:text-muted"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <PageHeadingLink
              headingId="tutorials-page-heading"
              label="Tutorials"
              headingClassName="text-2xl font-bold text-foreground"
              buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/15 text-current/70 transition-colors hover:bg-current/10 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
            >
              Tutorials
            </PageHeadingLink>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Learn How to Use RemitWise
          </h2>
          <p className="text-muted">
            Watch our step-by-step tutorials to get the most out of RemitWise
          </p>
        </div>

        <TutorialList tutorials={TUTORIALS} />

        <div className="mt-12 bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-8 border border-border">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-brand-red rounded-full">
              <BookOpen className="w-8 h-8 text-foreground" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Need More Help?
              </h3>
              <p className="text-muted mb-4">
                Visit our help center for detailed guides, FAQs, and support
                resources.
              </p>
              <Link
                href="/dashboard"
                className="inline-block px-6 py-3 bg-brand-red hover:bg-red-700 text-foreground font-semibold rounded-lg transition-colors duration-200"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
