'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

/**
 * ThemeToggle
 * Dropdown that lets the user pick Light, Dark, or System (auto).
 * Persistence is handled by `next-themes` via the configured
 * `storageKey` on the ThemeProvider (see app/layout.tsx).
 */
export function ThemeToggle({
  className,
  align = 'end',
}: {
  className?: string;
  align?: 'start' | 'center' | 'end';
}): React.ReactElement {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Avoid hydration mismatch: render a stable placeholder until mount.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // next-themes returns `theme` as `string | undefined` before mount.
  // Narrow it to our explicit Theme union, falling back to 'system'.
  const current: Theme =
    theme === 'light' || theme === 'dark' || theme === 'system'
      ? theme
      : 'system';

  const effectiveForIcon: 'light' | 'dark' =
    current === 'system' ? (resolvedTheme as 'light' | 'dark') || 'light' : current;

  const TriggerIcon =
    !mounted
      ? Sun
      : effectiveForIcon === 'dark'
      ? Moon
      : Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Toggle theme"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/60 text-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          className,
        )}
      >
        <TriggerIcon className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
        <span className="sr-only">Toggle theme</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[10rem]">
        <DropdownMenuLabel className="px-2 text-xs font-semibold text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => setTheme(value as Theme)}
        >
          <DropdownMenuRadioItem value="light" className="cursor-pointer">
            <Sun className="mr-2 h-4 w-4" aria-hidden="true" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark" className="cursor-pointer">
            <Moon className="mr-2 h-4 w-4" aria-hidden="true" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system" className="cursor-pointer">
            <Monitor className="mr-2 h-4 w-4" aria-hidden="true" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled
          className="cursor-default px-2 text-[11px] text-muted-foreground"
        >
          {mounted
            ? `Active: ${
                effectiveForIcon === 'dark' ? 'Dark' : 'Light'
              }${current === 'system' ? ' · auto' : ''}`
            : 'Loading theme…'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ThemeToggle;
