"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
} from "react";
import { CHANGELOG, ChangelogEntry } from "@/lib/changelog";

const STORAGE_KEY = "remitwise_whats_new_read";

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
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setReadIds(new Set(JSON.parse(stored)));
            } else {
                // First visit: auto-open the panel
                setIsOpen(true);
            }
        } catch {
            setIsOpen(true);
        }
    }, []);

    const unreadCount = mounted
        ? CHANGELOG.filter((e) => !readIds.has(e.id)).length
        : 0;

    const markAllRead = useCallback(() => {
        const allIds = CHANGELOG.map((e) => e.id);
        const newSet = new Set(allIds);
        setReadIds(newSet);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allIds));
        } catch {
            // ignore storage errors
        }
    }, []);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => {
        setIsOpen(false);
        markAllRead();
    }, [markAllRead]);
    const toggle = useCallback(() => {
        setIsOpen((prev) => {
            if (prev) markAllRead();
            return !prev;
        });
    }, [markAllRead]);

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
