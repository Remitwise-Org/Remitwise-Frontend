'use client';

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FieldHelpProps {
  /** The help text to display in the popover */
  children: React.ReactNode;
  /** Accessible label for the help button (defaults to "Show help") */
  buttonLabel?: string;
  /** Additional class names for the wrapper */
  className?: string;
  /** ID of the input/field this help describes (for aria-describedby) */
  fieldId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FieldHelp
 *
 * A small (?) icon button that opens a popover with contextual help text.
 * Designed for complex form inputs where inline guidance is needed.
 *
 * ## Accessibility (WCAG 2.1 AA)
 * - Help icon is keyboard-operable (Enter/Space to toggle, Escape to close)
 * - Popover uses role="dialog" with aria-labelledby
 * - Focus is trapped inside the popover when open
 * - aria-describedby links the help text to the target input
 * - Click outside closes the popover
 * - High-contrast text meets 4.5:1 ratio against background
 * - All interactive elements have visible focus rings using design tokens
 */
export function FieldHelp({
  children,
  buttonLabel = 'Show help',
  className,
  fieldId,
}: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const titleId = useId();

  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  // Focus trap inside popover
  useEffect(() => {
    if (!open || !popoverRef.current) return;
    const focusable = popoverRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    // Focus first element
    first?.focus();
    return () => document.removeEventListener('keydown', handleTab);
  }, [open]);

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      {/* Help icon button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-label={buttonLabel}
        aria-expanded={open}
        aria-controls={open ? contentId : undefined}
        className={cn(
          'inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
          'border border-white/20 bg-white/[0.03] text-gray-400',
          'transition-colors duration-150',
          'hover:bg-white/10 hover:text-white hover:border-white/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          role="dialog"
          id={contentId}
          aria-labelledby={titleId}
          className={cn(
            'absolute bottom-full left-0 z-50 mb-2 w-64',
            'rounded-xl border border-white/10 bg-[#121212] p-4 shadow-xl',
            'animate-in fade-in slide-in-from-bottom-2 duration-150',
          )}
        >
          {/* Title row */}
          <div className="mb-2 flex items-center justify-between">
            <h4 id={titleId} className="text-sm font-semibold text-white">
              Help
            </h4>
            <button
              type="button"
              onClick={close}
              aria-label="Close help"
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-lg',
                'text-gray-400 transition-colors',
                'hover:bg-white/10 hover:text-white',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
              )}
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Help content */}
          <div
            id={fieldId ? ${fieldId}-help : undefined}
            className="text-sm leading-relaxed text-gray-300"
          >
            {children}
          </div>
        </div>
      )}
    </span>
  );
}

export default FieldHelp;
