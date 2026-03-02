"use client";

import React from "react";
import { X, ExternalLink, CheckCheck } from "lucide-react";
import { useWhatsNew } from "@/lib/context/WhatsNewContext";

export default function WhatsNewPanel() {
    const { isOpen, close, entries, readIds, unreadCount, markAllRead } =
        useWhatsNew();

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={close}
                className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none"
                    }`}
                aria-hidden="true"
            />

            {/* Side Panel */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="What's New"
                className={`fixed top-0 right-0 z-50 h-full w-full max-w-[420px] flex flex-col
          bg-[#111111] border-l border-white/10 shadow-2xl shadow-black/60
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">
                            🎉
                        </span>
                        <div>
                            <h2 className="text-lg font-bold text-white leading-tight">
                                What&apos;s New
                            </h2>
                            {unreadCount > 0 && (
                                <p className="text-[11px] text-brand-red font-medium mt-0.5">
                                    {unreadCount} unread update{unreadCount !== 1 ? "s" : ""}
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={close}
                        aria-label="Close What's New panel"
                        className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-gray-400 hover:text-white"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Entries */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin">
                    {entries.map((entry) => {
                        const isUnread = !readIds.has(entry.id);
                        return (
                            <article
                                key={entry.id}
                                className={`relative rounded-xl p-4 border transition-colors duration-200
                  ${isUnread
                                        ? "bg-brand-red/5 border-brand-red/25"
                                        : "bg-white/[0.03] border-white/[0.07] hover:border-white/15"
                                    }`}
                            >
                                {/* Unread indicator bar */}
                                {isUnread && (
                                    <span
                                        aria-label="Unread"
                                        className="absolute left-0 top-4 bottom-4 w-[3px] bg-brand-red rounded-full"
                                    />
                                )}

                                {/* Meta row */}
                                <div className="flex items-center gap-2 mb-2 pl-1">
                                    <span className="text-xl leading-none" aria-hidden="true">
                                        {entry.icon}
                                    </span>
                                    <span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                                        {entry.version}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600" aria-hidden="true" />
                                    <span className="text-[10px] text-gray-500">{entry.date}</span>
                                    {isUnread && (
                                        <span className="ml-auto text-[9px] font-bold tracking-wider text-brand-red uppercase bg-brand-red/10 border border-brand-red/20 px-1.5 py-0.5 rounded-full">
                                            New
                                        </span>
                                    )}
                                </div>

                                {/* Title */}
                                <h3 className="text-sm font-semibold text-white pl-1 mb-2 leading-snug">
                                    {entry.title}
                                </h3>

                                {/* Bullets */}
                                <ul className="space-y-1 pl-1">
                                    {entry.bullets.map((bullet, i) => (
                                        <li key={i} className="flex items-start gap-2 text-[12px] text-gray-400 leading-relaxed">
                                            <span className="mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-gray-600" aria-hidden="true" />
                                            {bullet}
                                        </li>
                                    ))}
                                </ul>

                                {/* Link */}
                                {entry.link && (
                                    <a
                                        href={entry.link.href}
                                        className="inline-flex items-center gap-1.5 mt-3 ml-1 text-[12px] font-semibold text-brand-red hover:text-red-400 transition-colors"
                                    >
                                        {entry.link.label}
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </article>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 py-4 border-t border-white/10">
                    <button
                        onClick={markAllRead}
                        disabled={unreadCount === 0}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium
              bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white
              transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <CheckCheck className="w-4 h-4" />
                        Mark all as read
                    </button>
                </div>
            </aside>
        </>
    );
}
