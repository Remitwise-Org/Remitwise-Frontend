"use client";

import { useState, useEffect } from "react";
import { useClientTranslator } from "@/lib/i18n/client";
import { apiClient } from "@/lib/client/apiClient";

export type InsuranceReminder = {
  policyId: string;
  name: string;
  nextPaymentDate: string;
  monthlyPremium: number;
};

export function InsuranceReminderPreview() {
  const { t } = useClientTranslator();
  const [status, setStatus] = useState<
    "loading" | "loaded" | "empty" | "unauthorized" | "error"
  >("loading");
  const [reminders, setReminders] = useState<InsuranceReminder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadReminders() {
      try {
        const response = await apiClient.get("/api/insurance/reminders");
        if (!response) return; // Handled by session expiry flow

        if (!active) return;

        if (response.status === 401 || response.status === 403) {
          setStatus("unauthorized");
          setError(t("settings.insurance_reminders.unauthorized_error"));
          return;
        }

        if (!response.ok) {
          const body = await response.text();
          throw new Error(body || response.statusText);
        }

        const data = (await response.json()) as InsuranceReminder[];
        if (!active) return;

        setReminders(data);
        setStatus(data.length > 0 ? "loaded" : "empty");
      } catch (err) {
        if (!active) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    loadReminders();
    return () => {
      active = false;
    };
  }, [t]);

  const statusTextMap = {
    loading: t("settings.insurance_reminders.loading"),
    empty: t("settings.insurance_reminders.empty"),
    loaded: t("settings.insurance_reminders.loaded", { count: reminders.length }),
    unauthorized: t("settings.insurance_reminders.unauthorized"),
    error: t("settings.insurance_reminders.error"),
  };

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {t("settings.insurance_reminders.title")}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {t("settings.insurance_reminders.description")}
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400" aria-live="polite">
          {statusTextMap[status]}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {status === "loaded" &&
          reminders.map((reminder) => (
            <div
              key={reminder.policyId}
              className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {reminder.name}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t("settings.insurance_reminders.due_date", {
                    date: new Date(reminder.nextPaymentDate).toLocaleDateString(),
                  })}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("settings.insurance_reminders.premium", {
                  amount: reminder.monthlyPremium.toFixed(2),
                })}
              </p>
            </div>
          ))}
        {status === "unauthorized" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? t("settings.insurance_reminders.default_error")}
          </p>
        )}
      </div>
    </div>
  );
}
