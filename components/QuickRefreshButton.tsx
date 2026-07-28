"use client";

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";

export default function QuickRefreshButton() {
  const queryClient = useQueryClient();
  const { t } = useClientTranslator();

  const handleRefresh = () => {
    // Triggers refetch on all mounted queries
    queryClient.refetchQueries({ type: "active" });
  };

  return (
    <button
      onClick={handleRefresh}
      aria-label={t("quickRefresh.label") || "Quick Refresh"}
      className="inline-flex items-center justify-center gap-2 rounded-md bg-white/[0.02] px-3 py-2 text-sm font-medium text-white hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 transition-colors"
    >
      <RefreshCw className="h-4 w-4" aria-hidden="true" />
      <span>{t("quickRefresh.button") || "Refresh"}</span>
    </button>
  );
}
