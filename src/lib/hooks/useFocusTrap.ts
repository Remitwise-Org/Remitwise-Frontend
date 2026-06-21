import { useEffect, useRef, useCallback } from 'react';

interface UseFocusTrapProps {
  isActive: boolean;
  onEscape?: () => void;
  onOverlayClick?: () => void;
  restoreFocusOnClose?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

/**
 * A custom hook that traps focus within a modal/dialog container.
 * Also handles ESC key to close and overlay clicks.
 *
 * @param isActive - Whether the focus trap is active (modal open)
 * @param onEscape - Callback when ESC key is pressed
 * @param onOverlayClick - Callback when overlay/backdrop is clicked
 * @param restoreFocusOnClose - Whether to restore focus to the element that opened the modal
 * @param initialFocusRef - Ref to the element that should receive initial focus
 *
 * @example
 * ```tsx
 * const modalRef = useRef<HTMLDivElement>(null);
 * useFocusTrap({
 *   isActive: isOpen,
 *   onEscape: onClose,
 *   onOverlayClick: onClose,
 *   restoreFocusOnClose: true,
 * });
 * ```
 */
export function useFocusTrap({
  isActive,
  onEscape,
  onOverlayClick,
  restoreFocusOnClose = true,
  initialFocusRef,
}: UseFocusTrapProps): void {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Check if user prefers reduced motion
  const prefersReducedMotion = useCallback(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Get all focusable elements within the modal
  const getFocusableElements = useCallback((container: HTMLElement): HTMLElement[] => {
    const selectors = [
      'button:not([disabled])',
      'a[href]:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'details summary',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ];
    const elements = container.querySelectorAll<HTMLElement>(selectors.join(','));
    return Array.from(elements).filter((el) => !el.hasAttribute('aria-hidden'));
  }, []);

  // Handle focus trapping
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        // Use requestAnimationFrame for smooth transition
        requestAnimationFrame(() => {
          onEscape();
        });
        return;
      }

      if (event.key !== 'Tab') return;

      const container = modalRef.current;
      if (!container) return;

      const focusable = getFocusableElements(container);
      if (focusable.length === 0) return;

      const firstFocusable = focusable[0];
      const lastFocusable = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
        return;
      }
    },
    [onEscape, getFocusableElements]
  );

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const container = modalRef.current;
      if (!container) return;

      if (event.target instanceof Node && container.contains(event.target) && event.target === container) {
        if (onOverlayClick) {
          onOverlayClick();
        }
      }
    },
    [onOverlayClick]
  );

  // Save previous focus and set initial focus when modal opens
  useEffect(() => {
    if (!isActive) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    // Use reduced motion if preferred
    const delay = prefersReducedMotion() ? 0 : 50;

    const timer = setTimeout(() => {
      const container = modalRef.current;
      if (!container) return;

      let target = initialFocusRef?.current;
      if (!target) {
        const focusable = getFocusableElements(container);
        target = focusable[0] || null;
      }

      if (target) {
        target.focus();
      }
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [isActive, initialFocusRef, getFocusableElements, prefersReducedMotion]);

  // Set up event listeners
  useEffect(() => {
    if (!isActive) return;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px';

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleOverlayClick);
    document.addEventListener('touchstart', handleOverlayClick);

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';

      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleOverlayClick);
      document.removeEventListener('touchstart', handleOverlayClick);

      if (restoreFocusOnClose && previousFocusRef.current) {
        const previousFocus = previousFocusRef.current;
        // Use reduced motion if preferred
        const delay = prefersReducedMotion() ? 0 : 10;
        setTimeout(() => {
          try {
            previousFocus.focus();
          } catch {
            // Silently fail if the element no longer exists
          }
        }, delay);
      }
    };
  }, [isActive, handleKeyDown, handleOverlayClick, restoreFocusOnClose, prefersReducedMotion]);

  return modalRef as any;
}

export default useFocusTrap;
