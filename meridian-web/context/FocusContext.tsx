'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useErrorToast } from '@/hooks/use-error-toast';
import { readSyncQueue, requestBackgroundSync, writeSyncQueue } from '@/lib/pwa/sync-queue';
import { subscribeToServiceWorkerMessages } from '@/lib/pwa/service-worker';

export interface FocusSession {
  startTime: number;
  durationMinutes: number;
}

export interface QueuedSession {
  id: string;
  durationMinutes: number;
  xpEarned: number;
  timestamp: number;
}

export type SuperchargeTier = 'None' | 'Gentle Flow' | 'Power Surge' | 'Max Overdrive';

interface FocusContextType {
  xp: number;
  todayXp: number;
  streak: number;
  lastCompleted: number | null;
  superchargeTier: SuperchargeTier;
  activeSession: FocusSession | null;
  offlineQueue: QueuedSession[];
  isLoading: boolean;
  timeLeft: number;
  isActive: boolean;
  startSession: (duration: number) => void;
  cancelSession: () => void;
  selectSuperchargeTier: (tier: SuperchargeTier) => void;
  syncOfflineQueue: () => Promise<void>;
  triggerCompleteSession: () => void; // for testing/manual bypass
}

const FocusContext = createContext<FocusContextType | undefined>(undefined);

