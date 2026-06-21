"use client";

import { User } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import {
  SectionCard,
  SectionHeader,
  FieldRow,
  TextInput,
  SaveButton,
} from "./SettingsPrimitives";

export function ProfileSection() {
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
          <TextInput defaultValue="GBQWY...K3PT" disabled />
        </FieldRow>
      </div>
      <SaveButton labelKey="settings.save_changes" />
    </SectionCard>
  );
}
