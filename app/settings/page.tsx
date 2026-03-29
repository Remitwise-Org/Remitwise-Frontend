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

// ─── Section definitions ──────────────────────────────────────────────────────

const SECTIONS = [
  { id: "profile",        label: "Profile",         icon: User    },
  { id: "notifications",  label: "Notifications",   icon: Bell    },
  { id: "security",       label: "Security",        icon: Shield  },
  { id: "wallet",         label: "Wallet",          icon: Wallet  },
  { id: "family",         label: "Family",          icon: Users   },
  { id: "preferences",    label: "Preferences",     icon: Globe   },
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
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
        <Icon size={18} strokeWidth={1.8} />
      </span>
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-3 sm:items-center border-b border-gray-50 dark:border-gray-800/60 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </p>
        {hint && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {hint}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

function TextInput({
  defaultValue,
  placeholder,
  type = "text",
  disabled,
}: {
  defaultValue?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      defaultValue={defaultValue}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-400 transition-colors"
    />
  );
}

function Toggle({
  label,
  description,
  defaultChecked,
}: {
  label: string;
  description?: string;
  defaultChecked?: boolean;
}) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-50 dark:border-gray-800/60 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            {description}
          </p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={on}
        onClick={() => setOn((v) => !v)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
          on ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}

function SaveButton({ label = "Save changes" }: { label?: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  const handleClick = () => {
    setState("saving");
    setTimeout(() => {
      setState("saved");
      setTimeout(() => setState("idle"), 2000);
    }, 800);
  };

  return (
    <div className="flex justify-end px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
      <button
        onClick={handleClick}
        disabled={state === "saving"}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-60 transition-colors min-w-[130px] justify-center"
      >
        {state === "saving" && (
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
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
        )}
        {state === "saved" && <Check size={14} />}
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : label}
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
  const [status, setStatus] = useState<
    "loading" | "loaded" | "empty" | "unauthorized" | "error"
  >("loading");
  const [reminders, setReminders] = useState<InsuranceReminder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadReminders() {
      try {
        const response = await fetch("/api/insurance/reminders");
        if (!active) return;

        if (response.status === 401 || response.status === 403) {
          setStatus("unauthorized");
          setError("Connect your wallet to view upcoming insurance reminders.");
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
  }, []);

  return (
    <div className="mx-6 mt-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Insurance reminders
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Show upcoming or overdue premium payments for your active policies.
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {status === "loading" && "Loading…"}
          {status === "empty" && "No reminders in the next 7 days."}
          {status === "loaded" && `${reminders.length} reminder${reminders.length === 1 ? "" : "s"}`}
          {status === "unauthorized" && "Sign in to view reminders."}
          {status === "error" && "Unable to load reminders."}
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
                  Due {new Date(reminder.nextPaymentDate).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Premium: ${reminder.monthlyPremium.toFixed(2)}
              </p>
            </div>
          ))}
        {status === "unauthorized" && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {error ?? "Could not load insurance reminders."}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Sections ────────────────────────────────────────────────────────────────

function ProfileSection() {
  return (
    <SectionCard id="profile">
      <SectionHeader
        icon={User}
        title="Profile"
        description="Your public identity and contact information."
      />
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {/* Avatar row */}
        <div className="flex items-center gap-4 px-6 py-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-lg font-semibold select-none">
            AO
          </div>
          <div>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 focus:outline-none focus-visible:underline transition-colors">
              Change avatar
            </button>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              JPG or PNG · Max 2 MB
            </p>
          </div>
        </div>
        <FieldRow label="Full name">
          <TextInput defaultValue="Amara Osei" placeholder="Your full name" />
        </FieldRow>
        <FieldRow label="Email address" hint="Used for notifications and login">
          <TextInput
            type="email"
            defaultValue="amara@example.com"
            placeholder="you@example.com"
          />
        </FieldRow>
        <FieldRow label="Phone number" hint="For two-factor authentication">
          <TextInput
            type="tel"
            defaultValue="+234 801 234 5678"
            placeholder="+1 555 000 0000"
          />
        </FieldRow>
        <FieldRow label="Stellar public key" hint="Read-only · linked to wallet">
          <TextInput
            defaultValue="GBQWY...K3PT"
            disabled
          />
        </FieldRow>
      </div>
      <SaveButton />
    </SectionCard>
  );
}

function NotificationsSection() {
  return (
    <SectionCard id="notifications">
      <SectionHeader
        icon={Bell}
        title="Notifications"
        description="Choose when and how RemitWise contacts you."
      />
      <div>
        <p className="px-6 pt-4 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Remittances
        </p>
        <Toggle
          label="Transfer confirmed"
          description="When your payment reaches the recipient"
          defaultChecked
        />
        <Toggle
          label="Transfer failed"
          description="If a payment cannot be processed"
          defaultChecked
        />
        <Toggle
          label="Exchange rate alert"
          description="When the rate improves by more than 2 %"
        />
        <p className="px-6 pt-5 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Bills &amp; goals
        </p>
        <Toggle
          label="Bill due reminder"
          description="48 hours before a bill is due"
          defaultChecked
        />
        <Toggle
          label="Goal milestone reached"
          description="When you hit 25 %, 50 %, 75 %, or 100 % of a goal"
          defaultChecked
        />
        <Toggle
          label="Insurance premium reminders"
          description="Receive alerts when insurance premiums are due or overdue."
          defaultChecked
        />
        <InsuranceReminderPreview />
        <p className="px-6 pt-5 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          Channels
        </p>
        <Toggle label="Email" defaultChecked />
        <Toggle label="Push notifications" defaultChecked />
        <Toggle label="SMS" />
      </div>
      <SaveButton />
    </SectionCard>
  );
}

function SecuritySection() {
  const [showAlert, setShowAlert] = useState(false);
  return (
    <SectionCard id="security">
      <SectionHeader
        icon={Shield}
        title="Security"
        description="Protect your account and manage session access."
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
            Two-factor authentication is not enabled. We strongly recommend
            enabling it for added security.
          </p>
          <button
            onClick={() => setShowAlert(false)}
            className="ml-auto text-amber-500 hover:text-amber-700 focus:outline-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      <div className="mt-4">
        <Toggle
          label="Two-factor authentication (2FA)"
          description="Require a code from your phone on each login"
        />
        <Toggle
          label="Login notifications"
          description="Email me when a new device signs in"
          defaultChecked
        />
        <Toggle
          label="Biometric unlock"
          description="Use Face ID or fingerprint on supported devices"
        />
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        <FieldRow label="Session timeout" hint="Auto-sign-out after inactivity">
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>15 minutes</option>
            <option>30 minutes</option>
            <option selected>1 hour</option>
            <option>4 hours</option>
            <option>Never</option>
          </select>
        </FieldRow>
      </div>
      <div className="flex flex-col gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Want to rotate your wallet nonce or revoke all sessions?
        </span>
        <button
          onClick={() => setShowAlert(true)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
        >
          Sign out all devices
        </button>
      </div>
    </SectionCard>
  );
}

function WalletSection() {
  return (
    <SectionCard id="wallet">
      <SectionHeader
        icon={Wallet}
        title="Wallet"
        description="Manage your Stellar wallet and network settings."
      />
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        <FieldRow label="Network" hint="Switching networks requires re-authentication">
          <div className="flex gap-3">
            {["Testnet", "Mainnet"].map((net) => (
              <label
                key={net}
                className="flex cursor-pointer items-center gap-2"
              >
                <input
                  type="radio"
                  name="network"
                  value={net.toLowerCase()}
                  defaultChecked={net === "Testnet"}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {net}
                </span>
              </label>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Soroban RPC URL" hint="Override the default endpoint">
          <TextInput
            defaultValue="https://soroban-testnet.stellar.org"
            placeholder="https://soroban-testnet.stellar.org"
          />
        </FieldRow>
        <FieldRow label="Auto-split on receive">
          <Toggle
            label="Enable automatic money split"
            description="Apply your Smart Money Split rules to incoming transfers"
            defaultChecked
          />
        </FieldRow>
        <FieldRow label="Default currency" hint="Used for display and analytics">
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>USDC</option>
            <option>XLM</option>
            <option>NGN</option>
            <option>GHS</option>
            <option>KES</option>
          </select>
        </FieldRow>
      </div>
      <SaveButton />
    </SectionCard>
  );
}

function FamilySection() {
  const members = [
    { initials: "AO", name: "Amara Osei", role: "Owner",  limit: "—" },
    { initials: "KO", name: "Kwame Osei", role: "Member", limit: "$500 / mo" },
    { initials: "EO", name: "Esi Osei",   role: "Viewer", limit: "$0" },
  ];
  const roleColors: Record<string, string> = {
    Owner:  "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    Member: "bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
    Viewer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <SectionCard id="family">
      <SectionHeader
        icon={Users}
        title="Family"
        description="Manage members, roles, and spending limits."
      />
      <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
        {members.map((m) => (
          <li
            key={m.initials}
            className="flex items-center gap-4 px-6 py-4"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-sm font-semibold select-none">
              {m.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {m.name}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Limit: {m.limit}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleColors[m.role]}`}
            >
              {m.role}
            </span>
            <button
              className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded transition-colors"
              aria-label={`Edit ${m.name}`}
            >
              <ChevronRight size={16} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-between items-center px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Up to 10 family members
        </p>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-colors">
          Invite member
        </button>
      </div>
    </SectionCard>
  );
}

function PreferencesSection() {
  const [theme, setTheme] = useState<"system" | "light" | "dark">("system");
  const themes = [
    { id: "system", label: "System",  Icon: Smartphone },
    { id: "light",  label: "Light",   Icon: Sun        },
    { id: "dark",   label: "Dark",    Icon: Moon       },
  ] as const;
  return (
    <SectionCard id="preferences">
      <SectionHeader
        icon={Globe}
        title="Preferences"
        description="Language, theme, and regional settings."
      />
      <div className="divide-y divide-gray-50 dark:divide-gray-800/60">
        <FieldRow label="Appearance">
          <div className="flex gap-2">
            {themes.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTheme(id)}
                aria-pressed={theme === id}
                className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border py-3 px-2 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  theme === id
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {label}
              </button>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Language">
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>English (US)</option>
            <option>English (UK)</option>
            <option>Français</option>
            <option>Español</option>
            <option>Português</option>
          </select>
        </FieldRow>
        <FieldRow label="Timezone">
          <select className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
            <option>Africa/Lagos (WAT, UTC+1)</option>
            <option>Africa/Accra (GMT, UTC+0)</option>
            <option>Africa/Nairobi (EAT, UTC+3)</option>
            <option>America/New_York (EST, UTC−5)</option>
            <option>Europe/London (GMT, UTC+0)</option>
          </select>
        </FieldRow>
        <FieldRow label="Date format">
          <div className="flex gap-3 flex-wrap">
            {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((fmt) => (
              <label key={fmt} className="flex cursor-pointer items-center gap-2">
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
      </div>
      <SaveButton />
    </SectionCard>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
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
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] }
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
            Settings
          </h1>
          {/* Mobile: horizontal scrollable nav pills */}
          <nav
            className="ml-auto flex gap-1 overflow-x-auto sm:hidden scrollbar-none"
            aria-label="Settings sections"
          >
            {SECTIONS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                aria-current={active === id ? "location" : undefined}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active === id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={13} strokeWidth={2} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
        {/* ── Desktop sidebar nav ── */}
        <aside className="hidden lg:block sticky top-20 self-start">
          <nav aria-label="Settings sections">
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    aria-current={active === id ? "location" : undefined}
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
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ── Main content stack ── */}
        <main className="space-y-6" aria-label="Settings content">
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