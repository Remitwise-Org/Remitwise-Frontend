"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { Wallet } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import { useAutosave } from "@/lib/hooks/useAutosave";
import {
  SectionCard,
  SectionHeader,
  FieldRow,
  TextInput,
  Toggle,
  SaveButton,
} from "./SettingsPrimitives";

const NETWORKS = [
  { value: "testnet", labelKey: "settings.wallet.testnet" },
  { value: "mainnet", labelKey: "settings.wallet.mainnet" },
] as const;

export function WalletSection() {
  const { t } = useClientTranslator();
  const [network, setNetwork] = useState("testnet");
  const [rpcUrl, setRpcUrl] = useState("https://soroban-testnet.stellar.org");
  const [autoSplit, setAutoSplit] = useState(true);
  const [currency, setCurrency] = useState("USDC");

  const onSave = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  }, []);

  const { saveState, triggerSave } = useAutosave(onSave);

  const handleRpcChange = (value: string) => {
    setRpcUrl(value);
    triggerSave();
  };

  const handleAutoSplitChange = (next: boolean) => {
    setAutoSplit(next);
    triggerSave();
  };

  const handleCurrencyChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setCurrency(e.target.value);
    triggerSave();
  };

  const handleNetworkChange = (net: string) => {
    setNetwork(net);
    triggerSave();
  };

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
            {NETWORKS.map(({ value, labelKey }) => (
              <label key={value} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="network"
                  value={value}
                  checked={network === value}
                  onChange={() => handleNetworkChange(value)}
                  className="h-4 w-4 accent-indigo-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t(labelKey)}
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
            value={rpcUrl}
            onChange={handleRpcChange}
            placeholderKey="settings.wallet.soroban_rpc_placeholder"
          />
        </FieldRow>
        <FieldRow labelKey="settings.wallet.auto_split_label">
          <Toggle
            labelKey="settings.wallet.auto_split_toggle"
            descriptionKey="settings.wallet.auto_split_desc"
            checked={autoSplit}
            onChange={handleAutoSplitChange}
          />
        </FieldRow>
        <FieldRow
          labelKey="settings.wallet.default_currency_label"
          hintKey="settings.wallet.default_currency_hint"
        >
          <select
            value={currency}
            onChange={handleCurrencyChange}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3.5 py-2 text-sm text-gray-900 dark:text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
          >
            <option value="USDC">USDC</option>
            <option value="XLM">XLM</option>
            <option value="NGN">NGN</option>
            <option value="GHS">GHS</option>
            <option value="KES">KES</option>
          </select>
        </FieldRow>
      </div>
      <SaveButton labelKey="settings.save_changes" saveState={saveState} />
    </SectionCard>
  );
}
