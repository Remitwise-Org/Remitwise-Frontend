"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { CHANGELOG, ChangelogEntry } from "@/lib/changelog";

const STORAGE_KEY = "remitwise_whats_new_last_seen";

interface WhatsNewContextValue {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    toggle: () => void;
    entries: ChangelogEntry[];
    readIds: Set<string>;
    unreadCount: number;
    markAllRead: () => void;
}

const WhatsNewContext = createContext<WhatsNewContextValue | null>(null);

export function WhatsNewProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [lastSeenId, setLastSeenId] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setLastSeenId(stored || null);
            } else {
                setIsOpen(true);
            }
        } catch {
            setIsOpen(true);
        }
    }, []);

    const unreadCount = mounted
        ? (() => {
              const newestId = CHANGELOG[0]?.id;
              if (!newestId) return 0;
              if (lastSeenId === null) return CHANGELOG.length;
              const seenIndex = CHANGELOG.findIndex((entry) => entry.id === lastSeenId);
              return seenIndex === -1 ? CHANGELOG.length : seenIndex;
          })()
        : 0;

    const readIds = new Set<string>(
        CHANGELOG.slice(unreadCount).map((entry) => entry.id)
    );

    const markAllRead = useCallback(() => {
        const newestId = CHANGELOG[0]?.id || null;
        setLastSeenId(newestId);
        try {
            if (newestId) {
                localStorage.setItem(STORAGE_KEY, newestId);
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        } catch {
            // ignore storage errors
        }
    }, []);

    useEffect(() => {
        if (!mounted || !isOpen) return;
        markAllRead();
    }, [mounted, isOpen, markAllRead]);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

    return (
        <WhatsNewContext.Provider
            value={{ isOpen, open, close, toggle, entries: CHANGELOG, readIds, unreadCount, markAllRead }}
        >
            {children}
        </WhatsNewContext.Provider>
    );
}

export function useWhatsNew(): WhatsNewContextValue {
    const ctx = useContext(WhatsNewContext);
    if (!ctx) {
        throw new Error("useWhatsNew must be used within a WhatsNewProvider");
    }
    return ctx;
}
export function useWhatsNewOptional(): WhatsNewContextValue | null {
    return useContext(WhatsNewContext);
}
