"use client";

import React, { useMemo } from "react";
import { Keyboard, Printer } from "lucide-react";
import PageHeadingLink from "@/components/PageHeadingLink";
import { useSeo } from "@/lib/hooks/useSeo";
import {
  KEYBOARD_SHORTCUTS,
  SHORTCUT_CATEGORY_LABELS,
  getShortcutsByCategory,
  type ShortcutCategory,
  type ShortcutEntry,
} from "@/lib/config/shortcuts";

const CATEGORY_ORDER: ShortcutCategory[] = [
  "global",
  "navigation",
  "modals",
  "lists",
];

function formatKeyChord(keys: string[]): string {
  return keys.join(" + ");
}

function ShortcutKeys({ entry }: { entry: ShortcutEntry }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1 justify-end">
      {entry.keys.map((key, index) => (
        <React.Fragment key={`${entry.id}-mac-${key}-${index}`}>
          {index > 0 && <span className="text-gray-500 text-xs">+</span>}
          <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">
            {key}
          </kbd>
        </React.Fragment>
      ))}
      {entry.keysWin && (
        <>
          <span className="text-gray-500 text-xs px-0.5">/</span>
          {entry.keysWin.map((key, index) => (
            <React.Fragment key={`${entry.id}-win-${key}-${index}`}>
              {index > 0 && <span className="text-gray-500 text-xs">+</span>}
              <kbd className="px-2 py-1 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">
                {key}
              </kbd>
            </React.Fragment>
          ))}
        </>
      )}
    </span>
  );
}

function PrintKeys({ entry }: { entry: ShortcutEntry }) {
  const mac = formatKeyChord(entry.keys);
  const win = entry.keysWin ? formatKeyChord(entry.keysWin) : null;
  return (
    <span className="font-mono text-sm text-gray-900">
      {mac}
      {win ? ` / ${win}` : ""}
    </span>
  );
}

export default function ShortcutsCheatSheet() {
  useSeo({
    title: "Keyboard Shortcuts - RemitWise",
    description:
      "Printable cheat sheet of every RemitWise keyboard shortcut for navigation, command palette, and overlays.",
  });

  const grouped = useMemo(() => getShortcutsByCategory(), []);

  return (
    <>
      {/* Screen layout */}
      <div className="min-h-screen bg-slate-950 text-white px-4 py-10 sm:px-6 lg:px-8 print:hidden">
        <div className="mx-auto max-w-3xl">
          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-white/5 p-3 text-slate-200">
                <Keyboard className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-slate-400">
                  Reference
                </p>
                <PageHeadingLink
                  headingId="shortcuts-page-heading"
                  label="Copy link to keyboard shortcuts heading"
                  headingClassName="text-3xl font-semibold tracking-tight text-white"
                >
                  Keyboard Shortcuts
                </PageHeadingLink>
                <p className="mt-2 text-slate-300 max-w-xl">
                  Full shortcut list for RemitWise. Print this page for a clean
                  desk-side cheat sheet.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-colors shrink-0"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Print
            </button>
          </header>

          <div className="space-y-6">
            {CATEGORY_ORDER.map((category) => {
              const entries = grouped[category];
              if (entries.length === 0) return null;

              return (
                <section
                  key={category}
                  aria-labelledby={`shortcuts-${category}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
                >
                  <h2
                    id={`shortcuts-${category}`}
                    className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3"
                  >
                    {SHORTCUT_CATEGORY_LABELS[category]}
                  </h2>
                  <ul className="space-y-2">
                    {entries.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-2.5 px-3 bg-white/[0.02] border border-white/5 rounded-xl"
                      >
                        <div>
                          <p className="text-sm text-gray-200">{entry.label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{entry.scope}</p>
                        </div>
                        <ShortcutKeys entry={entry} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>

          <p className="mt-8 text-sm text-slate-400">
            Press{" "}
            <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-xs font-mono text-white">
              ?
            </kbd>{" "}
            anywhere in the app for the quick help modal. Contributor reference:{" "}
            <code className="text-slate-300">docs/KEYBOARD_SHORTCUTS.md</code>.
          </p>
        </div>
      </div>

      {/* Print-only layout */}
      <div className="hidden print:block w-full min-h-screen bg-white text-black p-8 font-sans">
        <style>{`
          @page { size: portrait; margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        `}</style>

        <header className="mb-8 border-b border-gray-300 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            RemitWise
          </h1>
          <p className="text-sm text-gray-500 uppercase tracking-widest font-semibold mt-1">
            Keyboard Shortcuts
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {KEYBOARD_SHORTCUTS.length} shortcuts · Printable cheat sheet
          </p>
        </header>

        {CATEGORY_ORDER.map((category) => {
          const entries = grouped[category];
          if (entries.length === 0) return null;

          return (
            <section key={`print-${category}`} className="mb-6 break-inside-avoid">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2 border-b border-gray-200 pb-1">
                {SHORTCUT_CATEGORY_LABELS[category]}
              </h2>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-gray-500">
                    <th className="py-1.5 pr-4 font-semibold w-[42%]">Action</th>
                    <th className="py-1.5 pr-4 font-semibold w-[28%]">Keys</th>
                    <th className="py-1.5 font-semibold">Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={`print-${entry.id}`} className="border-t border-gray-200">
                      <td className="py-2 pr-4 text-sm text-gray-900">{entry.label}</td>
                      <td className="py-2 pr-4">
                        <PrintKeys entry={entry} />
                      </td>
                      <td className="py-2 text-sm text-gray-600">{entry.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}

        <footer className="mt-10 pt-4 border-t border-gray-300 text-xs text-gray-500">
          Tip: press ? in the app for the quick help overlay · /shortcuts
        </footer>
      </div>
    </>
  );
}
