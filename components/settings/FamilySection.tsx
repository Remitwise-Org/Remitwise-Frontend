"use client";

import { Users, ChevronRight } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import { SectionCard, SectionHeader } from "./SettingsPrimitives";

export function FamilySection() {
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
