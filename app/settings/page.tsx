"use client";

import { useState, useEffect, useRef } from "react";
import {
  User,
  Bell,
  Shield,
  Wallet,
  Users,
  Globe,
  ChevronRight,
  Check,
  AlertCircle,
  Moon,
  Sun,
  Smartphone,
} from "lucide-react";
import { useDensity } from "@/lib/context/DensityContext";
import { useToast } from "@/lib/context/ToastContext";
import { useClientTranslator } from '@/lib/i18n/client'
import { apiClient } from "@/lib/client/apiClient";

const SECTIONS = [
  { id: "profile",        labelKey: "settings.sections.profile",         icon: User    },
  { id: "notifications",  labelKey: "settings.sections.notifications",   icon: Bell    },
  { id: "security",       labelKey: "settings.sections.security",        icon: Shield  },
  { id: "wallet",         labelKey: "settings.sections.wallet",          icon: Wallet  },
  { id: "family",         labelKey: "settings.sections.family",          icon: Users   },
  { id: "preferences",    labelKey: "settings.sections.preferences",     icon: Globe   },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Reusable primitives ──────────────────────────────────────────────────────

function SectionCard({
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

function SectionHeader({
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

function FieldRow({
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

function TextInput({
  defaultValue,
  placeholderKey,
  type = "text",
  disabled,
}: {
  defaultValue?: string;
  placeholderKey?: string;
  type?: string;
  disabled?: boolean;
}) {
  const { t } = useClientTranslator();
  
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholderKey ? t(placeholderKey) : undefined}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 transition-colors"
    />
  );
}

function Toggle({
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

function SaveButton({ labelKey = "settings.save_changes" }: { labelKey?: string }) {
  const { t } = useClientTranslator();
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const { toast } = useToast();

  const handleClick = () => {
    setState("saving");
    setTimeout(() => {
      setState("saved");
      toast({
        variant: "success",
        title: t("settings.preferences_saved_title"),
        description: t("settings.preferences_saved_description"),
        duration: 2000,
      });
      setTimeout(() => setState("idle"), 2000);
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
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
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

type InsuranceReminder = {
  policyId: string;
  name: string;
  nextPaymentDate: string;
  monthlyPremium: number;
};

function InsuranceReminderPreview() {
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
                    date: new Date(reminder.nextPaymentDate).toLocaleDateString() 
                  })}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("settings.insurance_reminders.premium", { 
                  amount: reminder.monthlyPremium.toFixed(2) 
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

// ─── Sections ────────────────────────────────────────────────────────────────

function ProfileSection() {
  const { t } = useClientTranslator();
  
  return (
    <SectionCard id="profile">
      <SectionHeader
        icon={User}
        titleKey="settings.profile.title"
        descriptionKey="settings.profile.description"
      />
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {/* Avatar row */}
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-lg font-semibold select-none">
            AO
          </div>
          <div>
            <button 
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus-visible:underline transition-colors"
              aria-label={t("settings.profile.change_avatar_label")}
            >
              {t("settings.profile.change_avatar")}
            </button>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              {t("settings.profile.avatar_requirements")}
            </p>
          </div>
        </div>
        <FieldRow 
          labelKey="settings.profile.full_name_label"
          hintKey="settings.profile.full_name_hint"
        >
          <TextInput 
            defaultValue="Amara Osei" 
            placeholderKey="settings.profile.full_name_placeholder" 
          />
        </FieldRow>
        <FieldRow 
          labelKey="settings.profile.email_label"
          hintKey="settings.profile.email_hint"
        >
          <TextInput
            type="email"
            defaultValue="amara@example.com"
            placeholderKey="settings.profile.email_placeholder"
          />
        </FieldRow>
        <FieldRow 
          labelKey="settings.profile.phone_label"
          hintKey="settings.profile.phone_hint"
        >
          <TextInput
            type="tel"
            defaultValue="+234 801 234 5678"
            placeholderKey="settings.profile.phone_placeholder"
          />
        </FieldRow>
        <FieldRow 
          labelKey="settings.profile.stellar_key_label"
          hintKey="settings.profile.stellar_key_hint"
        >
          <TextInput
            defaultValue="GBQWY...K3PT"
            disabled
          />
        </FieldRow>
      </div>
      <SaveButton labelKey="settings.save_changes" />
    </SectionCard>
  );
}

function NotificationsSection() {
  const { t } = useClientTranslator();
  
  return (
    <SectionCard id="notifications">
      <SectionHeader
        icon={Bell}
        titleKey="settings.notifications.title"
        descriptionKey="settings.notifications.description"
      />
      <div>
        <p className="px-6 pt-4 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("settings.notifications.remittances_section")}
        </p>
        <Toggle
          labelKey="settings.notifications.transfer_confirmed"
          descriptionKey="settings.notifications.transfer_confirmed_desc"
          defaultChecked
        />
        <Toggle
          labelKey="settings.notifications.transfer_failed"
          descriptionKey="settings.notifications.transfer_failed_desc"
          defaultChecked
        />
        <Toggle
          labelKey="settings.notifications.exchange_rate_alert"
          descriptionKey="settings.notifications.exchange_rate_alert_desc"
        />
        <p className="px-6 pt-5 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("settings.notifications.bills_section")}
        </p>
        <Toggle
          labelKey="settings.notifications.bill_due_reminder"
          descriptionKey="settings.notifications.bill_due_reminder_desc"
          defaultChecked
        />
        <Toggle
          labelKey="settings.notifications.goal_milestone"
          descriptionKey="settings.notifications.goal_milestone_desc"
          defaultChecked
        />
        <Toggle
          labelKey="settings.notifications.insurance_premium_reminders"
          descriptionKey="settings.notifications.insurance_premium_reminders_desc"
          defaultChecked
        />
        <InsuranceReminderPreview />
        <p className="px-6 pt-5 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("settings.notifications.channels_section")}
        </p>
        <Toggle labelKey="settings.notifications.email_channel" defaultChecked />
        <Toggle labelKey="settings.notifications.push_channel" defaultChecked />
        <Toggle labelKey="settings.notifications.sms_channel" />
      </div>
      <SaveButton labelKey="settings.save_changes" />
    </SectionCard>
  );
}

function SecuritySection() {
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

function WalletSection() {
  const { t } = useClientTranslator();
  
  return (
    <SectionCard id="wallet">
      <SectionHeader
        icon={Wallet}
        titleKey="settings.wallet.title"
        descriptionKey="settings.wallet.description"
      />
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        <FieldRow 
          labelKey="settings.wallet.network_label"
          hintKey="settings.wallet.network_hint"
        >
          <div className="flex gap-3">
            {[t("settings.wallet.testnet"), t("settings.wallet.mainnet")].map((net) => (
              <label
                key={net}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="network"
                  value={net.toLowerCase()}
                  defaultChecked={net === t("settings.wallet.testnet")}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {net}
                </span>
              </label>
            ))}
          </div>
        </FieldRow>
        <FieldRow 
          labelKey="settings.wallet.soroban_rpc_label"
          hintKey="settings.wallet.soroban_rpc_hint"
        >
          <TextInput
            defaultValue="https://soroban-testnet.stellar.org"
            placeholderKey="settings.wallet.soroban_rpc_placeholder"
          />
        </FieldRow>
        <FieldRow labelKey="settings.wallet.auto_split_label">
          <Toggle
            labelKey="settings.wallet.auto_split_toggle"
            descriptionKey="settings.wallet.auto_split_desc"
            defaultChecked
          />
        </FieldRow>
        <FieldRow 
          labelKey="settings.wallet.default_currency_label"
          hintKey="settings.wallet.default_currency_hint"
        >
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>USDC</option>
            <option>XLM</option>
            <option>NGN</option>
            <option>GHS</option>
            <option>KES</option>
          </select>
        </FieldRow>
      </div>
      <SaveButton labelKey="settings.save_changes" />
    </SectionCard>
  );
}

function FamilySection() {
  const { t } = useClientTranslator();
  
  const members = [
    { initials: "AO", name: "Amara Osei", role: "Owner", limit: "—" },
    { initials: "KO", name: "Kwame Osei", role: "Member", limit: "$500 / mo" },
    { initials: "EO", name: "Esi Osei", role: "Viewer", limit: "$0" },
  ];
  
  const roleColors: Record<string, string> = {
    Owner:
      "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    Member: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    Viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  
  return (
    <SectionCard id="family">
      <SectionHeader
        icon={Users}
        titleKey="settings.family.title"
        descriptionKey="settings.family.description"
      />
      <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {members.map((m) => (
          <li key={m.initials} className="flex items-center gap-4 px-6 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-sm font-semibold select-none">
              {m.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {m.name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {t("settings.family.limit_label", { limit: m.limit })}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[m.role]}`}
            >
              {t(`settings.family.roles.${m.role.toLowerCase()}`)}
            </span>
            <button
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded transition-colors"
              aria-label={t("settings.family.edit_member_label", { name: m.name })}
            >
              <ChevronRight size={16} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {t("settings.family.max_members")}
        </p>
        <button 
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors"
          aria-label={t("settings.family.invite_member_label")}
        >
          {t("settings.family.invite_member")}
        </button>
      </div>
    </SectionCard>
  );
}

function PreferencesSection() {
  const { t } = useClientTranslator();
  const { density, setDensity } = useDensity();
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const themes = [
    { id: "system", labelKey: "settings.preferences.theme_system",  Icon: Smartphone },
    { id: "light",  labelKey: "settings.preferences.theme_light",   Icon: Sun        },
    { id: "dark",   labelKey: "settings.preferences.theme_dark",    Icon: Moon       },
  ] as const;
  const densityOptions = [
    { id: "comfortable" as const, labelKey: "settings.preferences.density_comfortable" },
    { id: "compact"     as const, labelKey: "settings.preferences.density_compact" },
  ];
  
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
                onClick={() => setTheme(id)}
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
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>{t("settings.preferences.language_english_us")}</option>
            <option>{t("settings.preferences.language_english_uk")}</option>
            <option>{t("settings.preferences.language_french")}</option>
            <option>{t("settings.preferences.language_spanish")}</option>
            <option>{t("settings.preferences.language_portuguese")}</option>
          </select>
        </FieldRow>
        <FieldRow labelKey="settings.preferences.timezone_label">
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>{t("settings.preferences.timezone_lagos")}</option>
            <option>{t("settings.preferences.timezone_accra")}</option>
            <option>{t("settings.preferences.timezone_nairobi")}</option>
            <option>{t("settings.preferences.timezone_newyork")}</option>
            <option>{t("settings.preferences.timezone_london")}</option>
          </select>
        </FieldRow>
        <FieldRow labelKey="settings.preferences.date_format_label">
          <div className="flex gap-3 flex-wrap">
            {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((fmt) => (
              <label
                key={fmt}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="dateFormat"
                  value={fmt}
                  defaultChecked={fmt === "DD/MM/YYYY"}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {fmt}
                </span>
              </label>
            ))}
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
      <SaveButton labelKey="settings.save_changes" />
    </SectionCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useClientTranslator();
  const [active, setActive] = useState<SectionId>("profile");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── Scroll-spy: update active nav item based on visible section ────────────
  useEffect(() => {
    const ids = SECTIONS.map((s) => s.id);
    const visible = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible.set(e.target.id, e.intersectionRatio);
        });
        const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best && best[1] > 0) setActive(best[0] as SectionId);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  // ── Scroll to section on nav click ────────────────────────────────────────
  const scrollTo = (id: SectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Also update immediately for responsiveness
    setActive(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Sticky top bar (mobile breadcrumb / desktop title) ── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-5xl flex h-14 items-center gap-3 px-4 sm:px-6">
          <h1 className="text-base font-semibold text-gray-900 dark:text-white">
            {t("settings.page_title")}
          </h1>
          {/* Mobile: horizontal scrollable nav pills */}
          <nav
            className="ml-auto flex gap-1 overflow-x-auto sm:hidden scrollbar-none"
            aria-label={t("settings.nav_aria_label")}
          >
            {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                aria-current={active === id ? "location" : undefined}
                aria-label={t(labelKey)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active === id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={13} strokeWidth={2} />
                {t(labelKey)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
        {/* ── Desktop sidebar nav ── */}
        <aside className="hidden lg:block sticky top-20 self-start">
          <nav aria-label={t("settings.nav_aria_label")}>
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    aria-current={active === id ? "location" : undefined}
                    aria-label={t(labelKey)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-left ${
                      active === id
                        ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={active === id ? 2 : 1.8}
                      className={
                        active === id
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-400 dark:text-gray-500"
                      }
                    />
                    {t(labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ── Main content stack ── */}
        <main className="space-y-6" aria-label={t("settings.content_aria_label")}>
          <ProfileSection />
          <NotificationsSection />
          <SecuritySection />
          <WalletSection />
          <FamilySection />
          <PreferencesSection />
        </main>
      </div>
    </div>
  );
}
