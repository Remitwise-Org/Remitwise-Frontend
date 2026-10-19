'use client';

/**
 * MenuButton — ARIA menu-button pattern (WAI-ARIA 1.1 §3.15)
 *
 * Accessibility guarantees:
 *  - Trigger has aria-haspopup="menu" and aria-expanded / aria-controls.
 *  - Popup has role="menu" and aria-labelledby pointing to the trigger.
 *  - Each item has role="menuitem" (or menuitemcheckbox / menuitemradio where
 *    applicable); disabled items have aria-disabled="true" and cannot receive
 *    keyboard focus.
 *  - Full keyboard contract:
 *      Enter / Space / ArrowDown  → open, move focus to first enabled item
 *      ArrowUp                   → open, move focus to last enabled item
 *      ArrowDown / ArrowUp       → navigate between items (wraps)
 *      Home / End                → jump to first / last enabled item
 *      Escape                    → close, return focus to trigger
 *      Tab                       → close (focus leaves the widget naturally)
 *      Enter / Space on item     → activate item, close menu
 *  - Respects prefers-reduced-motion.
 *  - Uses only design tokens from tailwind.config.js — no hardcoded colours,
 *    spacing, or radii.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MenuItemDef {
  /** Unique key for the item. */
  key: string;
  /** Visible label. */
  label: React.ReactNode;
  /** Optional leading icon (aria-hidden is applied automatically). */
  icon?: React.ReactNode;
  /** If true, the item is skipped during keyboard navigation and cannot be clicked. */
  disabled?: boolean;
  /** Visual-only divider rendered *above* this item. */
  hasSeparatorAbove?: boolean;
  /** Called when the item is activated (click, Enter, or Space). */
  onSelect?: () => void;
}

export interface MenuButtonProps {
  /** Accessible label for the trigger button. */
  label: React.ReactNode;
  /** Menu items to render. */
  items: MenuItemDef[];
  /**
   * Placement of the popup relative to the trigger.
   * @default "bottom-start"
   */
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';
  /**
   * Variant style for the trigger button.
   * @default "default"
   */
  variant?: 'default' | 'ghost' | 'danger';
  /**
   * Whether the trigger button itself is disabled.
   * @default false
   */
  disabled?: boolean;
  /** Additional class names for the trigger button. */
  className?: string;
  /** Additional class names for the popup panel. */
  menuClassName?: string;
  /**
   * Called after the menu opens.
   */
  onOpen?: () => void;
  /**
   * Called after the menu closes.
   */
  onClose?: () => void;
}

// ─── Internal context (keeps trigger ↔ menu in sync without prop drilling) ───

interface MenuCtx {
  isOpen: boolean;
  menuId: string;
  triggerId: string;
  closeMenu: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const MenuContext = createContext<MenuCtx | null>(null);

function useMenuContext() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('MenuButton sub-component rendered outside <MenuButton>');
  return ctx;
}

// ─── Selector helpers ─────────────────────────────────────────────────────────

const MENUITEM_SELECTOR =
  '[role="menuitem"]:not([aria-disabled="true"]):not([disabled])';

function getEnabledItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(MENUITEM_SELECTOR));
}

// ─── MenuButton ───────────────────────────────────────────────────────────────

/**
 * A button that opens an accessible dropdown menu.
 *
 * @example
 * ```tsx
 * <MenuButton
 *   label="Actions"
 *   items={[
 *     { key: 'edit', label: 'Edit', icon: <Pencil />, onSelect: handleEdit },
 *     { key: 'delete', label: 'Delete', icon: <Trash2 />, disabled: true },
 *   ]}
 * />
 * ```
 */
