"use client";

import { useState } from "react";
import { Shield, AlertCircle } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import {
  SectionCard,
  SectionHeader,
  FieldRow,
  Toggle,
} from "./SettingsPrimitives";

export function SecuritySection() {
  const { t } = useClientTranslator();
  const [showAlert, setShowAlert] = useState(false);

  return (
    <SectionCard id="security">
      <SectionHeader
        icon={Shield}
        titleKey="settings.security.title"
        descriptionKey="settings.security.description"
      />
      {showAlert && (
        <div
          role="alert"
          className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3"
        >
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400"
          />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {t("settings.security.two_factor_alert")}
          </p>
          <button
            onClick={() => setShowAlert(false)}
            className="ml-auto text-amber-500 hover:text-amber-700 focus:outline-none"
            aria-label={t("settings.security.dismiss_alert")}
          >
            ×
          </button>
        </div>
      )}
      <div className="mt-4">
        <Toggle
          labelKey="settings.security.two_factor_label"
          descriptionKey="settings.security.two_factor_desc"
        />
        <Toggle
          labelKey="settings.security.login_notifications_label"
          descriptionKey="settings.security.login_notifications_desc"
          defaultChecked
        />
        <Toggle
          labelKey="settings.security.biometric_label"
          descriptionKey="settings.security.biometric_desc"
        />
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        <FieldRow
          labelKey="settings.security.session_timeout_label"
          hintKey="settings.security.session_timeout_hint"
        >
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>{t("settings.security.timeout_15min")}</option>
            <option>{t("settings.security.timeout_30min")}</option>
            <option selected>{t("settings.security.timeout_1hour")}</option>
            <option>{t("settings.security.timeout_4hours")}</option>
            <option>{t("settings.security.timeout_never")}</option>
          </select>
        </FieldRow>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {t("settings.security.rotate_wallet_text")}
        </span>
        <button
          onClick={() => setShowAlert(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
          aria-label={t("settings.security.sign_out_all_label")}
        >
          {t("settings.security.sign_out_all")}
        </button>
      </div>
    </SectionCard>
  );
}
