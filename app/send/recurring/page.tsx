"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CalendarClock,
  Copy,
  Check,
  Edit2,
  Trash2,
  Play,
  Pause,
  AlertCircle,
  X
} from "lucide-react";
import WidgetEmptyState from "@/components/ui/WidgetEmptyState";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/lib/context/ToastContext";
import { apiClient } from "@/lib/client/apiClient";
import { StrKey } from "@stellar/stellar-sdk";
import type { RecurringRemittance } from "@/utils/types/recurringRemittance.types";

type FormState = {
  mode: "create" | "edit";
  id?: string;
  recipientAddress: string;
  amount: string;
  currency: string;
  frequency: "weekly" | "biweekly" | "monthly";
};

const SUPPORTED_CURRENCIES = ["USDC", "XLM"];

export default function RecurringSchedulesPage() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<RecurringRemittance[]>([]);
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState<FormState | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pausedIds, setPausedIds] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form field error states
  const [errors, setErrors] = useState<{
    recipientAddress?: string;
    amount?: string;
  }>({});

  // Fetch all recurring schedules on mount
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.getJson<RecurringRemittance[]>(
        "/api/remittance/recurring"
      );
      if (data) {
        setSchedules(data);
      }
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Failed to load schedules",
        description: err.message || "An error occurred while loading your schedules.",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load paused state and fetch schedules on mount
  useEffect(() => {
    const saved = localStorage.getItem("paused_remittances");
    if (saved) {
      try {
        setPausedIds(new Set(JSON.parse(saved)));
      } catch {
        // ignore
      }
    }
    fetchSchedules();
  }, [fetchSchedules]);

  // Format truncated public key
  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Copy address to clipboard
  const handleCopyAddress = (id: string, address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({
      variant: "success",
      title: "Address copied",
      description: "Recipient address has been copied to clipboard.",
    });
  };

  // Simulate pause/resume toggle state saved locally
  const togglePause = (id: string) => {
    const next = new Set(pausedIds);
    let isPausedNow = false;
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      isPausedNow = true;
    }
    setPausedIds(next);
    localStorage.setItem("paused_remittances", JSON.stringify(Array.from(next)));
    toast({
      variant: "success",
      title: isPausedNow ? "Schedule paused" : "Schedule resumed",
      description: `The remittance schedule has been ${isPausedNow ? "paused" : "resumed"}.`,
    });
  };

  // Handle schedule deletion request
  const handleDelete = async (id: string) => {
    try {
      const response = await apiClient.delete(`/api/remittance/recurring/${id}`);
      if (response && response.ok) {
        toast({
          variant: "success",
          title: "Schedule deleted",
          description: "The recurring remittance schedule was successfully deleted.",
        });
        setSchedules((prev) => prev.filter((s) => s.id !== id));
        // clean up paused state if necessary
        if (pausedIds.has(id)) {
          const next = new Set(pausedIds);
          next.delete(id);
          setPausedIds(next);
          localStorage.setItem("paused_remittances", JSON.stringify(Array.from(next)));
        }
      } else {
        const errorData = response ? await response.json().catch(() => ({})) : {};
        throw new Error(errorData.error || "Failed to delete schedule");
      }
    } catch (err: any) {
      toast({
        variant: "error",
        title: "Delete failed",
        description: err.message || "An error occurred while deleting the schedule.",
      });
    } finally {
      setDeleteTargetId(null);
    }
  };

  // Dynamic next run calculator
  const getNextRunDate = (frequency: "weekly" | "biweekly" | "monthly"): Date => {
    const date = new Date();
    if (frequency === "weekly") {
      date.setDate(date.getDate() + 7);
    } else if (frequency === "biweekly") {
      date.setDate(date.getDate() + 14);
    } else if (frequency === "monthly") {
      date.setMonth(date.getMonth() + 1);
    }
    return date;
  };

  // Date formatting helper
  const formatDate = (dateInput: Date | string) => {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Form submission validation & API fetch calls
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState) return;

    // Validate fields
    const nextErrors: { recipientAddress?: string; amount?: string } = {};
    if (!formState.recipientAddress) {
      nextErrors.recipientAddress = "Recipient address is required";
    } else if (!StrKey.isValidEd25519PublicKey(formState.recipientAddress)) {
      nextErrors.recipientAddress = "Invalid Stellar recipient address";
    }

    const amtNum = parseFloat(formState.amount);
    if (!formState.amount || isNaN(amtNum) || amtNum <= 0) {
      nextErrors.amount = "Amount must be a positive number";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    try {
      if (formState.mode === "create") {
        const response = await apiClient.post("/api/remittance/recurring", {
          body: JSON.stringify({
            recipientAddress: formState.recipientAddress,
            amount: amtNum,
            currency: formState.currency,
            frequency: formState.frequency,
          }),
        });

        if (response && response.ok) {
          const newSchedule = await response.json();
          setSchedules((prev) => [...prev, newSchedule]);
          toast({
            variant: "success",
            title: "Schedule created",
            description: "New recurring remittance schedule setup successfully.",
          });
          setFormState(null);
        } else {
          const errorData = response ? await response.json().catch(() => ({})) : {};
          throw new Error(errorData.error || "Failed to create schedule");
        }
      } else {
        // Edit mode
        const response = await apiClient.patch(
          `/api/remittance/recurring/${formState.id}`,
          {
            body: JSON.stringify({
              recipientAddress: formState.recipientAddress,
              amount: amtNum,
              currency: formState.currency,
              frequency: formState.frequency,
            }),
          }
        );

        if (response && response.ok) {
          const updatedSchedule = await response.json();
          setSchedules((prev) =>
            prev.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s))
          );
          toast({
            variant: "success",
            title: "Schedule updated",
            description: "The recurring remittance schedule was updated successfully.",
          });
          setFormState(null);
        } else {
          const errorData = response ? await response.json().catch(() => ({})) : {};
          throw new Error(errorData.error || "Failed to update schedule");
        }
      }
    } catch (err: any) {
      toast({
        variant: "error",
        title: formState.mode === "create" ? "Creation failed" : "Update failed",
        description: err.message || "An unexpected error occurred.",
      });
    }
  };

  // Loading skeleton state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#010101] text-white">
        <PageHeader
          title="Recurring Schedules"
          subtitle="Manage recurring remittance transfers"
          ctaLabel="Create Schedule"
        />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="animate-pulse rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 h-56"
              />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#010101] text-white">
      {formState === null ? (
        <>
          <PageHeader
            title="Recurring Schedules"
            subtitle="Manage automated recurring remittance schedules"
            ctaLabel="Create Schedule"
            onCtaClick={() =>
              setFormState({
                mode: "create",
                recipientAddress: "",
                amount: "",
                currency: "USDC",
                frequency: "monthly",
              })
            }
          />

          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            {schedules.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-12">
                <WidgetEmptyState
                  icon={CalendarClock}
                  title="No recurring schedules"
                  description="Create a new schedule to automate your remittance transfers."
                  ctaLabel="Create Schedule"
                  onAction={() =>
                    setFormState({
                      mode: "create",
                      recipientAddress: "",
                      amount: "",
                      currency: "USDC",
                      frequency: "monthly",
                    })
                  }
                />
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {schedules.map((schedule) => {
                  const isPaused = pausedIds.has(schedule.id);
                  const isCopied = copiedId === schedule.id;

                  return (
                    <div
                      key={schedule.id}
                      className={`relative flex flex-col justify-between rounded-2xl border bg-[#0f0f0f] p-6 shadow-sm transition duration-200 ${
                        isPaused ? "border-white/5 opacity-70" : "border-white/10"
                      }`}
                    >
                      <div>
                        {/* Recipient address header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="min-w-0">
                            <span className="text-xs text-white/50 font-medium block">
                              Recipient
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-sm font-semibold tracking-wide text-white truncate max-w-[140px]">
                                {formatAddress(schedule.recipientAddress)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyAddress(
                                    schedule.id,
                                    schedule.recipientAddress
                                  )
                                }
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-red-500"
                                aria-label="Copy recipient address"
                              >
                                {isCopied ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Status and Frequency badges */}
                          <div className="flex flex-col items-end gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                                isPaused
                                  ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                  : "bg-green-500/10 text-green-400 border border-green-500/20"
                              }`}
                            >
                              {isPaused ? "Paused" : "Active"}
                            </span>
                            <span className="rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] uppercase font-semibold text-white/80 tracking-wide">
                              {schedule.frequency}
                            </span>
                          </div>
                        </div>

                        {/* Amount & Currency */}
                        <div className="mb-4">
                          <span className="text-xs text-white/50 font-medium">
                            Transfer Amount
                          </span>
                          <div className="text-2xl font-bold text-white mt-0.5">
                            {schedule.amount.toFixed(2)}{" "}
                            <span className="text-sm font-medium text-white/60">
                              {schedule.currency}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Next run metadata and action buttons */}
                      <div className="mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between text-xs text-white/50 mb-4">
                          <span>Next Run Date</span>
                          <span className="font-medium text-white/80">
                            {new Date(schedule.nextRunAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })}
                          </span>
                        </div>

                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => togglePause(schedule.id)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-white/90 hover:bg-white/10 transition focus:outline-none focus:ring-2 focus:ring-white/20"
                            aria-label={isPaused ? "Resume schedule" : "Pause schedule"}
                          >
                            {isPaused ? (
                              <>
                                <Play className="h-3.5 w-3.5 text-green-500 fill-green-500" />
                                <span>Resume</span>
                              </>
                            ) : (
                              <>
                                <Pause className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                <span>Pause</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setFormState({
                                mode: "edit",
                                id: schedule.id,
                                recipientAddress: schedule.recipientAddress,
                                amount: schedule.amount.toString(),
                                currency: schedule.currency,
                                frequency: schedule.frequency,
                              })
                            }
                            className="inline-flex items-center justify-center p-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-white/20"
                            aria-label="Edit schedule"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTargetId(schedule.id)}
                            className="inline-flex items-center justify-center p-2 rounded-xl bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-red-500"
                            aria-label="Delete schedule"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </>
      ) : (
        <>
          <PageHeader
            title={formState.mode === "create" ? "Create Schedule" : "Edit Schedule"}
            subtitle={
              formState.mode === "create"
                ? "Set up a new automated recurring remittance transfer"
                : "Modify an existing recurring remittance transfer"
            }
            ctaLabel="Go Back"
            onCtaClick={() => setFormState(null)}
          />

          <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
            <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recipient Address */}
                <div>
                  <label
                    htmlFor="recipientAddress"
                    className="block text-sm font-semibold text-white/90"
                  >
                    Recipient Stellar Address
                  </label>
                  <p className="text-xs text-white/50 mt-0.5">
                    The public key (starting with G) of the remittance recipient.
                  </p>
                  <input
                    id="recipientAddress"
                    type="text"
                    value={formState.recipientAddress}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        recipientAddress: e.target.value,
                      })
                    }
                    placeholder="e.g. GDEMOXQ3D5AFX4K7..."
                    className={`mt-2 block w-full rounded-xl bg-white/5 border px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${
                      errors.recipientAddress ? "border-red-500" : "border-white/10"
                    }`}
                  />
                  {errors.recipientAddress && (
                    <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{errors.recipientAddress}</span>
                    </p>
                  )}
                </div>

                {/* Amount and Currency Grid */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Amount Input */}
                  <div className="col-span-2">
                    <label
                      htmlFor="amount"
                      className="block text-sm font-semibold text-white/90"
                    >
                      Transfer Amount
                    </label>
                    <input
                      id="amount"
                      type="number"
                      step="any"
                      min="0.0000001"
                      value={formState.amount}
                      onChange={(e) =>
                        setFormState({ ...formState, amount: e.target.value })
                      }
                      placeholder="0.00"
                      className={`mt-2 block w-full rounded-xl bg-white/5 border px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition ${
                        errors.amount ? "border-red-500" : "border-white/10"
                      }`}
                    />
                    {errors.amount && (
                      <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{errors.amount}</span>
                      </p>
                    )}
                  </div>

                  {/* Currency Selector */}
                  <div>
                    <label
                      htmlFor="currency"
                      className="block text-sm font-semibold text-white/90"
                    >
                      Currency
                    </label>
                    <select
                      id="currency"
                      value={formState.currency}
                      onChange={(e) =>
                        setFormState({ ...formState, currency: e.target.value })
                      }
                      className="mt-2 block w-full rounded-xl bg-[#0f0f0f] border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    >
                      {SUPPORTED_CURRENCIES.map((curr) => (
                        <option key={curr} value={curr}>
                          {curr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Frequency Selector */}
                <div>
                  <span
                    id="frequency-label"
                    className="block text-sm font-semibold text-white/90"
                  >
                    Transfer Frequency
                  </span>
                  <p className="text-xs text-white/50 mt-0.5">
                    Choose how often this transfer should run automatically.
                  </p>
                  <div
                    role="radiogroup"
                    aria-labelledby="frequency-label"
                    className="mt-3 grid grid-cols-3 gap-2"
                  >
                    {(["weekly", "biweekly", "monthly"] as const).map((freq) => {
                      const isSelected = formState.frequency === freq;
                      return (
                        <button
                          key={freq}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => setFormState({ ...formState, frequency: freq })}
                          className={`px-4 py-3 rounded-xl border text-xs font-semibold capitalize transition text-center focus:outline-none focus:ring-2 ${
                            isSelected
                              ? "bg-red-600 border-red-600 text-white focus:ring-red-500"
                              : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 focus:ring-white/20"
                          }`}
                        >
                          {freq}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live "Next Run" Preview Box */}
                <div>
                  <span className="block text-sm font-semibold text-white/90">
                    Schedule Preview
                  </span>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-4 mt-2">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">
                      First Scheduled Run Date
                    </span>
                    <span className="text-sm font-bold text-white mt-1 block">
                      {formatDate(getNextRunDate(formState.frequency))}
                    </span>
                    <span className="text-xs text-white/40 mt-1 block">
                      Subsequent runs will continue automatically every {formState.frequency}.
                    </span>
                  </div>
                </div>

                {/* Form Action Buttons */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setFormState(null)}
                    className="px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {formState.mode === "create" ? "Save Schedule" : "Update Schedule"}
                  </button>
                </div>
              </form>
            </div>
          </main>
        </>
      )}

      {/* Confirmation Dialog Modal */}
      {deleteTargetId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-desc"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-500">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h2
                id="delete-dialog-title"
                className="text-lg font-bold text-white"
              >
                Delete Schedule?
              </h2>
            </div>
            <p id="delete-dialog-desc" className="mt-3 text-sm text-gray-400">
              Are you sure you want to delete this recurring remittance schedule? This will permanently cancel all future automatic transfers under this schedule.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteTargetId)}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
