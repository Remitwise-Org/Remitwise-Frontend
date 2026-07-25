"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalendarDate {
  year: number;
  month: number; // 1-based
  day: number;
}

export interface AccessibleCalendarGridProps {
  /** Currently selected date. Pass `null` for no selection. */
  value?: CalendarDate | null;
  /** Callback fired when the user selects a date. */
  onChange?: (date: CalendarDate) => void;
  /** Minimum selectable date (inclusive). */
  minDate?: CalendarDate;
  /** Maximum selectable date (inclusive). */
  maxDate?: CalendarDate;
  /** Locale string used for month/weekday names, e.g. `"en-US"`, `"ar-SA"`. */
  locale?: string;
  /**
   * The first day of the week.
   * 0 = Sunday (default for en-US), 1 = Monday (ISO 8601 / most of Europe).
   */
  firstDayOfWeek?: 0 | 1;
  /** Additional class names applied to the outermost wrapper. */
  className?: string;
  /** Accessible label for the calendar widget. Defaults to "Calendar". */
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDateObj({ year, month, day }: CalendarDate): Date {
  return new Date(year, month - 1, day);
}

function fromDateObj(d: Date): CalendarDate {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function isSameDay(a: CalendarDate | null | undefined, b: CalendarDate | null | undefined): boolean {
  if (!a || !b) return false;
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function isToday(d: CalendarDate): boolean {
  const t = new Date();
  return d.year === t.getFullYear() && d.month === t.getMonth() + 1 && d.day === t.getDate();
}

function isBefore(a: CalendarDate, b: CalendarDate): boolean {
  return toDateObj(a) < toDateObj(b);
}

function isAfter(a: CalendarDate, b: CalendarDate): boolean {
  return toDateObj(a) > toDateObj(b);
}

function isDisabled(date: CalendarDate, min?: CalendarDate, max?: CalendarDate): boolean {
  if (min && isBefore(date, min)) return true;
  if (max && isAfter(date, max)) return true;
  return false;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/** Returns a 6-row × 7-col grid of CalendarDate | null (null = padding cell). */
function buildMonthGrid(
  year: number,
  month: number,
  firstDayOfWeek: 0 | 1,
): (CalendarDate | null)[][] {
  const totalDays = getDaysInMonth(year, month);
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0=Sun
  // Offset: how many empty cells before the 1st
  let offset = (firstWeekday - firstDayOfWeek + 7) % 7;

  const cells: (CalendarDate | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push({ year, month, day: d });
  // Pad to a multiple of 7
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (CalendarDate | null)[][] = [];
  for (let r = 0; r < cells.length / 7; r++) {
    rows.push(cells.slice(r * 7, r * 7 + 7));
  }
  return rows;
}

function getWeekdayNames(locale: string, firstDayOfWeek: 0 | 1): string[] {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const names: string[] = [];
  // Week of 2024-01-07 (Sunday) used as reference
  for (let i = 0; i < 7; i++) {
    const day = new Date(2024, 0, 7 + ((firstDayOfWeek + i) % 7));
    names.push(fmt.format(day));
  }
  return names;
}

function getMonthYearLabel(year: number, month: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );
}

function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * AccessibleCalendarGrid
 *
 * A fully accessible date-picker calendar grid that meets WCAG 2.1 AA.
 *
 * ## Keyboard navigation
 * | Key | Action |
 * |---|---|
 * | Arrow Left / Right | Move focus one day backward / forward |
 * | Arrow Up / Down | Move focus one week backward / forward |
 * | Home | Move focus to first day of current week |
 * | End | Move focus to last day of current week |
 * | Page Up | Go to previous month |
 * | Page Down | Go to next month |
 * | Enter / Space | Select focused date |
 * | Tab | Move to the prev/next month navigation buttons |
 *
 * ## ARIA
 * - Container: `role="application"` with `aria-label`
 * - Grid: `role="grid"` with `aria-labelledby` pointing at the month/year heading
 * - Column headers: `role="columnheader"` (weekday abbreviations)
 * - Rows: `role="row"`
 * - Cells: `role="gridcell"` with `aria-selected`, `aria-disabled`, `aria-label` (full date)
 * - Today: `aria-current="date"`
 * - Month change: announced via `aria-live="polite"` region
 *
 * ## RTL
 * Sets `dir="rtl"` on the wrapper when the resolved locale is right-to-left,
 * and flips the prev/next month button icons accordingly. Pass an explicit RTL
 * locale (e.g. `"ar"`, `"he"`, `"fa"`) or set `dir="rtl"` on a parent element.
 */
export function AccessibleCalendarGrid({
  value = null,
  onChange,
  minDate,
  maxDate,
  locale = "en-US",
  firstDayOfWeek = 0,
  className,
  ariaLabel = "Calendar",
}: AccessibleCalendarGridProps) {
  const today = fromDateObj(new Date());

  // Displayed month
  const [displayYear, setDisplayYear] = useState<number>(
    value?.year ?? today.year,
  );
  const [displayMonth, setDisplayMonth] = useState<number>(
    value?.month ?? today.month,
  );

  // The date cell that currently holds roving tabindex="0"
  const [focusedDate, setFocusedDate] = useState<CalendarDate>(
    value ?? today,
  );

  // Live region announcement for screen readers
  const [announcement, setAnnouncement] = useState("");

  const gridRef = useRef<HTMLTableElement>(null);
  const headingId = useId();
  const liveRegionId = useId();

  // Detect RTL from locale
  const isRTL = /^(ar|he|fa|ur|yi|ku|dv|ps)\b/i.test(locale);

  // Weekday column headers
  const weekdays = getWeekdayNames(locale, firstDayOfWeek);

  // Full month-year label for heading and announcements
  const monthYearLabel = getMonthYearLabel(displayYear, displayMonth, locale);

  // Grid data
  const grid = buildMonthGrid(displayYear, displayMonth, firstDayOfWeek);

  // When focused date changes to a different month, update display month
  useEffect(() => {
    if (
      focusedDate.year !== displayYear ||
      focusedDate.month !== displayMonth
    ) {
      setDisplayYear(focusedDate.year);
      setDisplayMonth(focusedDate.month);
    }
  }, [focusedDate, displayYear, displayMonth]);

  // Programmatically move focus to the focused date cell
  const focusCellForDate = useCallback((date: CalendarDate) => {
    // Use requestAnimationFrame so the DOM has been updated after state change
    requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector<HTMLElement>(
        `[data-date="${date.year}-${date.month}-${date.day}"]`,
      );
      el?.focus();
    });
  }, []);

  // Navigate to prev/next month
  const navigateMonth = useCallback(
    (delta: -1 | 1) => {
      const { year, month } = addMonths(displayYear, displayMonth, delta);
      setDisplayYear(year);
      setDisplayMonth(month);
      const newLabel = getMonthYearLabel(year, month, locale);
      setAnnouncement(newLabel);
      // Move focused date into the new month if it's out of range
      setFocusedDate((prev) => {
        if (prev.year !== year || prev.month !== month) {
          return { year, month, day: 1 };
        }
        return prev;
      });
    },
    [displayYear, displayMonth, locale],
  );

  // Keyboard handler on the grid
  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTableElement>) => {
      const current = toDateObj(focusedDate);
      let next: Date | null = null;

      switch (e.key) {
        case "ArrowLeft":
          next = new Date(current);
          next.setDate(current.getDate() + (isRTL ? 1 : -1));
          break;
        case "ArrowRight":
          next = new Date(current);
          next.setDate(current.getDate() + (isRTL ? -1 : 1));
          break;
        case "ArrowUp":
          next = new Date(current);
          next.setDate(current.getDate() - 7);
          break;
        case "ArrowDown":
          next = new Date(current);
          next.setDate(current.getDate() + 7);
          break;
        case "Home": {
          // First day of current week
          const dow = (current.getDay() - firstDayOfWeek + 7) % 7;
          next = new Date(current);
          next.setDate(current.getDate() - dow);
          break;
        }
        case "End": {
          // Last day of current week
          const dow = (current.getDay() - firstDayOfWeek + 7) % 7;
          next = new Date(current);
          next.setDate(current.getDate() + (6 - dow));
          break;
        }
        case "PageUp":
          e.preventDefault();
          navigateMonth(-1);
          return;
        case "PageDown":
          e.preventDefault();
          navigateMonth(1);
          return;
        case "Enter":
        case " ": {
          e.preventDefault();
          if (!isDisabled(focusedDate, minDate, maxDate)) {
            onChange?.(focusedDate);
          }
          return;
        }
        default:
          return;
      }

      if (next) {
        e.preventDefault();
        const nextDate = fromDateObj(next);
        setFocusedDate(nextDate);
        focusCellForDate(nextDate);
      }
    },
    [focusedDate, firstDayOfWeek, isRTL, navigateMonth, minDate, maxDate, onChange, focusCellForDate],
  );

