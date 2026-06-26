"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useToast } from "@/lib/context/ToastContext";
import { useClientTranslator } from "@/lib/i18n/client";
import type { AutosaveState } from "@/lib/hooks/useAutosave";

// ─── Reusable primitives ──────────────────────────────────────────────────────

export function SectionCard({
  children,
  id,
}: {
  children: React.ReactNode;
  id: string;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
    >
      {children}
    </section>
  );
}

export function SectionHeader({
  icon: Icon,
  titleKey,
  descriptionKey,
}: {
  icon: React.ElementType;
  titleKey: string;
  descriptionKey: string;
}) {
  const { t } = useClientTranslator();

  return (
    <div className="flex items-start gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
          {t(titleKey)}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {t(descriptionKey)}
        </p>
      </div>
    </div>
  );
}

export function FieldRow({
  labelKey,
  hintKey,
  children,
}: {
  labelKey: string;
  hintKey?: string;
  children: React.ReactNode;
}) {
  const { t } = useClientTranslator();

  return (
    <div className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-3 sm:items-center border-b border-gray-50 dark:border-gray-800/60 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t(labelKey)}
        </p>
        {hintKey && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {t(hintKey)}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

export function TextInput({
  defaultValue,
  value,
  onChange,
  placeholderKey,
  type = "text",
  disabled,
}: {
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholderKey?: string;
  type?: string;
  disabled?: boolean;
}) {
  const { t } = useClientTranslator();
  const isControlled = value !== undefined;

  return (
    <input
      type={type}
      defaultValue={isControlled ? undefined : defaultValue}
      value={isControlled ? value : undefined}
      onChange={
        isControlled && onChange
          ? (e) => onChange(e.target.value)
          : undefined
      }
      placeholder={placeholderKey ? t(placeholderKey) : undefined}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 transition-colors"
    />
  );
}

export function Toggle({
  labelKey,
  descriptionKey,
  defaultChecked,
  checked,
  onChange,
}: {
  labelKey: string;
  descriptionKey?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (next: boolean) => void;
}) {
  const { t } = useClientTranslator();
  const [uncontrolledOn, setUncontrolledOn] = useState(defaultChecked ?? false);
  const on = checked ?? uncontrolledOn;

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {t(labelKey)}
        </p>
        {descriptionKey && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {t(descriptionKey)}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => {
          const next = !on;
          if (checked !== undefined) onChange?.(next);
          else setUncontrolledOn(next);
        }}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          on ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{t(labelKey)}</span>
      </button>
    </div>
  );
}

export function SaveButton({
  labelKey = "settings.save_changes",
  saveState: externalState,
  onSave,
}: {
  labelKey?: string;
  saveState?: AutosaveState;
  onSave?: () => void;
}) {
  const { t } = useClientTranslator();
  const [internalState, setInternalState] = useState<AutosaveState>("idle");
  const { toast } = useToast();

  const state = externalState ?? internalState;

  const handleClick = () => {
    if (onSave) {
      onSave();
      return;
    }
    setInternalState("saving");
    setTimeout(() => {
      setInternalState("saved");
      toast({
        variant: "success",
        title: t("settings.preferences_saved_title"),
        description: t("settings.preferences_saved_description"),
        duration: 2000,
      });
      setTimeout(() => setInternalState("idle"), 2000);
    }, 800);
  };

  const label = t(labelKey);

  return (
    <div className="flex justify-end px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
      <button
        onClick={handleClick}
        disabled={state === "saving"}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60 transition-colors min-w-[130px] justify-center"
      >
        {state === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "saved" ? (
          <>
            <Check className="h-4 w-4" />
            {label}
          </>
        ) : (
          label
        )}
      </button>
    </div>
  );
}
