"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { Globe, Moon, Sun, Smartphone } from "lucide-react";
import { useDensity } from "@/lib/context/DensityContext";
import { useTheme } from "@/lib/context/ThemeContext";
import { useClientTranslator } from "@/lib/i18n/client";
import { useAutosave } from "@/lib/hooks/useAutosave";
import {
  SectionCard,
  SectionHeader,
  FieldRow,
  SaveButton,
} from "./SettingsPrimitives";
import {
  getStoredMotionPreference,
  setStoredMotionPreference,
} from "@/lib/hooks/usePrefersReducedMotion";

export function PreferencesSection() {
  const { t } = useClientTranslator();
  const { density, setDensity } = useDensity();
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const [language, setLanguage] = useState("en-US");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  const themes = [
    { id: "system" as const, labelKey: "settings.preferences.theme_system", Icon: Smartphone },
    { id: "light" as const, labelKey: "settings.preferences.theme_light", Icon: Sun },
    { id: "dark" as const, labelKey: "settings.preferences.theme_dark", Icon: Moon },
  ];
  const densityOptions = [
    { id: "comfortable" as const, labelKey: "settings.preferences.density_comfortable" },
    { id: "compact" as const, labelKey: "settings.preferences.density_compact" },
  ];

  const onSave = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, []);

  const { saveState, triggerSave } = useAutosave(onSave);

  const handleThemeChange = (id: "system" | "light" | "dark") => {
    setTheme(id);
    triggerSave();
  };

  const handleLanguageChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
    triggerSave();
  };

  const handleTimezoneChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setTimezone(e.target.value);
    triggerSave();
  };

  const handleDateFormatChange = (fmt: string) => {
    setDateFormat(fmt);
    triggerSave();
  };

  return (
    <SectionCard id="preferences">
      <SectionHeader
        icon={Globe}
        titleKey="settings.preferences.title"
        descriptionKey="settings.preferences.description"
      />
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        <FieldRow labelKey="settings.preferences.appearance_label">
          <div className="flex gap-2">
            {themes.map(({ id, labelKey, Icon }) => (
              <button
                key={id}
                onClick={() => handleThemeChange(id)}
                aria-pressed={theme === id}
                aria-label={t(labelKey)}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  theme === id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </FieldRow>
        <FieldRow
          labelKey="settings.preferences.display_density_label"
          hintKey="settings.preferences.display_density_hint"
        >
          <div className="flex gap-2">
            {densityOptions.map(({ id, labelKey }) => (
              <button
                key={id}
                onClick={() => setDensity(id)}
                aria-pressed={density === id}
                aria-label={t(labelKey)}
                className={`flex flex-1 items-center justify-center rounded-lg border py-2 px-3 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  density === id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </FieldRow>
        <FieldRow labelKey="settings.preferences.language_label">
          <select
            value={language}
            onChange={handleLanguageChange}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <option value="en-US">{t("settings.preferences.language_english_us")}</option>
            <option value="en-GB">{t("settings.preferences.language_english_uk")}</option>
            <option value="fr">{t("settings.preferences.language_french")}</option>
            <option value="es">{t("settings.preferences.language_spanish")}</option>
            <option value="pt">{t("settings.preferences.language_portuguese")}</option>
          </select>
        </FieldRow>
        <FieldRow labelKey="settings.preferences.timezone_label">
          <select
            value={timezone}
            onChange={handleTimezoneChange}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <option value="Africa/Lagos">{t("settings.preferences.timezone_lagos")}</option>
            <option value="Africa/Accra">{t("settings.preferences.timezone_accra")}</option>
            <option value="Africa/Nairobi">{t("settings.preferences.timezone_nairobi")}</option>
            <option value="America/New_York">{t("settings.preferences.timezone_newyork")}</option>
            <option value="Europe/London">{t("settings.preferences.timezone_london")}</option>
          </select>
        </FieldRow>
        <FieldRow labelKey="settings.preferences.date_format_label">
          <div className="flex gap-3 flex-wrap">
            {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((fmt) => (
              <label key={fmt} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="dateFormat"
                  value={fmt}
                  checked={dateFormat === fmt}
                  onChange={() => handleDateFormatChange(fmt)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {fmt}
                </span>
              </label>
            ))}
          </div>
        </FieldRow>
        <FieldRow labelKey="settings.preferences.motion_label">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMotionPref("system");
                setStoredMotionPreference("system");
              }}
              aria-pressed={motionPref === "system"}
              className={`flex-1 rounded-lg border py-2 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                motionPref === "system" ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
              }`}
            >
              Use system preference
            </button>
            <button
              type="button"
              onClick={() => {
                setMotionPref("reduced");
                setStoredMotionPreference("reduced");
              }}
              aria-pressed={motionPref === "reduced"}
              className={`flex-1 rounded-lg border py-2 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                motionPref === "reduced" ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
              }`}
            >
              Prefer reduced motion
            </button>
            <button
              type="button"
              onClick={() => {
                setMotionPref("no-preference");
                setStoredMotionPreference("no-preference");
              }}
              aria-pressed={motionPref === "no-preference"}
              className={`flex-1 rounded-lg border py-2 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                motionPref === "no-preference" ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
              }`}
            >
              Always enable animations
            </button>
          </div>
        </FieldRow>
        <FieldRow labelKey="settings.preferences.display_density_label">
          <select
            value={density}
            onChange={(e) =>
              setDensity(e.target.value as "comfortable" | "compact")
            }
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <option value="comfortable">{t("settings.preferences.density_comfortable")}</option>
            <option value="compact">{t("settings.preferences.density_compact")}</option>
          </select>
        </FieldRow>
      </div>
      <SaveButton labelKey="settings.save_changes" saveState={saveState} />
    </SectionCard>
  );
}
