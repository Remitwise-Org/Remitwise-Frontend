'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Users, AlertTriangle, RotateCcw, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import WidgetErrorState from '@/components/ui/WidgetErrorState';
import WidgetEmptyState from '@/components/ui/WidgetEmptyState';
import { apiClient, ApiClientError } from '@/lib/client/apiClient';
import { runWidgetFetchWithRetry } from '@/lib/client/widgetFetchRetry';
import { useClientTranslator } from '@/lib/i18n/client';
import { useToast } from '@/lib/context/ToastContext';

type LoadState = 'loading' | 'error' | 'ready' | 'unauthorized';

interface AuditEvent {
  id: string;
  type: string;
  actor: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

interface User {
  id: string;
  stellarAddress: string;
  createdAt: string;
}

interface DLQEvent {
  id: string;
  source: string;
  eventType: string;
  status: string;
  retryCount: number;
  lastError: string;
  createdAt: string;
}

interface DLQResponse {
  events: DLQEvent[];
  pagination: { total: number; hasMore: boolean };
}

function useAdminResource<T>(
  url: string,
  extractData: (json: any) => T
) {
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<T | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback((signal?: AbortSignal) => {
    return runWidgetFetchWithRetry({
      signal,
      load: async () => {
        const res = await apiClient.get(url, { signal });
        if (!res) {
          throw new Error('Session expired');
        }
        if (res.status === 401 || res.status === 403) {
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to load ${url}`);
        }
        const json = await res.json();
        return extractData(json);
      },
    });
  }, [url, extractData]);

  const refresh = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    void load(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        if (result === null) {
          setState('unauthorized');
        } else {
          setData(result);
          setState('ready');
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          setState('unauthorized');
        } else {
          setState('error');
        }
      });
    return () => controller.abort();
  }, [load, reloadKey]);

  return { state, data, refresh };
}

function SectionShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-6 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-4 pb-3 border-b border-white/10">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-24 rounded" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 py-3 border-b border-white/5 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-4 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const { t } = useClientTranslator();
  const { toast } = useToast();

  const audit = useAdminResource<AuditEvent[]>('/api/v1/admin/audit', (json) => json.events);
  const users = useAdminResource<User[]>('/api/v1/admin/users', (json) => json.users);
  const dlq = useAdminResource<DLQResponse>('/api/v1/admin/webhooks/dlq', (json) => json.data);

  const handleReplay = useCallback(async (id: string) => {
    try {
      const res = await apiClient.post(`/api/v1/admin/webhooks/dlq/${id}/replay`);
      if (!res?.ok) throw new Error('Failed to replay');
      toast({
        variant: 'success',
        title: 'Replay queued',
        description: 'Event has been queued for reprocessing.',
      });
      dlq.refresh();
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Replay failed',
        description: 'Could not replay the event.',
      });
    }
  }, [dlq, toast]);

  const handleProcessPending = useCallback(async () => {
    try {
      const res = await apiClient.post('/api/v1/admin/webhooks/process');
      if (!res?.ok) throw new Error('Failed to process');
      toast({
        variant: 'success',
        title: 'Processing started',
        description: 'Pending webhooks are being processed.',
      });
      dlq.refresh();
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Processing failed',
        description: 'Could not start processing.',
      });
    }
  }, [dlq, toast]);

  const renderContent = () => {
    if (audit.state === 'unauthorized' || users.state === 'unauthorized' || dlq.state === 'unauthorized') {
      return (
        <div className="min-h-screen bg-[#010101] p-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-6 text-center">
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-900/40 bg-red-950/20 text-red-500">
                  <AlertTriangle className="h-6 w-6" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Access Denied</h2>
                  <p className="mt-1 text-sm text-white/50">You don't have permission to access the admin panel.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#010101] p-6">
        <main className="mx-auto max-w-7xl space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Operations</h1>
              <p className="mt-1 text-sm text-white/50">Manage audit logs, users, and webhook DLQ.</p>
            </div>
          </header>

          <SectionShell>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-white/70" />
                <h2 className="text-lg font-semibold text-white">Audit Log</h2>
              </div>
            </div>
            {audit.state === 'loading' && <TableSkeleton rows={5} cols={4} />}
            {audit.state === 'error' && (
              <WidgetErrorState message="Failed to load audit log." onRetry={audit.refresh} />
            )}
            {audit.state === 'ready' && audit.data && (
              <div>
                {audit.data.length === 0 ? (
                  <WidgetEmptyState
                    icon={Activity}
                    title="No audit events"
                    description="No audit events have been recorded yet."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <caption className="sr-only">Audit log events</caption>
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs font-semibold text-white/50">
                          <th scope="col" className="pb-3 pr-4">Timestamp</th>
                          <th scope="col" className="pb-3 pr-4">Event</th>
                          <th scope="col" className="pb-3 pr-4">Actor</th>
                          <th scope="col" className="pb-3">Message</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-white/80">
                        {audit.data.map((event) => (
                          <tr key={event.id} className="border-b border-white/5 last:border-0">
                            <td className="py-3 pr-4">
                              {new Date(event.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 pr-4 font-mono text-xs">{event.type}</td>
                            <td className="py-3 pr-4 font-mono text-xs">{event.actor}</td>
                            <td className="py-3 max-w-xs truncate" title={event.message}>
                              {event.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </SectionShell>

          <SectionShell>
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-white/70" />
              <h2 className="text-lg font-semibold text-white">Users</h2>
            </div>
            {users.state === 'loading' && <TableSkeleton rows={5} cols={3} />}
            {users.state === 'error' && (
              <WidgetErrorState message="Failed to load users." onRetry={users.refresh} />
            )}
            {users.state === 'ready' && users.data && (
              <div>
                {users.data.length === 0 ? (
                  <WidgetEmptyState
                    icon={Users}
                    title="No users"
                    description="No users have been created yet."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <caption className="sr-only">Registered users</caption>
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs font-semibold text-white/50">
                          <th scope="col" className="pb-3 pr-4">ID</th>
                          <th scope="col" className="pb-3 pr-4">Stellar Address</th>
                          <th scope="col" className="pb-3">Created At</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-white/80">
                        {users.data.map((user) => (
                          <tr key={user.id} className="border-b border-white/5 last:border-0">
                            <td className="py-3 pr-4 font-mono text-xs">{user.id}</td>
                            <td className="py-3 pr-4 font-mono text-xs truncate max-w-xs" title={user.stellarAddress}>
                              {user.stellarAddress}
                            </td>
                            <td className="py-3">{new Date(user.createdAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </SectionShell>

          <SectionShell>
            <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-white/70" />
                <h2 className="text-lg font-semibold text-white">Webhook DLQ</h2>
              </div>
              <button
                type="button"
                onClick={handleProcessPending}
                className="flex items-center gap-2 rounded-lg bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
              >
                <Play className="h-4 w-4" />
                Process Pending
              </button>
            </div>
            {dlq.state === 'loading' && <TableSkeleton rows={5} cols={6} />}
            {dlq.state === 'error' && (
              <WidgetErrorState message="Failed to load DLQ." onRetry={dlq.refresh} />
            )}
            {dlq.state === 'ready' && dlq.data && (
              <div>
                {dlq.data.events.length === 0 ? (
                  <WidgetEmptyState
                    icon={AlertTriangle}
                    title="No DLQ events"
                    description="Great! There are no failed webhook events in the dead-letter queue."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <caption className="sr-only">Dead-letter queue webhook events</caption>
                      <thead>
                        <tr className="border-b border-white/10 text-left text-xs font-semibold text-white/50">
                          <th scope="col" className="pb-3 pr-4">Source</th>
                          <th scope="col" className="pb-3 pr-4">Type</th>
                          <th scope="col" className="pb-3 pr-4">Status</th>
                          <th scope="col" className="pb-3 pr-4">Retries</th>
                          <th scope="col" className="pb-3 pr-4">Last Error</th>
                          <th scope="col" className="pb-3">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm text-white/80">
                        {dlq.data.events.map((event) => (
                          <tr key={event.id} className="border-b border-white/5 last:border-0">
                            <td className="py-3 pr-4 font-mono text-xs">{event.source}</td>
                            <td className="py-3 pr-4 font-mono text-xs">{event.eventType}</td>
                            <td className="py-3 pr-4">
                              <span className="rounded-full bg-yellow-950/30 px-2 py-0.5 text-xs text-yellow-500">
                                {event.status}
                              </span>
                            </td>
                            <td className="py-3 pr-4">{event.retryCount}</td>
                            <td className="py-3 pr-4 max-w-xs truncate" title={event.lastError}>
                              <span className="text-red-400">{event.lastError}</span>
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => handleReplay(event.id)}
                                className="flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Replay
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </SectionShell>
        </main>
      </div>
    );
  };

  return renderContent();
}