// Helper for date difference
function getDaysDifference(t1: number, t2: number): number {
  const d1 = new Date(t1);
  const d2 = new Date(t2);
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// Mock on-chain recording function
export async function recordSessionOnChain(duration: number, xp: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  if (typeof window !== 'undefined' && !navigator.onLine) {
    throw new Error('Transaction failed: network is offline.');
  }
}

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const { triggerErrorToast } = useErrorToast();
  const isMountedRef = useRef(true);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Basic stats
  const [xp, setXp] = useState<number>(0);
  const [todayXp, setTodayXp] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [lastCompleted, setLastCompleted] = useState<number | null>(null);
  const [superchargeTier, setSuperchargeTier] = useState<SuperchargeTier>('None');
  const [offlineQueue, setOfflineQueue] = useState<QueuedSession[]>([]);

  // Timer states
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // The queue is also read outside of React (service worker sync acks, the
  // `online` handler), so keep a ref alongside the state to avoid stale reads.
  const offlineQueueRef = useRef<QueuedSession[]>([]);

  /**
   * Single write path for the queue: React state, localStorage (synchronous
   * reads on next boot) and the IndexedDB mirror the service worker reads
   * during a Background Sync event.
   *
   * Storage is written even after unmount — the worker still needs an accurate
   * queue — but the React state update is skipped.
   */
  const persistQueue = useCallback(async (queue: QueuedSession[]) => {
    offlineQueueRef.current = queue;
    if (isMountedRef.current) setOfflineQueue(queue);

    try {
      localStorage.setItem('focus_offline_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to persist offline queue:', e);
    }

    await writeSyncQueue(queue);

    // Ask the browser to wake the worker as soon as connectivity returns.
    if (queue.length > 0) {
      await requestBackgroundSync();
    }
  }, []);

  // Load state on mount (Client-side only)
  useEffect(() => {
    let completionTimeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const storedXp = localStorage.getItem('focus_xp');
      const storedStreak = localStorage.getItem('focus_streak');
      const storedLastCompleted = localStorage.getItem('focus_last_completed');
      const storedTier = localStorage.getItem('focus_supercharge_tier');
      const storedQueue = localStorage.getItem('focus_offline_queue');
      const storedSession = localStorage.getItem('focus_active_session');

      if (storedXp) setXp(parseInt(storedXp, 10));
      if (storedStreak) setStreak(parseInt(storedStreak, 10));
      if (storedLastCompleted) setLastCompleted(parseInt(storedLastCompleted, 10));
      if (storedTier) setSuperchargeTier(storedTier as SuperchargeTier);
      if (storedQueue) {
        const parsed: QueuedSession[] = JSON.parse(storedQueue);
        setOfflineQueue(parsed);
        offlineQueueRef.current = parsed;
      }

      // Handle daily XP loading / reset
      const storedTodayXp = localStorage.getItem('focus_today_xp');
      const storedTodayDate = localStorage.getItem('focus_today_xp_date');
      const todayStr = new Date().toDateString();
      if (storedTodayDate === todayStr && storedTodayXp) {
        setTodayXp(parseInt(storedTodayXp, 10));
      } else {
        localStorage.setItem('focus_today_xp', '0');
        localStorage.setItem('focus_today_xp_date', todayStr);
        setTodayXp(0);
      }

      if (storedSession) {
        const session: FocusSession = JSON.parse(storedSession);
        const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
        const total = session.durationMinutes * 60;
        const remaining = total - elapsed;

        if (remaining > 0) {
          setActiveSession(session);
          setTimeLeft(remaining);
          setIsActive(true);
        } else {
          // session completed while offline/closed. Complete it now!
          localStorage.removeItem('focus_active_session');
          // We can call completeSession directly with the session details
          completionTimeout = setTimeout(() => {
            handleCompleteSession(session.durationMinutes, session.startTime + total * 1000);
          }, 0);
        }
      }
    } catch (e) {
      console.error('Failed to load focus states from localStorage:', e);
    }
    return () => {
      if (completionTimeout) clearTimeout(completionTimeout);
    };
  }, []);

  // Timer interval countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsActive(false);
            if (activeSession) {
              handleCompleteSession(activeSession.durationMinutes, Date.now());
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, activeSession]);

  /**
   * Drain the queue oldest-first, stopping at the first failure so ordering is
   * preserved. Returns whether the queue is now empty, which is what the
   * service worker's Background Sync event waits on before it stops retrying.
   */
  const drainQueue = useCallback(async (): Promise<{ synced: boolean; count: number }> => {
    const queue = offlineQueueRef.current;
    if (queue.length === 0) return { synced: true, count: 0 };
    if (typeof window !== 'undefined' && !navigator.onLine) {
      return { synced: false, count: 0 };
    }
    // A Background Sync event and the `online` handler can fire together;
    // without this guard both would replay the same sessions.
    if (isSyncingRef.current) return { synced: false, count: 0 };

    isSyncingRef.current = true;
    setIsLoading(true);
    let successCount = 0;
    const remainingQueue = [...queue];

    try {
      for (const session of queue) {
        try {
          await recordSessionOnChain(session.durationMinutes, session.xpEarned);
          successCount++;
          remainingQueue.shift(); // remove processed
        } catch {
          // Stop processing on the first recoverable sync failure.
          break;
        }
      }

      await persistQueue(remainingQueue);

      if (isMountedRef.current && successCount > 0) {
        toast.success(`Successfully synced ${successCount} focus session(s) to Stellar chain!`);
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
      isSyncingRef.current = false;
    }

    return { synced: remainingQueue.length === 0, count: successCount };
  }, [persistQueue]);

  // Sync offline queue helper (public API)
  const syncOfflineQueue = useCallback(async () => {
    await drainQueue();
  }, [drainQueue]);

  // Rehydrate from the IndexedDB mirror: a Background Sync may have run (or
  // failed) while no page was open, and localStorage can be cleared
  // independently of it.
  useEffect(() => {
    let cancelled = false;

    readSyncQueue().then((records) => {
      if (cancelled) return;

      const merged = [...offlineQueueRef.current];
      for (const record of records) {
        if (!merged.some((session) => session.id === record.id)) merged.push(record);
      }
      if (merged.length === 0) return;
      merged.sort((a, b) => a.timestamp - b.timestamp);

      // Round-trip through persistQueue so both stores end up consistent —
      // sessions queued before this feature existed are only in localStorage.
      persistQueue(merged).then(() => {
        // Anything left over from a previous visit goes out now if we're online.
        if (typeof navigator === 'undefined' || navigator.onLine) drainQueue();
      });
    });

    return () => {
      cancelled = true;
    };
  }, [drainQueue, persistQueue]);

  // Auto-sync when coming back online. This is also the fallback path on
  // browsers without Background Sync (Safari, Firefox).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      drainQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [drainQueue]);

  // Background Sync: the worker owns the retry schedule but the on-chain call
  // has to happen here, so it delegates to the page and waits for the ack.
  useEffect(() => {
    return subscribeToServiceWorkerMessages('SYNC_FOCUS_QUEUE', (_data, port) => {
      drainQueue()
        .then((result) => port?.postMessage({ synced: result.synced, count: result.count }))
        .catch(() => port?.postMessage({ synced: false, count: 0 }));
    });
  }, [drainQueue]);

  // Start Focus Session
  const startSession = (durationMinutes: number) => {
    if (isActive) {
      toast.error('A focus session is already running!');
      return;
    }

    const session: FocusSession = {
      startTime: Date.now(),
      durationMinutes,
    };

    setActiveSession(session);
    setTimeLeft(durationMinutes * 60);
    setIsActive(true);

    localStorage.setItem('focus_active_session', JSON.stringify(session));
    toast.success(`Started ${durationMinutes}-minute focus session! Stay present.`);
  };

  // Cancel Focus Session
  const cancelSession = () => {
    setActiveSession(null);
    setTimeLeft(0);
    setIsActive(false);
    localStorage.removeItem('focus_active_session');
    toast.info('Focus session cancelled.');
  };

  // Select Supercharge Tier
  const selectSuperchargeTier = (tier: SuperchargeTier) => {
    setSuperchargeTier(tier);
    localStorage.setItem('focus_supercharge_tier', tier);
    toast.success(`Supercharge tier updated to ${tier}!`);
  };

  // Session completion handler
  const handleCompleteSession = async (duration: number, completionTime: number) => {
    // 1. Calculate base XP
    let baseXp = 10;
    if (duration === 25) baseXp = 25;
    else if (duration === 45) baseXp = 50;

    // 2. Multipliers
    // Streak multiplier: 1 + (streak * 0.1), capped at 2.0x
    const streakMult = 1 + Math.min(streak * 0.1, 1.0);

    // Supercharge multiplier
    let superchargeMult = 1.0;
    if (superchargeTier === 'Gentle Flow') superchargeMult = 1.2;
    else if (superchargeTier === 'Power Surge') superchargeMult = 1.4;
    else if (superchargeTier === 'Max Overdrive') superchargeMult = 1.7;

    // Night owl multiplier: 1.1x between 12 AM and 6 AM
    const dateObj = new Date(completionTime);
    const hour = dateObj.getHours();
    const isNightOwl = hour >= 0 && hour < 6;
    const nightOwlMult = isNightOwl ? 1.1 : 1.0;

    // Calculate final XP
    const xpEarned = Math.round(baseXp * streakMult * superchargeMult * nightOwlMult);

    // 3. Update XP state
    const newXp = xp + xpEarned;
    setXp(newXp);
    localStorage.setItem('focus_xp', newXp.toString());

    // Update today's XP
    const todayStr = new Date(completionTime).toDateString();
    const storedTodayDate = localStorage.getItem('focus_today_xp_date');
    let newTodayXp = xpEarned;
    if (storedTodayDate === todayStr) {
      const currentTodayXp = parseInt(localStorage.getItem('focus_today_xp') || '0', 10);
      newTodayXp = currentTodayXp + xpEarned;
    }
    setTodayXp(newTodayXp);
    localStorage.setItem('focus_today_xp', newTodayXp.toString());
    localStorage.setItem('focus_today_xp_date', todayStr);

    // 4. Update Streak
    let newStreak = 1;
    if (lastCompleted) {
      const daysDiff = getDaysDifference(lastCompleted, completionTime);
      if (daysDiff === 0) {
        // already completed session today, preserve streak
        newStreak = streak;
      } else if (daysDiff === 1) {
        // consecutive day
        newStreak = streak + 1;
      } else {
        // streak broken
        newStreak = 1;
      }
    }
    setStreak(newStreak);
    localStorage.setItem('focus_streak', newStreak.toString());

    // 5. Update Last Completed timestamp
    setLastCompleted(completionTime);
    localStorage.setItem('focus_last_completed', completionTime.toString());

    // Reset active session state
    setActiveSession(null);
    localStorage.removeItem('focus_active_session');

    // 6. Record to Soroban chain (optimistic UI + mock on-chain call)
    setIsLoading(true);
    try {
      await recordSessionOnChain(duration, xpEarned);
      if (isMountedRef.current) {
        toast.success(`Session recorded on-chain! Earned +${xpEarned} XP.`, {
          description: `Streak: ${newStreak} days. Supercharge: ${superchargeTier}`,
        });
      }
    } catch (err: unknown) {
      // Offline/no-wallet queueing fallback
      const queuedSession: QueuedSession = {
        id: Math.random().toString(36).substring(2, 9),
        durationMinutes: duration,
        xpEarned,
        timestamp: completionTime,
      };
      
      // persistQueue also registers the Background Sync tag, so the session
      // settles even if the tab is closed before connectivity returns.
      await persistQueue([...offlineQueueRef.current, queuedSession]);

      if (isMountedRef.current) {
        triggerErrorToast(err, { scope: 'focus-session' });
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  // Manual trigger completion (for testing/debugging helper)
  const triggerCompleteSession = () => {
    if (activeSession) {
      setIsActive(false);
      handleCompleteSession(activeSession.durationMinutes, Date.now());
    } else {
      toast.error('No active session to complete!');
    }
  };

  return (
    <FocusContext.Provider
      value={{
        xp,
        todayXp,
        streak,
        lastCompleted,
        superchargeTier,
        activeSession,
        offlineQueue,
        isLoading,
        timeLeft,
        isActive,
        startSession,
        cancelSession,
        selectSuperchargeTier,
        syncOfflineQueue,
        triggerCompleteSession,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocusContext() {
  const context = useContext(FocusContext);
  if (context === undefined) {
    throw new Error('useFocusContext must be used within a FocusProvider');
  }
  return context;
}