  // Click a day cell
  const handleDayClick = useCallback(
    (date: CalendarDate) => {
      if (isDisabled(date, minDate, maxDate)) return;
      setFocusedDate(date);
      onChange?.(date);
    },
    [minDate, maxDate, onChange],
  );

  // Full date label for aria-label on each cell
  const fullDateLabel = useCallback(
    (date: CalendarDate) =>
      new Intl.DateTimeFormat(locale, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(toDateObj(date)),
    [locale],
  );

  return (
    <div
      role="application"
      aria-label={ariaLabel}
      dir={isRTL ? "rtl" : undefined}
      className={cn("inline-flex flex-col gap-space-sm select-none", className)}
    >
      {/* ── Live region (screen-reader announcements) ─────────────────── */}
      <div
        id={liveRegionId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* ── Month navigation header ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-space-xs">
        <button
          type="button"
          aria-label={
            isRTL
              ? `Next month, ${getMonthYearLabel(
                  ...Object.values(addMonths(displayYear, displayMonth, 1)) as [number, number],
                  locale,
                )}`
              : `Previous month, ${getMonthYearLabel(
                  ...Object.values(addMonths(displayYear, displayMonth, -1)) as [number, number],
                  locale,
                )}`
          }
          onClick={() => navigateMonth(isRTL ? 1 : -1)}
          className={cn(
            "flex items-center justify-center h-11 w-11 rounded-lg",
            "text-white/70 hover:text-white hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-brand-red/40",
            "focus-visible:ring-offset-focus focus-visible:ring-offset-black",
            "transition-colors duration-150",
          )}
        >
          {isRTL ? (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          )}
        </button>

        <h2
          id={headingId}
          className="text-sm font-semibold text-white tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {monthYearLabel}
        </h2>

        <button
          type="button"
          aria-label={
            isRTL
              ? `Previous month, ${getMonthYearLabel(
                  ...Object.values(addMonths(displayYear, displayMonth, -1)) as [number, number],
                  locale,
                )}`
              : `Next month, ${getMonthYearLabel(
                  ...Object.values(addMonths(displayYear, displayMonth, 1)) as [number, number],
                  locale,
                )}`
          }
          onClick={() => navigateMonth(isRTL ? -1 : 1)}
          className={cn(
            "flex items-center justify-center h-11 w-11 rounded-lg",
            "text-white/70 hover:text-white hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-brand-red/40",
            "focus-visible:ring-offset-focus focus-visible:ring-offset-black",
            "transition-colors duration-150",
          )}
        >
          {isRTL ? (
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* ── Calendar grid ─────────────────────────────────────────────── */}
      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={headingId}
        onKeyDown={handleGridKeyDown}
        className="border-collapse"
      >
        {/* Column headers — weekday names */}
        <thead>
          <tr role="row">
            {weekdays.map((wd) => (
              <th
                key={wd}
                role="columnheader"
                scope="col"
                abbr={wd}
                className="w-11 h-9 text-center text-xs font-medium text-white/40 uppercase tracking-wide"
              >
                {wd}
              </th>
            ))}
          </tr>
        </thead>

        {/* Day cells */}
        <tbody>
          {grid.map((week, rowIdx) => (
            <tr key={rowIdx} role="row">
              {week.map((date, colIdx) => {
                if (!date) {
                  // Empty padding cell — outside the current month
                  return (
                    <td
                      key={colIdx}
                      role="gridcell"
                      aria-disabled="true"
                      className="w-11 h-11"
                    />
                  );
                }

                const selected = isSameDay(date, value);
                const focused = isSameDay(date, focusedDate);
                const today_ = isToday(date);
                const disabled = isDisabled(date, minDate, maxDate);
                const inCurrentMonth = date.month === displayMonth;

                return (
                  <td
                    key={colIdx}
                    role="gridcell"
                    aria-selected={selected}
                    aria-disabled={disabled}
                    aria-current={today_ ? "date" : undefined}
                    aria-label={fullDateLabel(date)}
                    data-date={`${date.year}-${date.month}-${date.day}`}
                    tabIndex={focused ? 0 : -1}
                    onClick={() => handleDayClick(date)}
                    onFocus={() => setFocusedDate(date)}
                    className={cn(
                      // Base cell
                      "w-11 h-11 text-sm text-center rounded-lg cursor-pointer transition-colors duration-100",
                      "focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-brand-red/40",
                      "focus-visible:ring-offset-focus focus-visible:ring-offset-black",
                      // Faded when outside current month
                      inCurrentMonth ? "text-white" : "text-white/30",
                      // Disabled
                      disabled && "opacity-40 cursor-not-allowed pointer-events-none",
                      // Today ring
                      today_ &&
                        !selected &&
                        "ring-1 ring-inset ring-brand-red/60",
                      // Selected
                      selected &&
                        "bg-brand-red text-white font-semibold shadow-md shadow-brand-red/30",
                      // Hover (not selected, not disabled)
                      !selected &&
                        !disabled &&
                        "hover:bg-white/10",
                    )}
                  >
                    <span aria-hidden="true">{date.day}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default AccessibleCalendarGrid;
