"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, Check, Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ComboboxOption {
  /** Unique identifier for the option. */
  value: string;
  /** Display label shown in the dropdown. */
  label: string;
  /** Optional secondary text shown below the label. */
  description?: string;
  /** Optional icon element rendered to the left of the label. */
  icon?: React.ReactNode;
  /** Whether this option is disabled. */
  disabled?: boolean;
}

export interface ComboboxProps {
  /** The list of options to render in the dropdown. */
  options: ComboboxOption[];
  /**
   * Currently selected value. When provided the component is controlled;
   * omit for uncontrolled behaviour.
   */
  value?: string | null;
  /** Default selected value (uncontrolled mode only). */
  defaultValue?: string | null;
  /** Callback fired when the user selects an option. */
  onChange?: (value: string, option: ComboboxOption) => void;
  /** Callback fired when the search input value changes. */
  onInputChange?: (value: string) => void;
  /** Placeholder text shown when no value is selected. */
  placeholder?: string;
  /** Accessible label for the combobox input. Required for accessibility. */
  label: string;
  /** Optional description read by screen readers. */
  description?: string;
  /** Whether the combobox is disabled. */
  disabled?: boolean;
  /** Whether to show the search icon prefix in the input. */
  showSearchIcon?: boolean;
  /** Maximum height of the dropdown listbox in pixels. */
  maxHeight?: number;
  /** Whether the dropdown should open on focus (without typing). */
  openOnFocus?: boolean;
  /** Custom function to filter options based on the input value. */
  filterOptions?: (options: ComboboxOption[], query: string) => ComboboxOption[];
  /** Whether the input is clearable via a clear button. */
  clearable?: boolean;
  /** Additional class names applied to the root wrapper. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultFilterOptions(
  options: ComboboxOption[],
  query: string,
): ComboboxOption[] {
  if (!query.trim()) return options;
  const lower = query.toLowerCase();
  return options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(lower) ||
      opt.description?.toLowerCase().includes(lower) ||
      opt.value.toLowerCase().includes(lower),
  );
}

function getNextIndex(
  current: number,
  direction: 1 | -1,
  options: ComboboxOption[],
): number {
  const len = options.length;
  if (len === 0) return -1;
  let next = current;
  // Skip disabled options
  for (let i = 0; i < len; i++) {
    next = (next + direction + len) % len;
    if (!options[next].disabled) return next;
  }
  return current;
}

function getFirstEnabledIndex(options: ComboboxOption[]): number {
  return options.findIndex((opt) => !opt.disabled);
}

function getLastEnabledIndex(options: ComboboxOption[]): number {
  for (let i = options.length - 1; i >= 0; i--) {
    if (!options[i].disabled) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Combobox
 *
 * An accessible single-select combobox that follows the WAI-ARIA 1.2 combobox
 * pattern. Provides full keyboard navigation, screen-reader semantics, and
 * customisable filtering.
 *
 * ## Keyboard shortcuts
 * | Key | Action |
 * |---|---|
 * | Arrow Down | Open listbox / move highlight down |
 * | Arrow Up | Move highlight up |
 * | Enter | Select the highlighted option and close the listbox |
 * | Escape | Close the listbox without selecting |
 * | Home | Move highlight to the first enabled option |
 * | End | Move highlight to the last enabled option |
 * | Tab | Move focus out of the combobox; closes the listbox |
 *
 * ## ARIA
 * - Input: `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-autocomplete="list"`, `aria-activedescendant`
 * - Listbox: `role="listbox"`, `id` matching `aria-controls`
 * - Options: `role="option"`, `id`, `aria-selected`
 *
 * ## Accessibility
 * - Live region announces the number of available suggestions
 * - Disabled options are focusable but not selectable and are skipped by Home/End
 * - Focus ring matches the project's design tokens
 * - Minimum touch target for options is 44px
 */
export function Combobox({
  options,
  value: controlledValue,
  defaultValue = null,
  onChange,
  onInputChange,
  placeholder = "Select an option…",
  label,
  description,
  disabled = false,
  showSearchIcon = true,
  maxHeight = 320,
  openOnFocus = true,
  filterOptions,
  clearable = true,
  className,
}: ComboboxProps) {
  const inputId = useId();
  const listboxId = useId();
  const descId = useId();
  const liveRegionId = useId();

  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState<string | null>(
    defaultValue,
  );
  const selectedValue = isControlled ? controlledValue : internalValue;

  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const optionRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Filtered options ────────────────────────────────────────────────────
  const filteredOptions = useMemo(
    () =>
      filterOptions
        ? filterOptions(options, inputValue)
        : defaultFilterOptions(options, inputValue),
    [options, inputValue, filterOptions],
  );

  // ── Announce result count to screen readers ─────────────────────────────
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    if (!isOpen) return;
    const count = filteredOptions.length;
    if (count === 0) {
      setAnnouncement("No results found");
    } else {
      setAnnouncement(`${count} result${count === 1 ? "" : "s"} available`);
    }
  }, [filteredOptions.length, isOpen]);

  // ── Resolve active option ───────────────────────────────────────────────
  const activeOption =
    activeIndex >= 0 && activeIndex < filteredOptions.length
      ? filteredOptions[activeIndex]
      : null;

  // ── Select an option ────────────────────────────────────────────────────
  const selectOption = useCallback(
    (option: ComboboxOption) => {
      if (option.disabled) return;
      if (!isControlled) setInternalValue(option.value);
      onChange?.(option.value, option);
      setInputValue("");
      setIsOpen(false);
      setActiveIndex(-1);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [isControlled, onChange],
  );

  // ── Open / close helpers ────────────────────────────────────────────────
  const open = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
    // Set activeIndex to the currently selected option if present
    const selIdx = filteredOptions.findIndex(
      (opt) => opt.value === selectedValue,
    );
    setActiveIndex(selIdx >= 0 ? selIdx : getFirstEnabledIndex(filteredOptions));
  }, [disabled, filteredOptions, selectedValue]);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  // ── Scroll active option into view ──────────────────────────────────────
  const scrollActiveIntoView = useCallback(() => {
    if (activeIndex < 0) return;
    const opt = filteredOptions[activeIndex];
    if (!opt) return;
    const el = optionRefs.current.get(opt.value);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, filteredOptions]);

  useEffect(() => {
    if (isOpen) scrollActiveIntoView();
  }, [activeIndex, isOpen, scrollActiveIntoView]);

  // ── Keyboard handling ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (!isOpen) {
            open();
            return;
          }
          setActiveIndex((prev) =>
            getNextIndex(
              prev >= 0 ? prev : -1,
              1,
              filteredOptions,
            ),
          );
          break;
        }

        case "ArrowUp": {
          e.preventDefault();
          if (!isOpen) {
            open();
            return;
          }
          setActiveIndex((prev) =>
            getNextIndex(
              prev >= 0 ? prev : filteredOptions.length,
              -1,
              filteredOptions,
            ),
          );
          break;
        }

        case "Enter": {
          e.preventDefault();
          if (isOpen && activeOption) {
            selectOption(activeOption);
          } else if (!isOpen) {
            open();
          }
          break;
        }

        case "Escape": {
          if (isOpen) {
            e.preventDefault();
            close();
          }
          break;
        }

        case "Home": {
          if (isOpen) {
            e.preventDefault();
            const idx = getFirstEnabledIndex(filteredOptions);
            if (idx >= 0) setActiveIndex(idx);
          }
          break;
        }

        case "End": {
          if (isOpen) {
            e.preventDefault();
            const idx = getLastEnabledIndex(filteredOptions);
            if (idx >= 0) setActiveIndex(idx);
          }
          break;
        }

        default:
          break;
      }
    },
    [disabled, isOpen, open, close, filteredOptions, activeOption, selectOption],
  );

  // ── Input events ────────────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      onInputChange?.(val);
      if (!isOpen) open();
      setActiveIndex(getFirstEnabledIndex(filteredOptions));
    },
    [isOpen, open, onInputChange, filteredOptions],
  );

  const handleInputFocus = useCallback(() => {
    if (openOnFocus && !disabled) open();
  }, [openOnFocus, disabled, open]);

  const handleInputBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // Only close if focus moves outside the container
      if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
        close();
      }
    },
    [close],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isControlled) setInternalValue(null);
      setInputValue("");
      close();
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [isControlled, close],
  );

  // ── Dismiss on outside click ────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, close]);

  // ── Display label for the selected option ───────────────────────────────
  const selectedOption = useMemo(
    () => options.find((o) => o.value === selectedValue),
    [options, selectedValue],
  );

  const displayValue = isOpen
    ? inputValue
    : selectedOption
      ? selectedOption.label
      : "";

  // ── Option ID helper ────────────────────────────────────────────────────
  const optionId = (opt: ComboboxOption) => `${listboxId}-option-${opt.value}`;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className={cn("relative w-full", className)}
      data-testid="combobox"
    >
      {/* Screen reader live region */}
      <div
        id={liveRegionId}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Hidden description for the input */}
      {description && (
        <p id={descId} className="sr-only">
          {description}
        </p>
      )}

      {/* Label (visible or sr-only) */}
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div className="relative">
        {showSearchIcon && (
          <SearchIcon
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            activeOption && isOpen ? optionId(activeOption) : undefined
          }
          aria-describedby={description ? descId : undefined}
          aria-label={label}
          aria-disabled={disabled || undefined}
          disabled={disabled}
          autoComplete="off"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={selectedOption && !isOpen ? selectedOption.label : placeholder}
          data-testid="combobox-input"
          className={cn(
            "flex h-11 w-full items-center rounded-lg border bg-white px-3.5 py-2 text-sm text-gray-900 placeholder-gray-400",
            "dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500",
            "transition-colors duration-150",
            "focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showSearchIcon && "pl-10",
            !showSearchIcon && "pl-3.5",
            clearable && selectedOption ? "pr-10" : "pr-10",
            "border-gray-200",
          )}
        />

        {/* ── Clear / chevron buttons ─────────────────────────────────── */}
        <div className="absolute right-0 top-0 flex h-full items-center pr-2">
          {clearable && selectedOption && !isOpen && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden="true"
              onClick={handleClear}
              className="mr-1 flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <span className="text-xs font-medium leading-none">&times;</span>
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={() => {
              if (isOpen) close();
              else {
                open();
                inputRef.current?.focus();
              }
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
          >
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180",
              )}
            />
          </button>
        </div>
      </div>

      {/* ── Listbox dropdown ────────────────────────────────────────────── */}
      {isOpen && (
        <ul
          ref={listboxRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          data-testid="combobox-listbox"
          className={cn(
            "absolute z-50 mt-1 w-full overflow-y-auto rounded-lg border shadow-lg",
            "bg-white border-gray-200",
            "dark:bg-gray-800 dark:border-gray-700",
          )}
          style={{ maxHeight }}
        >
          {filteredOptions.length === 0 ? (
            <li
              role="option"
              aria-selected="false"
              aria-disabled="true"
              className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic"
            >
              No results found
            </li>
          ) : (
            filteredOptions.map((opt, idx) => {
              const isActive = idx === activeIndex;
              const isSelected = opt.value === selectedValue;

              return (
                <li
                  key={opt.value}
                  ref={(el) => {
                    if (el) optionRefs.current.set(opt.value, el);
                    else optionRefs.current.delete(opt.value);
                  }}
                  id={optionId(opt)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  data-testid={`combobox-option-${opt.value}`}
                  onMouseDown={(e) => {
                    // Prevent input blur from firing before selection
                    e.preventDefault();
                  }}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => {
                    if (!opt.disabled) setActiveIndex(idx);
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-2.5 text-sm cursor-pointer min-h-[44px] transition-colors duration-75",
                    isActive &&
                      !opt.disabled &&
                      "bg-indigo-50 dark:bg-indigo-900/30",
                    !isActive && !opt.disabled && "hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    isSelected &&
                      !opt.disabled &&
                      "font-medium",
                    opt.disabled &&
                      "opacity-50 cursor-not-allowed",
                  )}
                >
                  {/* Icon */}
                  {opt.icon && (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500">
                      {opt.icon}
                    </span>
                  )}

                  {/* Label + description */}
                  <span className="flex-1 min-w-0">
                    <span
                      className={cn(
                        "block truncate",
                        isSelected
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-900 dark:text-white",
                      )}
                    >
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                        {opt.description}
                      </span>
                    )}
                  </span>

                  {/* Check mark */}
                  {isSelected && (
                    <Check
                      className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export default Combobox;
