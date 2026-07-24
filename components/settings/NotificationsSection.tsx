"use client";

import { useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import { useAutosave } from "@/lib/hooks/useAutosave";
import {
  SectionCard,
  SectionHeader,
  Toggle,
  SaveButton,
} from "./SettingsPrimitives";
import { InsuranceReminderPreview } from "./InsuranceReminderPreview";

interface NotificationsState {
  transferConfirmed: boolean;
  transferFailed: boolean;
  exchangeRateAlert: boolean;
  billDueReminder: boolean;
  goalMilestone: boolean;
  insurancePremiumReminders: boolean;
  emailChannel: boolean;
  pushChannel: boolean;
  smsChannel: boolean;
}

const DEFAULTS: NotificationsState = {
  transferConfirmed: true,
  transferFailed: true,
  exchangeRateAlert: false,
  billDueReminder: true,
  goalMilestone: true,
  insurancePremiumReminders: true,
  emailChannel: true,
  pushChannel: true,
  smsChannel: false,
};

function useNotificationsState() {
  const [state, setState] = useState<NotificationsState>(DEFAULTS);

  const toggle = useCallback((key: keyof NotificationsState) => {
    setState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { state, toggle };
}

export function NotificationsSection() {
  const { t } = useClientTranslator();
  const { state, toggle } = useNotificationsState();

  const onSave = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, []);

  const { saveState, triggerSave } = useAutosave(onSave);

  const handleToggle = (key: keyof NotificationsState) => {
    toggle(key);
    triggerSave();
  };

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
          checked={state.transferConfirmed}
          onChange={() => handleToggle("transferConfirmed")}
        />
        <Toggle
          labelKey="settings.notifications.transfer_failed"
          descriptionKey="settings.notifications.transfer_failed_desc"
          checked={state.transferFailed}
          onChange={() => handleToggle("transferFailed")}
        />
        <Toggle
          labelKey="settings.notifications.exchange_rate_alert"
          descriptionKey="settings.notifications.exchange_rate_alert_desc"
          checked={state.exchangeRateAlert}
          onChange={() => handleToggle("exchangeRateAlert")}
        />
        <p className="px-6 pt-5 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("settings.notifications.bills_section")}
        </p>
        <Toggle
          labelKey="settings.notifications.bill_due_reminder"
          descriptionKey="settings.notifications.bill_due_reminder_desc"
          checked={state.billDueReminder}
          onChange={() => handleToggle("billDueReminder")}
        />
        <Toggle
          labelKey="settings.notifications.goal_milestone"
          descriptionKey="settings.notifications.goal_milestone_desc"
          checked={state.goalMilestone}
          onChange={() => handleToggle("goalMilestone")}
        />
        <Toggle
          labelKey="settings.notifications.insurance_premium_reminders"
          descriptionKey="settings.notifications.insurance_premium_reminders_desc"
          checked={state.insurancePremiumReminders}
          onChange={() => handleToggle("insurancePremiumReminders")}
        />
        <InsuranceReminderPreview />
        <p className="px-6 pt-5 pb-2 text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("settings.notifications.channels_section")}
        </p>
        <Toggle
          labelKey="settings.notifications.email_channel"
          checked={state.emailChannel}
          onChange={() => handleToggle("emailChannel")}
        />
        <Toggle
          labelKey="settings.notifications.push_channel"
          checked={state.pushChannel}
          onChange={() => handleToggle("pushChannel")}
        />
        <Toggle
          labelKey="settings.notifications.sms_channel"
          checked={state.smsChannel}
          onChange={() => handleToggle("smsChannel")}
        />
      </div>
      <SaveButton labelKey="settings.save_changes" saveState={saveState} />
    </SectionCard>
  );
}
