"use client"

import { useState } from "react"
import { ChevronDown, RefreshCw } from "lucide-react"
import { useExchangeRates } from "@/lib/context/RatesContext"
import { useClientTranslator } from "@/lib/i18n/client"

interface AmountCurrencySectionProps {
  onReview?: (amount: number, currency: string) => void
  onBack?: () => void
}

export default function AmountCurrencySection({ onReview, onBack }: AmountCurrencySectionProps) {
  const [amount, setAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("USDC")
  const [error, setError] = useState<string>("")

  const { rates, loading, stale, error: ratesError, refresh } = useExchangeRates()
  const { t } = useClientTranslator()

  // Build conversion map from live rates (sell USD, buy asset)
  const conversionRates: Record<string, number> = { USDC: 1.0 }
  for (const r of rates) {
    if (r.sell_asset === "USD" || r.sell_asset === "USDC") {
      conversionRates[r.buy_asset] = parseFloat(r.price)
    }
  }

  // Supported currencies: USDC always first, plus anything in the rates
  const currencies = ["USDC", ...Object.keys(conversionRates).filter((c) => c !== "USDC")]

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAmount(value)
    setError("")

    if (value === "") return

    const numValue = parseFloat(value)
    if (isNaN(numValue)) {
      setError("Please enter a valid amount")
    } else if (numValue < 1) {
      setError("Minimum amount is $1")
    } else if (numValue > 10000) {
      setError("Maximum amount is $10,000")
    }
  }

  const handleReview = () => {
    if (!amount || error) return
    onReview?.(parseFloat(amount), currency)
  }

  const isValid =
    amount !== "" &&
    !error &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) >= 1 &&
    parseFloat(amount) <= 10000

  const rate = conversionRates[currency] ?? 0

  return (
    <div className="mx-auto bg-black rounded-2xl">
      {/* Rates status bar */}
      {(ratesError || stale) && (
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs text-amber-400">
            {ratesError ? t("rates.error") : t("rates.stale")}
          </p>
          <button
            onClick={refresh}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white transition-colors"
            aria-label={t("rates.refresh")}
          >
            <RefreshCw className="w-3 h-3" />
            {t("rates.refresh")}
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Amount Card */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-900/20 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none z-0" />
          <div className="relative z-10 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 ">
            <label className="text-sm font-medium mb-3 block text-white">
              Amount (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                onBlur={handleAmountChange}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-8 pr-4 py-3.5 text-lg text-white focus:outline-none focus:border-red-500/50 transition-colors"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Min: $1, Max: $10,000</p>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        </div>

        {/* Currency Card */}
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-900/20 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none z-0" />
          <div className="relative z-10 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
            <label className="text-sm font-medium mb-3 block text-white">Currency</label>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={loading}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-lg focus:outline-none focus:border-red-500/50 transition-colors appearance-none text-white disabled:opacity-60"
              >
                {currencies.map((c) => (
                  <option key={c} value={c} className="bg-zinc-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {loading
                ? t("rates.loading")
                : `1 ${currency} = $${rate.toFixed(2)} USD`}
            </p>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="flex flex-col gap-4 mt-8">
        <button
          onClick={handleReview}
          disabled={!isValid}
          className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed rounded-2xl text-lg font-bold transition-all transform active:scale-[0.98] shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
        >
          Review Transaction
        </button>

        <button
          onClick={onBack}
          className="w-full py-4 bg-transparent hover:bg-white/5 rounded-2xl text-sm font-medium text-zinc-400 transition-colors border border-zinc-800/50"
        >
          Back to Recipient
        </button>
      </div>
    </div>
  )
}