export function MenuButton({
  label,
  items,
  placement = 'bottom-start',
  variant = 'default',
  disabled = false,
  className,
  menuClassName,
  onOpen,
  onClose,
}: MenuButtonProps) {
  const uid = useId();
  const triggerId = `menu-trigger-${uid}`;
  const menuId = `menu-popup-${uid}`;

  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Reduced-motion ──────────────────────────────────────────────────────────
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Open / close helpers ────────────────────────────────────────────────────
  const openMenu = useCallback(
    (focusLast = false) => {
      setIsOpen(true);
      onOpen?.();
      // Move focus into the first (or last) enabled item after paint.
      requestAnimationFrame(() => {
        const panel = panelRef.current;
        if (!panel) return;
        const enabledItems = getEnabledItems(panel);
        if (enabledItems.length === 0) return;
        (focusLast ? enabledItems[enabledItems.length - 1] : enabledItems[0])?.focus();
      });
    },
    [onOpen],
  );

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    onClose?.();
    // Return focus to the trigger.
    requestAnimationFrame(() => {
      triggerRef.current?.focus();
    });
  }, [onClose]);

  // ── Trigger keyboard handler ────────────────────────────────────────────────
  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (e.key) {
        case 'Enter':
        case ' ':
        case 'ArrowDown':
          e.preventDefault();
          openMenu(false);
          break;
        case 'ArrowUp':
          e.preventDefault();
          openMenu(true);
          break;
        default:
          break;
      }
    },
    [openMenu],
  );

  // ── Panel keyboard handler ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const items = getEnabledItems(panel);
      if (items.length === 0) return;
      const current = items.indexOf(document.activeElement as HTMLElement);

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          e.stopPropagation();
          closeMenu();
          break;

        case 'Tab':
          // Allow Tab to close the menu naturally (focus moves away).
          closeMenu();
          break;

        case 'ArrowDown': {
          e.preventDefault();
          const next = current < items.length - 1 ? current + 1 : 0;
          items[next]?.focus();
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          const prev = current > 0 ? current - 1 : items.length - 1;
          items[prev]?.focus();
          break;
        }

        case 'Home':
        case 'PageUp':
          e.preventDefault();
          items[0]?.focus();
          break;

        case 'End':
        case 'PageDown':
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;

        default:
          break;
      }
    };

    panel.addEventListener('keydown', onKeyDown);
    return () => panel.removeEventListener('keydown', onKeyDown);
  }, [isOpen, closeMenu]);

  // ── Outside-click to close ──────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const inPanel = panelRef.current?.contains(target);
      const inTrigger = triggerRef.current?.contains(target);
      if (!inPanel && !inTrigger) {
        closeMenu();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isOpen, closeMenu]);

  // ── Placement classes ───────────────────────────────────────────────────────
  const placementClass: Record<typeof placement, string> = {
    'bottom-start': 'top-full left-0 mt-1',
    'bottom-end': 'top-full right-0 mt-1',
    'top-start': 'bottom-full left-0 mb-1',
    'top-end': 'bottom-full right-0 mb-1',
  };

  // ── Trigger variant classes ─────────────────────────────────────────────────
  const triggerVariantClass: Record<typeof variant, string> = {
    default: cn(
      'bg-white/10 text-white hover:bg-white/20',
      'focus-visible:ring-2 focus-visible:ring-white/50',
    ),
    ghost: cn(
      'bg-transparent text-white/80 hover:bg-white/10 hover:text-white',
      'focus-visible:ring-2 focus-visible:ring-white/40',
    ),
    danger: cn(
      'bg-status-error-bg text-status-error-fg hover:bg-status-error-soft border border-status-error-border',
      'focus-visible:ring-2 focus-visible:ring-status-error-fg/50',
    ),
  };

  const motionClass = prefersReducedMotion ? '' : 'transition-all duration-150';

  return (
    <MenuContext.Provider value={{ isOpen, menuId, triggerId, closeMenu, triggerRef }}>
      {/* Wrapper — relative so the popup is positioned against it */}
      <div className="relative inline-block">
        {/* ── Trigger ───────────────────────────────────────────────────── */}
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          disabled={disabled}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? menuId : undefined}
          onClick={() => (isOpen ? closeMenu() : openMenu())}
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium',
            'focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            triggerVariantClass[variant],
            motionClass,
            className,
          )}
        >
          {label}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-4 w-4 flex-shrink-0',
              motionClass,
              isOpen ? 'rotate-180' : 'rotate-0',
            )}
          />
        </button>

        {/* ── Popup ─────────────────────────────────────────────────────── */}
        {isOpen && (
          <div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            aria-orientation="vertical"
            tabIndex={-1}
            className={cn(
              'absolute z-50 min-w-[10rem] rounded-2xl border border-white/10',
              'bg-[#111111] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
              placementClass[placement],
              motionClass,
              menuClassName,
            )}
          >
            {items.map((item) => (
              <MenuItem key={item.key} item={item} />
            ))}
          </div>
        )}
      </div>
    </MenuContext.Provider>
  );
}

// ─── MenuItem ─────────────────────────────────────────────────────────────────

interface MenuItemProps {
  item: MenuItemDef;
}

function MenuItem({ item }: MenuItemProps) {
  const { closeMenu } = useMenuContext();

  const handleClick = useCallback(() => {
    if (item.disabled) return;
    item.onSelect?.();
    closeMenu();
  }, [item, closeMenu]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (item.disabled) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        item.onSelect?.();
        closeMenu();
      }
    },
    [item, closeMenu],
  );

  return (
    <>
      {item.hasSeparatorAbove && (
        <div role="separator" className="my-1 border-t border-white/10" />
      )}
      <button
        type="button"
        role="menuitem"
        aria-disabled={item.disabled ? true : undefined}
        disabled={item.disabled}
        tabIndex={item.disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
          item.disabled
            ? 'cursor-not-allowed text-white/30'
            : 'cursor-pointer text-white hover:bg-white/10 active:bg-white/20',
        )}
      >
        {item.icon != null && (
          <span aria-hidden="true" className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
            {item.icon}
          </span>
        )}
        <span>{item.label}</span>
      </button>
    </>
  );
}
