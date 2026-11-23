"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRightLeft, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import PageHeadingLink from "@/components/PageHeadingLink";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/config/features";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useSeo } from "@/lib/hooks/useSeo";

interface QuoteResponse {
  sourceAmount: string;
  destinationAmount: string;
  exchangeRate: string;
  minimumReceived: string;
  path: Array<{ code: string; issuer?: string }>;
}

export default function SwapPage() {
  useSeo({ title: "Swap Assets - RemitWise", description: "Exchange digital assets instantly" });

  const swapFlag = FEATURE_FLAGS.find((flag) => flag.key === "SWAP_PAGE");
  const isSwapEnabled = swapFlag ? isFeatureEnabled(swapFlag) : false;

  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [sourceCode, setSourceCode] = useState("XLM");
  const [sourceIssuer, setSourceIssuer] = useState("");
  const [destinationCode, setDestinationCode] = useState("USDC");
  const [destinationIssuer, setDestinationIssuer] = useState("");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState("1");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [building, setBuilding] = useState(false);
  const [unsignedXdr, setUnsignedXdr] = useState("");
  const [buildError, setBuildError] = useState("");

  const debouncedAmount = useDebouncedValue(amount, 350);
  const debouncedSourceCode = useDebouncedValue(sourceCode, 350);
  const debouncedSourceIssuer = useDebouncedValue(sourceIssuer, 350);
  const debouncedDestinationCode = useDebouncedValue(destinationCode, 350);
  const debouncedDestinationIssuer = useDebouncedValue(destinationIssuer, 350);
  const debouncedSlippage = useDebouncedValue(slippage, 350);

  useEffect(() => {
    if (!isSwapEnabled || !debouncedAmount || !debouncedSourceCode || !debouncedDestinationCode) {
      setQuote(null);
      setQuoteError("");
      setLoadingQuote(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      sourceCode: debouncedSourceCode.trim(),
      destinationCode: debouncedDestinationCode.trim(),
      amount: debouncedAmount.trim(),
      slippage: debouncedSlippage,
    });
    if (debouncedSourceIssuer.trim()) params.set("sourceIssuer", debouncedSourceIssuer.trim());
    if (debouncedDestinationIssuer.trim()) params.set("destinationIssuer", debouncedDestinationIssuer.trim());

    setLoadingQuote(true);
    setQuoteError("");
    setUnsignedXdr("");
    fetch(`/api/swap/quote?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to retrieve quote.");
        return data.quote as QuoteResponse;
      })
      .then(setQuote)
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== "AbortError") {
          setQuote(null);
          setQuoteError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingQuote(false);
      });

    return () => controller.abort();
  }, [
    isSwapEnabled,
    debouncedAmount,
    debouncedSourceCode,
    debouncedSourceIssuer,
    debouncedDestinationCode,
    debouncedDestinationIssuer,
    debouncedSlippage,
  ]);

  const handleBuild = async () => {
    setBuilding(true);
    setBuildError("");
    setUnsignedXdr("");
    try {
      const response = await fetch("/api/swap/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAsset: { code: sourceCode.trim(), issuer: sourceIssuer.trim() || undefined },
          destinationAsset: { code: destinationCode.trim(), issuer: destinationIssuer.trim() || undefined },
          amount: amount.trim(),
          slippage: Number(slippage),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to build swap transaction.");
      setUnsignedXdr(data.xdr);
    } catch (error) {
      setBuildError(error instanceof Error ? error.message : "Unable to build swap transaction.");
    } finally {
      setBuilding(false);
    }
  };

  const handleSubscribe = (event: React.FormEvent) => {
    event.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <div className="min-h-screen bg-[#010101] safari-safe-bottom">
      <header className="overflow-x-hidden bg-[#010101] text-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <Link href="/" aria-label="Go back" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[14px] bg-[#1a1a1a] transition-colors hover:bg-[#252525]">
              <ArrowLeft className="h-5 w-5 text-white" />
            </Link>
            <div className="min-w-0">
              <PageHeadingLink
                headingId="swap-heading"
                label="Swap Assets"
                headingClassName="break-words text-xl font-bold text-white sm:text-2xl"
                buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
              >
                Swap Assets
              </PageHeadingLink>
              <p className="mt-0.5 text-sm text-gray-400">Exchange digital assets on Stellar</p>
            </div>
          </div>
        </div>
        <div className="h-px w-full bg-white/[0.08]" aria-hidden />
      </header>

      {!isSwapEnabled ? (
        <main className="mx-auto flex max-w-7xl flex-col items-center justify-center px-5 py-16 text-center sm:px-6 lg:px-8">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-600/10">
            <Sparkles className="h-10 w-10 text-red-400" />
          </div>
          <h1 className="mb-6 text-3xl font-bold tracking-tight text-white sm:text-5xl">Asset Swaps are Coming Soon</h1>
          <p className="mb-12 max-w-2xl text-lg leading-relaxed text-gray-400">
            Swap access is not enabled yet. Join the waitlist to hear when the feature becomes available.
          </p>
          <div className="w-full max-w-md">
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="flex flex-col gap-4 rounded-3xl border border-white/[0.08] bg-[#111] p-6 sm:flex-row">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-base text-white placeholder-gray-500 focus:border-red-500 focus:outline-none"
                />
                <button type="submit" className="flex items-center justify-center rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-600">
                  <Mail className="mr-2 h-4 w-4" /> Notify Me
                </button>
              </form>
            ) : (
              <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 font-medium text-emerald-400">
                Thanks for subscribing! We&apos;ll be in touch.
              </p>
            )}
          </div>
        </main>
      ) : (
        <main className="mx-auto max-w-lg px-5 py-8 sm:px-6">
          <section className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 shadow-2xl sm:p-8">
            <h1 className="mb-6 text-xl font-semibold text-white">Swap assets</h1>
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                <label htmlFor="swap-source-amount" className="mb-3 block text-sm text-gray-400">You pay</label>
                <input
                  id="swap-source-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => { setAmount(event.target.value); setQuote(null); setUnsignedXdr(""); }}
                  placeholder="0.00"
                  className="mb-4 w-full bg-transparent text-3xl font-semibold text-white outline-none"
                />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-gray-400">
                    Asset code
                    <input value={sourceCode} onChange={(event) => { setSourceCode(event.target.value.toUpperCase()); setQuote(null); setUnsignedXdr(""); }} aria-label="Source asset code" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-white" />
                  </label>
                  <label className="text-xs text-gray-400">
                    Issuer (leave blank for XLM)
                    <input value={sourceIssuer} onChange={(event) => { setSourceIssuer(event.target.value); setQuote(null); setUnsignedXdr(""); }} aria-label="Source asset issuer" placeholder="G..." className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-white" />
                  </label>
                </div>
              </div>

              <div className="flex justify-center">
                <button type="button" aria-label="Swap source and destination assets" onClick={() => {
                  setSourceCode(destinationCode); setSourceIssuer(destinationIssuer);
                  setDestinationCode(sourceCode); setDestinationIssuer(sourceIssuer);
                  setQuote(null); setUnsignedXdr("");
                }} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1a1a1a] text-gray-300 hover:text-white">
                  <ArrowRightLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-5">
                <p className="mb-3 text-sm text-gray-400">You receive (estimated)</p>
                <p className="mb-4 text-3xl font-semibold text-white">{quote?.destinationAmount ?? "—"}</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label className="text-xs text-gray-400">
                    Asset code
                    <input value={destinationCode} onChange={(event) => { setDestinationCode(event.target.value.toUpperCase()); setQuote(null); setUnsignedXdr(""); }} aria-label="Destination asset code" className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-white" />
                  </label>
                  <label className="text-xs text-gray-400">
                    Issuer (leave blank for XLM)
                    <input value={destinationIssuer} onChange={(event) => { setDestinationIssuer(event.target.value); setQuote(null); setUnsignedXdr(""); }} aria-label="Destination asset issuer" placeholder="G..." className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 p-2 text-white" />
                  </label>
                </div>
              </div>

              <label className="block text-sm text-gray-400">
                Slippage tolerance
                <select value={slippage} onChange={(event) => { setSlippage(event.target.value); setQuote(null); setUnsignedXdr(""); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#161616] p-3 text-white">
                  <option value="0.5">0.5%</option>
                  <option value="1">1%</option>
                  <option value="2">2%</option>
                  <option value="3">3%</option>
                  <option value="5">5%</option>
                </select>
              </label>
            </div>

            <div aria-live="polite" className="mt-5 space-y-2 text-sm">
              {loadingQuote && <p className="text-gray-400">Finding the best Stellar payment path…</p>}
              {quoteError && <p role="alert" className="text-red-400">{quoteError}</p>}
              {quote && (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-gray-300">
                  <p>Rate: 1 {sourceCode} = {quote.exchangeRate} {destinationCode}</p>
                  <p>Estimated received: {quote.destinationAmount} {destinationCode}</p>
                  <p>Minimum received: {quote.minimumReceived} {destinationCode}</p>
                  <p>Route: {quote.path.length ? quote.path.map((asset) => asset.code).join(" → ") : "Direct"}</p>
                </div>
              )}
            </div>

            <button type="button" onClick={handleBuild} disabled={!quote || loadingQuote || building} className="mt-6 w-full rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-4 text-center text-base font-semibold text-white transition hover:from-red-500 hover:to-red-600 disabled:cursor-not-allowed disabled:opacity-50">
              {building ? "Building unsigned transaction…" : "Prepare unsigned swap"}
            </button>
            {buildError && <p role="alert" className="mt-3 text-sm text-red-400">{buildError}</p>}
            {unsignedXdr && (
              <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                <p className="mb-2 text-sm font-medium text-emerald-400">Unsigned transaction ready</p>
                <p className="mb-2 text-xs text-gray-400">Review and sign this XDR with your Stellar wallet. It has not been submitted.</p>
                <textarea readOnly value={unsignedXdr} aria-label="Unsigned transaction XDR" rows={5} className="w-full break-all rounded-lg border border-white/10 bg-black/40 p-2 text-xs text-gray-200" />
                <button type="button" onClick={() => navigator.clipboard?.writeText(unsignedXdr)} className="mt-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white hover:bg-white/5">Copy XDR</button>
              </div>
            )}
          </section>
        </main>
      )}
    </div>
  );
}
