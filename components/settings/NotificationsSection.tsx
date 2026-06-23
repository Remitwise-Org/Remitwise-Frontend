"use client";

import { Bell } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import {
  SectionCard,
  SectionHeader,
  Toggle,
  SaveButton,
} from "./SettingsPrimitives";
import { InsuranceReminderPreview } from "./InsuranceReminderPreview";

export function NotificationsSection() {
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
