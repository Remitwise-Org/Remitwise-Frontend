'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ThemePanel() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-40 border rounded-xl bg-muted/20 animate-pulse" />
        <div className="h-40 border rounded-xl bg-muted/20 animate-pulse" />
        <div className="h-40 border rounded-xl bg-muted/20 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Light Theme Card */}
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "relative flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          theme === 'light' ? "border-primary bg-accent/50" : "border-border bg-card"
        )}
        aria-pressed={theme === 'light'}
      >
        <div className="w-full flex flex-col items-center justify-center h-24 mb-4 rounded-md bg-[#ffffff] border shadow-sm p-2 gap-2 overflow-hidden">
          <div className="w-full flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-200" />
            <div className="w-12 h-2 rounded bg-slate-200" />
          </div>
          <div className="w-full flex-1 rounded bg-slate-100" />
        </div>
        <div className="flex items-center gap-2 font-medium text-sm">
          <Sun className="w-4 h-4" />
          <span>Light</span>
        </div>
      </button>

      {/* Dark Theme Card */}
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "relative flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          theme === 'dark' ? "border-primary bg-accent/50" : "border-border bg-card"
        )}
        aria-pressed={theme === 'dark'}
      >
        <div className="w-full flex flex-col items-center justify-center h-24 mb-4 rounded-md bg-slate-950 border shadow-sm p-2 gap-2 overflow-hidden">
          <div className="w-full flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-800" />
            <div className="w-12 h-2 rounded bg-slate-800" />
          </div>
          <div className="w-full flex-1 rounded bg-slate-900" />
        </div>
        <div className="flex items-center gap-2 font-medium text-sm">
          <Moon className="w-4 h-4" />
          <span>Dark</span>
        </div>
      </button>

      {/* System Theme Card */}
      <button
        onClick={() => setTheme('system')}
        className={cn(
          "relative flex flex-col items-center justify-between p-4 rounded-xl border-2 transition-all hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          theme === 'system' ? "border-primary bg-accent/50" : "border-border bg-card"
        )}
        aria-pressed={theme === 'system'}
      >
        <div className="w-full flex h-24 mb-4 rounded-md border shadow-sm overflow-hidden">
          <div className="w-1/2 h-full bg-[#ffffff] p-2 flex flex-col gap-2 border-r">
            <div className="w-full flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-200 shrink-0" />
              <div className="w-full h-2 rounded bg-slate-200" />
            </div>
            <div className="w-full flex-1 rounded bg-slate-100" />
          </div>
          <div className="w-1/2 h-full bg-slate-950 p-2 flex flex-col gap-2">
            <div className="w-full flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-slate-800 shrink-0" />
              <div className="w-full h-2 rounded bg-slate-800" />
            </div>
            <div className="w-full flex-1 rounded bg-slate-900" />
          </div>
        </div>
        <div className="flex items-center gap-2 font-medium text-sm">
          <Monitor className="w-4 h-4" />
          <span>System</span>
        </div>
      </button>
    </div>
  );
}
