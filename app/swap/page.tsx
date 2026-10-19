"use client";

import { useState } from "react";
import { ArrowRightLeft, Mail, Sparkles, Settings, ArrowLeft } from "lucide-react";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/config/features";
import Link from "next/link";
import PageHeadingLink from "@/components/PageHeadingLink";
import { useSeo } from "@/lib/hooks/useSeo";

export default function SwapPage() {
  useSeo({
    title: "Swap Assets - RemitWise",
    description: "Exchange digital assets instantly",
  });

  const swapFlag = FEATURE_FLAGS.find((f) => f.key === "SWAP_PAGE");
  const isSwapEnabled = swapFlag ? isFeatureEnabled(swapFlag) : false;

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
    }
  };

  if (!isSwapEnabled) {
    return (
      <div className="min-h-screen bg-[#010101] safari-safe-bottom">
        <header className="overflow-x-hidden bg-[#010101] text-white tall:sticky tall:top-16 375:tall:top-20 tall:z-40">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
              <Link
                href="/"
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[14px] bg-[#1a1a1a] hover:bg-[#252525] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <div className="min-w-0">
                <PageHeadingLink
                  headingId="swap-heading"
                  label="Swap Assets"
                  headingClassName="break-words text-xl font-bold text-white sm:text-2xl"
                  buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
                >
                  Swap Assets
                </PageHeadingLink>
                <p className="mt-0.5 break-words text-sm text-gray-400">
                  Exchange digital assets instantly
                </p>
              </div>
            </div>
          </div>
          <div className="h-px w-full bg-white/[0.08]" aria-hidden />
        </header>

        <main className="mx-auto max-w-7xl px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 py-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-gradient-to-b from-red-600/20 to-red-900/20 border border-red-500/20 rounded-full flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(220,38,38,0.15)]">
            <Sparkles className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl mb-6">
            Asset Swaps are Coming Soon
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl leading-relaxed mb-12">
            We're building a seamless experience for you to swap between different currencies and assets instantly, with real-time rates and zero hidden fees. Join the waitlist to get early access.
          </p>

          <div className="w-full max-w-md">
            {!subscribed ? (
              <form
                onSubmit={handleSubscribe}
                className="flex flex-col gap-4 sm:flex-row p-6 rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))]"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors"
                />
                <button
                  type="submit"
                  className="flex items-center justify-center rounded-xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:from-red-500 hover:to-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 transition-all touch-target-wide"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Notify Me
                </button>
              </form>
            ) : (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 transition-colors duration-200">
                <p className="text-emerald-400 font-medium flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Thanks for subscribing! We'll be in touch.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010101] safari-safe-bottom">
      <header className="overflow-x-hidden bg-[#010101] text-white tall:sticky tall:top-16 375:tall:top-20 tall:z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Link
              href="/"
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[14px] bg-[#1a1a1a] hover:bg-[#252525] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </Link>
            <div className="min-w-0">
              <PageHeadingLink
                headingId="swap-heading-mock"
                label="Swap Assets"
                headingClassName="break-words text-xl font-bold text-white sm:text-2xl"
                buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
              >
                Swap Assets
              </PageHeadingLink>
              <p className="mt-0.5 break-words text-sm text-gray-400">
                Exchange digital assets instantly
              </p>
            </div>
          </div>
        </div>
        <div className="h-px w-full bg-white/[0.08]" aria-hidden />
      </header>

      <main className="mx-auto max-w-lg px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-semibold text-white">Swap</h2>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2 relative">
            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5 transition-colors hover:bg-white/[0.02]">
              <div className="flex justify-between text-sm text-gray-400 mb-3">
                <span>You pay</span>
                <span>Balance: 1,250.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="0.00"
                  className="bg-transparent text-3xl font-semibold text-white outline-none w-full min-w-0"
                />
                <button className="flex-shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-white transition-colors font-medium">
                  <div className="w-5 h-5 rounded-full bg-blue-500"></div>
                  <span>USDC</span>
                </button>
              </div>
            </div>

            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
              <button className="w-10 h-10 rounded-xl border-[4px] border-[#121212] bg-[#1a1a1a] flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#252525] transition-all hover:scale-105">
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5 transition-colors hover:bg-white/[0.02]">
              <div className="flex justify-between text-sm text-gray-400 mb-3">
                <span>You receive</span>
                <span>Balance: 0.00</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="0.00"
                  className="bg-transparent text-3xl font-semibold text-white outline-none w-full min-w-0"
                />
                <button className="flex-shrink-0 flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 px-4 py-2 rounded-xl text-white transition-colors font-medium">
                  <div className="w-5 h-5 rounded-full bg-gray-500"></div>
                  <span>XLM</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8">
            <button className="touch-target-wide w-full rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-4 text-center text-base font-semibold text-white transition hover:from-red-500 hover:to-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]">
              Review Swap
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
