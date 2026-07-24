"use client";

import { useState } from "react";
import WidgetEmptyState from "@/components/ui/WidgetEmptyState";

export default function RecurringSchedulesPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 rounded-2xl border border-white/10 bg-[#0f0f0f] p-6">
        <h1 className="mb-2 text-2xl font-bold text-white">
          Recurring Remittance Schedules
        </h1>
        <p className="text-sm text-gray-400">
          This route is available for future recurring schedule management.
        </p>
      </div>

      <button
        type="button"
        onClick={() => setShowForm((current) => !current)}
        className="mb-4 rounded-xl bg-[#FF4B26] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#FF4B26]/80"
      >
        {showForm ? "Hide setup" : "Create New Schedule"}
      </button>

      {showForm && (
        <div className="mb-6 rounded-2xl border border-dashed border-white/15 bg-black/30 p-4 text-sm text-gray-300">
          Schedule setup is not yet wired into this page.
        </div>
      )}

      <WidgetEmptyState
        title="No recurring schedules"
        description="Create a new schedule to start automating remittances."
      />
    </div>
  );
}
