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
            {/* Solid dot */}
            <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-brand-red border border-[#111111]" />
        </span>
    );
}
