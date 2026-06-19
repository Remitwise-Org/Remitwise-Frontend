import React, { useState } from "react";
import { useWallet } from "stellar-wallet-kit";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { useAnchorFlow } from "@/lib/hooks/useAnchorFlow";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";
import type { AnchorFlow, FlowDirection } from "@/lib/anchor/flow-store";
import type { AnchorRate } from "@/lib/anchor/rates-cache";

// ─── i18n strings (en / es) ───────────────────────────────────────────────────

type Lang = "en" | "es";

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    eyebrow: "On/Off-Ramp",
    title: "Fund or Withdraw",
    subtitle: "Move money between your bank and your Stellar wallet via the anchor.",
    step_direction: "Direction",
    step_amount: "Amount",
    step_review: "Review",
    step_confirm: "Confirm",
    direction_title: "Choose direction",
    direction_subtitle: "Do you want to add funds to your wallet or withdraw to your bank?",
    deposit_label: "Deposit",
    deposit_desc: "Add fiat funds to your Stellar wallet via the anchor.",
    withdraw_label: "Withdraw",
    withdraw_desc: "Send stellar assets back to your bank account.",
    label_asset: "Asset",
    label_amount: "Amount",
    label_dest: "Bank account / destination",
    dest_placeholder: "Account number, IBAN, or routing info",
    amount_title: "Enter amount",
    amount_deposit_hint: "How much would you like to deposit into your wallet?",
    amount_withdraw_hint: "How much would you like to withdraw to your bank?",
    review_title: "Review details",
    review_subtitle: "Confirm the details before submitting to the anchor.",
    review_direction: "Direction",
    review_asset: "Asset",
    review_amount: "Amount",
    review_wallet: "Wallet",
    review_dest: "Destination",
    review_est_value: "Est. value",
    review_rate_warning: "Rate status",
    review_rate_stale: "Rates may be outdated — consider refreshing.",
    confirm_title: "Submission status",
    confirm_subtitle: "Your request has been sent to the anchor. Track progress below.",
    back: "Back",
    continue: "Continue",
    confirm: "Confirm & Submit",
    status_idle_title: "Ready to submit",
    status_idle_desc: "Review your details and click Confirm to proceed.",
    status_pending_title: "Submitting to anchor",
    status_pending_desc: "Building the transaction and waiting for anchor confirmation.",
    status_success_title: "Transaction completed",
    status_success_desc: "Your funds have been processed successfully.",
    status_error_title: "Submission failed",
    success_msg: "Your transaction has been completed.",
    start_new: "Start a new transaction",
    integration_note:
      "Anchor transactions are processed via the Stellar SEP-6/SEP-24 protocol. RemitWise does not custody your funds.",
  },
  es: {
    eyebrow: "Entrada/Salida",
    title: "Fondear o Retirar",
    subtitle: "Mueve dinero entre tu banco y tu cartera Stellar a través del anchor.",
    step_direction: "Dirección",
    step_amount: "Monto",
    step_review: "Revisión",
    step_confirm: "Confirmar",
    direction_title: "Elige la dirección",
    direction_subtitle: "¿Quieres agregar fondos a tu cartera o retirar a tu banco?",
    deposit_label: "Depositar",
    deposit_desc: "Agrega fondos fiat a tu cartera Stellar a través del anchor.",
    withdraw_label: "Retirar",
    withdraw_desc: "Envía activos Stellar de vuelta a tu cuenta bancaria.",
    label_asset: "Activo",
    label_amount: "Monto",
    label_dest: "Cuenta bancaria / destino",
    dest_placeholder: "Número de cuenta, IBAN o datos de enrutamiento",
    amount_title: "Ingresa el monto",
    amount_deposit_hint: "¿Cuánto deseas depositar en tu cartera?",
    amount_withdraw_hint: "¿Cuánto deseas retirar a tu banco?",
    review_title: "Revisa los detalles",
    review_subtitle: "Confirma los detalles antes de enviar al anchor.",
    review_direction: "Dirección",
    review_asset: "Activo",
    review_amount: "Monto",
    review_wallet: "Cartera",
    review_dest: "Destino",
    review_est_value: "Valor estimado",
    review_rate_warning: "Estado de la tasa",
    review_rate_stale: "Las tasas pueden estar desactualizadas. Considera refrescarlas.",
    confirm_title: "Estado del envío",
    confirm_subtitle: "Tu solicitud fue enviada al anchor. Sigue el progreso a continuación.",
    back: "Volver",
    continue: "Continuar",
    confirm: "Confirmar y Enviar",
    status_idle_title: "Listo para enviar",
    status_idle_desc: "Revisa los detalles y haz clic en Confirmar para continuar.",
    status_pending_title: "Enviando al anchor",
    status_pending_desc: "Construyendo la transacción y esperando confirmación del anchor.",
    status_success_title: "Transacción completada",
    status_success_desc: "Tus fondos han sido procesados exitosamente.",
    status_error_title: "Error al enviar",
    success_msg: "Tu transacción ha sido completada.",
    start_new: "Iniciar una nueva transacción",
    integration_note:
      "Las transacciones de anchor se procesan mediante el protocolo Stellar SEP-6/SEP-24. RemitWise no custodia tus fondos.",
  },
};

function useLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.slice(0, 2).toLowerCase();
  return lang === "es" ? "es" : "en";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ASSETS = ["USDC", "USDT", "XLM"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(n);

const fmtTs = (ts: number | null) =>
  ts
    ? new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
      }).format(ts)
    : "—";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  steps,
}: {
  current: number;
  steps: string[];
}) {
  return (
    <div
      className="flex items-center gap-0 mb-8"
      role="list"
      aria-label="Progress"
    >
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div
              className="flex flex-col items-center gap-1"
              role="listitem"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? "bg-red-600 text-white"
                    : active
                    ? "bg-red-600/20 border-2 border-red-600 text-red-400"
                    : "bg-zinc-800 text-zinc-500"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  active
                    ? "text-red-400"
                    : done
                    ? "text-white"
                    : "text-zinc-500"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-colors ${
                  done ? "bg-red-600" : "bg-zinc-800"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWallet();
  if (isConnected) return <>{children}</>;
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-600/10 flex items-center justify-center">
        <Wallet className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-white">Connect your wallet</h2>
      <p className="text-sm text-zinc-400 max-w-xs">
        You need a connected Stellar wallet to deposit or withdraw funds through
        the anchor.
      </p>
    </div>
  );
}

function RatesBadge({
  rates,
  rateStale,
  ratesFetchedAt,
  ratesLoading,
  onRefresh,
  asset,
  t,
}: {
  rates: AnchorRate[];
  rateStale: boolean;
  ratesFetchedAt: number | null;
  ratesLoading: boolean;
  onRefresh: () => void;
  asset: string;
  t: (k: string) => string;
}) {
  const rate = rates.find((r) => r.asset === asset);
  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-sm ${
        rateStale
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-2">
        {rateStale && (
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        )}
        <span className="text-zinc-400">
          {rate ? (
            <>
              1 {asset} ≈{" "}
              <span className="text-white font-semibold">
                ${fmt(rate.buy_price)}
              </span>{" "}
              <span className="text-zinc-500">USD</span>
            </>
          ) : (
            <span className="text-zinc-500">Rate unavailable</span>
          )}
        </span>
        <span className="text-zinc-600 text-xs hidden sm:inline">
          · Updated {fmtTs(ratesFetchedAt)}
        </span>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={ratesLoading}
        aria-label="Refresh exchange rates"
        className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition-colors"
      >
        <RefreshCw
          className={`w-3 h-3 ${ratesLoading ? "animate-spin" : ""}`}
        />
        <span className="hidden sm:inline">Refresh</span>
      </button>
    </div>
  );
}

function FlowStatusCard({ flow }: { flow: AnchorFlow | null }) {
  if (!flow) return null;

  const isTerminal = ["completed", "error", "timeout"].includes(flow.status);
  const isSuccess = flow.status === "completed";
  const isError = flow.status === "error" || flow.status === "timeout";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/5"
          : isError
          ? "border-red-500/20 bg-red-500/5"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : isError ? (
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        ) : (
          <Loader2 className="w-5 h-5 text-red-400 animate-spin flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white capitalize">
            {flow.status.replace(/_/g, " ")}
          </p>
          {flow.message && (
            <p className="text-xs text-zinc-400 mt-0.5">{flow.message}</p>
          )}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 hidden sm:inline">
          {flow.direction}
        </span>
      </div>
      {!isTerminal && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Clock className="w-3 h-3" />
          Polling for updates every 3 seconds…
        </div>
      )}
      {flow.more_info_url && (
        <a
          href={flow.more_info_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View on anchor portal
        </a>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * FundPage — multi-step deposit/withdraw flow.
 *
 * Steps: direction → amount → review → confirm (status polling).
 * Wallet gating: renders a connect prompt when wallet is disconnected.
 * Rate staleness: warns the user and shows a refresh affordance.
 * i18n: en / es based on browser locale.
 */
export default function FundPage() {
  const lang = useLang();
  const t = (k: string) => STRINGS[lang][k] ?? STRINGS.en[k] ?? k;

  const { account } = useWallet();
  const walletAddress = account?.address ?? "";

  const {
    rates,
    rateStale,
    ratesFetchedAt,
    ratesLoading,
    refreshRates,
    step,
    setStep,
    submit,
    flow,
    loading,
    error,
    reset,
  } = useAnchorFlow();

  const [direction, setDirection] = useState<FlowDirection>("deposit");
  const [asset, setAsset] = useState("USDC");
  const [amount, setAmount] = useState("");
  const [dest, setDest] = useState("");

  const STEPS = [
    t("step_direction"),
    t("step_amount"),
    t("step_review"),
    t("step_confirm"),
  ];
  const stepIndex: Record<string, number> = {
    direction: 0,
    amount: 1,
    review: 2,
    confirm: 3,
  };

  const selectedRate = rates.find((r) => r.asset === asset);
  const parsedAmount = parseFloat(amount);
  const amountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  const estimatedValue =
    amountValid && selectedRate
      ? direction === "deposit"
        ? parsedAmount * selectedRate.buy_price
        : parsedAmount * selectedRate.sell_price
      : null;

  function handleDirectionNext(d: FlowDirection) {
    setDirection(d);
    setStep("amount");
  }

  function handleAmountNext() {
    if (!amountValid) return;
    setStep("review");
  }

  function handleSubmit() {
    if (!walletAddress || !amountValid) return;
    void submit({
      direction,
      asset,
      amount: parsedAmount,
      walletAddress,
      dest: dest || undefined,
    });
  }

  return (
    <div className="min-h-screen bg-[#030303] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-400 mb-2">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl font-extrabold text-white">{t("title")}</h1>
          <p className="mt-2 text-sm text-zinc-400">{t("subtitle")}</p>
        </div>

        <WalletGate>
          {/* Step indicator */}
          <StepIndicator current={stepIndex[step] ?? 0} steps={STEPS} />

          {/* Rate badge */}
          {rates.length > 0 && step !== "confirm" && (
            <div className="mb-6">
              <RatesBadge
                rates={rates}
                rateStale={rateStale}
                ratesFetchedAt={ratesFetchedAt}
                ratesLoading={ratesLoading}
                onRefresh={refreshRates}
                asset={asset}
                t={t}
              />
            </div>
          )}

          <div className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-8">

            {/* ── Step 1: Direction ──────────────────────────────────────── */}
            {step === "direction" && (
              <fieldset>
                <legend className="sr-only">{t("step_direction")}</legend>
                <h2 className="text-lg font-bold text-white mb-1">
                  {t("direction_title")}
                </h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {t("direction_subtitle")}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {(["deposit", "withdraw"] as FlowDirection[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleDirectionNext(d)}
                      className="group flex flex-col items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-left hover:border-red-500/40 hover:bg-red-500/5 focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all"
                      aria-label={t(
                        d === "deposit" ? "deposit_label" : "withdraw_label"
                      )}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600/10 text-red-500 group-hover:bg-red-600/20 transition-colors">
                        {d === "deposit" ? (
                          <ArrowDownToLine className="w-6 h-6" />
                        ) : (
                          <ArrowUpFromLine className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-white capitalize">
                          {t(
                            d === "deposit"
                              ? "deposit_label"
                              : "withdraw_label"
                          )}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {t(
                            d === "deposit" ? "deposit_desc" : "withdraw_desc"
                          )}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-red-400 ml-auto self-center transition-colors" />
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* ── Step 2: Amount ─────────────────────────────────────────── */}
            {step === "amount" && (
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  {t("amount_title")}
                </h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {direction === "deposit"
                    ? t("amount_deposit_hint")
                    : t("amount_withdraw_hint")}
                </p>

                <div className="space-y-4">
                  {/* Asset selector */}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                      {t("label_asset")}
                    </p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={t("label_asset")}>
                      {ASSETS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => setAsset(a)}
                          aria-pressed={asset === a}
                          className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
                            asset === a
                              ? "border-red-600 bg-red-600/10 text-white"
                              : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20"
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount input */}
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                    >
                      {t("label_amount")}
                    </label>
                    <div className="relative">
                      <input
                        id="amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 pr-20 text-white placeholder-zinc-600 focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none transition-all"
                        aria-describedby="amount-hint"
                      />
                      <span className="absolute right-4 top-3.5 text-sm font-semibold text-zinc-400">
                        {asset}
                      </span>
                    </div>
                    {estimatedValue !== null && (
                      <p
                        id="amount-hint"
                        className="mt-1.5 text-xs text-zinc-500"
                      >
                        ≈{" "}
                        <span className="text-zinc-300">
                          ${fmt(estimatedValue)}
                        </span>{" "}
                        USD
                      </p>
                    )}
                  </div>

                  {/* Destination (withdraw only) */}
                  {direction === "withdraw" && (
                    <div>
                      <label
                        htmlFor="dest"
                        className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2"
                      >
                        {t("label_dest")}
                      </label>
                      <input
                        id="dest"
                        type="text"
                        value={dest}
                        onChange={(e) => setDest(e.target.value)}
                        placeholder={t("dest_placeholder")}
                        className="w-full rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white placeholder-zinc-600 focus:border-transparent focus:ring-2 focus:ring-red-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("direction")}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06] transition-colors"
                  >
                    {t("back")}
                  </button>
                  <button
                    type="button"
                    onClick={handleAmountNext}
                    disabled={!amountValid}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  >
                    {t("continue")}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Review ─────────────────────────────────────────── */}
            {step === "review" && (
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  {t("review_title")}
                </h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {t("review_subtitle")}
                </p>

                <dl className="space-y-3">
                  {(
                    [
                      {
                        label: t("review_direction"),
                        value:
                          direction === "deposit"
                            ? t("deposit_label")
                            : t("withdraw_label"),
                      },
                      { label: t("review_asset"), value: asset },
                      {
                        label: t("review_amount"),
                        value: `${fmt(parsedAmount)} ${asset}`,
                      },
                      {
                        label: t("review_wallet"),
                        value: walletAddress
                          ? `${walletAddress.slice(0, 8)}…${walletAddress.slice(-6)}`
                          : "—",
                      },
                      ...(direction === "withdraw" && dest
                        ? [{ label: t("review_dest"), value: dest }]
                        : []),
                      ...(estimatedValue !== null
                        ? [
                            {
                              label: t("review_est_value"),
                              value: `≈ $${fmt(estimatedValue)} USD`,
                            },
                          ]
                        : []),
                      ...(rateStale
                        ? [
                            {
                              label: t("review_rate_warning"),
                              value: t("review_rate_stale"),
                              warn: true,
                            },
                          ]
                        : []),
                    ] as Array<{ label: string; value: string; warn?: boolean }>
                  ).map(({ label, value, warn }) => (
                    <div
                      key={label}
                      className="flex justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                    >
                      <dt className="text-xs font-medium text-zinc-500">
                        {label}
                      </dt>
                      <dd
                        className={`text-sm font-semibold ${
                          warn ? "text-amber-400" : "text-white"
                        } text-right`}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-6">
                  <AsyncSubmissionStatus
                    idleTitle={t("status_idle_title")}
                    idleDescription={t("status_idle_desc")}
                    pendingTitle={t("status_pending_title")}
                    pendingDescription={t("status_pending_desc")}
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep("amount")}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06] transition-colors"
                  >
                    {t("back")}
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t("confirm")}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 4: Confirm / Status ───────────────────────────────── */}
            {step === "confirm" && (
              <div>
                <h2 className="text-lg font-bold text-white mb-1">
                  {t("confirm_title")}
                </h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {t("confirm_subtitle")}
                </p>

                <AsyncSubmissionStatus
                  pending={loading}
                  error={error ?? undefined}
                  success={
                    flow?.status === "completed" ? t("success_msg") : undefined
                  }
                  idleTitle={t("status_idle_title")}
                  idleDescription={t("status_idle_desc")}
                  pendingTitle={t("status_pending_title")}
                  pendingDescription={t("status_pending_desc")}
                  successTitle={t("status_success_title")}
                  successDescription={t("status_success_desc")}
                  errorTitle={t("status_error_title")}
                />

                <div className="mt-4">
                  <FlowStatusCard flow={flow} />
                </div>

                {(flow?.status === "completed" ||
                  flow?.status === "error" ||
                  flow?.status === "timeout") && (
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-6 w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06] transition-colors"
                  >
                    {t("start_new")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Integration note */}
          <p className="mt-6 text-center text-xs text-zinc-600">
            {t("integration_note")}
          </p>
        </WalletGate>
      </div>
    </div>
  );
}
