"use client";

import React from "react";
import { useWhatsNew } from "@/lib/context/WhatsNewContext";

interface WhatsNewBadgeProps {
    /** Extra class names for positioning the badge */
    className?: string;
}

export default function WhatsNewBadge({ className = "" }: WhatsNewBadgeProps) {
    const { unreadCount } = useWhatsNew();

    if (unreadCount === 0) return null;

    return (
        <span
            aria-label={`${unreadCount} unread update${unreadCount !== 1 ? "s" : ""}`}
            className={`absolute flex items-center justify-center ${className}`}
        >
            {/* Pulsing outer ring */}
            <span className="absolute inline-flex w-full h-full rounded-full bg-brand-red opacity-60 animate-ping" />
            {/* Solid badge with count */}
            <span className="relative inline-flex items-center justify-center min-w-full h-full px-1 rounded-full bg-brand-red border border-[#111111] text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
            </span>
        </span>
    );
}
