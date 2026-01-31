"use client"

import { useState, useEffect } from "react"
import { ChevronDown, Info, Zap } from "lucide-react"

interface AmountCurrencySectionProps {
  onPreview?: () => void
  onSend?: (amount: number, currency: string) => void
}

export default function AmountCurrencySection({ onPreview, onSend }: AmountCurrencySectionProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const [amount, setAmount] = useState<string>("")
  const [currency, setCurrency] = useState<string>("USDC")
  const [error, setError] = useState<string>("")

  // Currency conversion rates (can be replaced with API data)
  const conversionRates: Record<string, number> = {
    USDC: 1.0,
    XLM: 0.28,
    EUR: 0.92,
  }

  const currencies = ["USDC", "XLM", "EUR"]

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

  const handlePreview = () => {
    if (!amount || error) return
    onPreview?.()
  }

  const handleSend = () => {
    if (!amount || error) return
    onSend?.(parseFloat(amount), currency)
  }

  const isValid =
    amount !== "" &&
    !error &&
    !isNaN(parseFloat(amount)) &&
    parseFloat(amount) >= 1 &&
    parseFloat(amount) <= 10000

  return (
    <div className="mx-auto bg-black rounded-2xl">
      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount Card */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Gradient Glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-900/20 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none z-0" />

          {/* Card Content */}
          <div className="relative z-10 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
            <label className="text-sm font-medium mb-3 block">
              Amount (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
              <input
                type="text"
                value={amount}
                onChange={handleAmountChange}
                onBlur={handleAmountChange}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl pl-8 pr-4 py-3.5 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-2">Min: $1, Max: $10,000</p>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
          </div>
        </div>

        {/* Currency Card */}
        <div className="relative overflow-hidden rounded-2xl">
          {/* Gradient Glow */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-900/20 blur-[120px] rounded-full -mr-24 -mt-24 pointer-events-none z-0" />

          {/* Card Content */}
          <div className="relative z-10 bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
            <label className="text-sm font-medium mb-3 block">Currency</label>
            <div className="relative">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:border-zinc-600 transition-colors appearance-none text-zinc-400"
              >
                {currencies.map((c) => (
                  <option key={c} value={c} className="bg-zinc-900 text-white">
                    {c}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {`1 ${currency} = $${(conversionRates[currency] ?? 0).toFixed(2)} USD`}
            </p>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <button
          onClick={handlePreview}
          disabled={!isValid}
          className={`w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-sm font-medium transition-colors border border-zinc-800 flex items-center justify-center gap-2 ${
            isValid ? "opacity-100" : "opacity-60 cursor-not-allowed"
          }`}
          aria-disabled={!isValid}
        >
          <Info className="w-4 h-4" />
          Preview Transaction
        </button>

        <button
          onClick={handleSend}
          disabled={!isValid}
          className={`w-full py-3.5 bg-red-600 hover:bg-red-700 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            isValid ? "opacity-100" : "opacity-60 cursor-not-allowed"
          }`}
          aria-disabled={!isValid}
        >
          <Zap className="w-4 h-4" />
          Send Remittance
        </button>
      </div>
    </div>
  )
}
