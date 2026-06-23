"use client";

import { Wallet } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import {
  SectionCard,
  SectionHeader,
  FieldRow,
  TextInput,
  Toggle,
  SaveButton,
} from "./SettingsPrimitives";

export function WalletSection() {
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
              <label key={net} className="flex cursor-pointer items-center gap-2">
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
