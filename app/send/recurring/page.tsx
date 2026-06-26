// app/send/recurring/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/client/apiClient";
import RecurringScheduleList from "@/components/RecurringScheduleList";
import RecurringScheduleForm from "@/components/RecurringScheduleForm";
import { LoadingSkeletons } from "@/components/LoadingSkeletons"; // assume exists
import { WidgetEmptyState } from "@/components/WidgetEmptyState";
import { WidgetErrorState } from "@/components/WidgetErrorState";

export default function RecurringSchedulesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isError, error } = useQuery(
    ["recurringSchedules"],
    () => apiClient.getRecurringSchedules(),
    { staleTime: 5 * 60 * 1000 }
  );

  const createMutation = useMutation(
    (payload) => apiClient.createRecurringSchedule(payload),
    {
      onSuccess: () => queryClient.invalidateQueries(["recurringSchedules"]),
    }
  );

  const pauseMutation = useMutation(
    ({ id }) => apiClient.pauseRecurringSchedule(id),
    { onSuccess: () => queryClient.invalidateQueries(["recurringSchedules"]) }
  );

  const resumeMutation = useMutation(
    ({ id }) => apiClient.resumeRecurringSchedule(id),
    { onSuccess: () => queryClient.invalidateQueries(["recurringSchedules"]) }
  );

  const deleteMutation = useMutation(
    ({ id }) => apiClient.deleteRecurringSchedule(id),
    { onSuccess: () => queryClient.invalidateQueries(["recurringSchedules"]) }
  );

  const handleCreate = async (data) => {
    await createMutation.mutateAsync(data);
    setShowForm(false);
  };

  const handlePause = async (id) => {
    await pauseMutation.mutateAsync({ id });
  };

  const handleResume = async (id) => {
    await resumeMutation.mutateAsync({ id });
  };

  const handleDelete = async (id) => {
    await deleteMutation.mutateAsync({ id });
  };

  if (isLoading) return <LoadingSkeletons />;
  if (isError) return <WidgetErrorState error={error?.message || "Failed to load schedules"} />;
  if (!data || data.length === 0) return <WidgetEmptyState message="No recurring schedules" />;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Recurring Remittance Schedules</h1>
      <button
        onClick={() => setShowForm(true)}
        className="mb-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
      >
        Create New Schedule
      </button>
      {showForm && (
        <RecurringScheduleForm
          onCancel={() => setShowForm(false)}
          onSubmit={handleCreate}
        />
      )}
      <RecurringScheduleList
        schedules={data}
        onPause={handlePause}
        onResume={handleResume}
        onDelete={handleDelete}
      />
    </div>
  );
}
