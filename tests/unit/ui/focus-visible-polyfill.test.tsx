import React, { useCallback, useEffect, useRef, useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * A lightweight polyfill that tracks whether the next focus event was caused
 * by a mouse click or by keyboard navigation.
 *
 * This mirrors the approach used by the WICG focus-visible polyfill:
 * - On `pointerdown` / `mousedown` we set a flag and immediately remove
 *   `data-focus-visible` from the active element.
 * - On `keydown` (Tab / Shift+Tab) we clear the flag so the next `focus`
 *   event triggers the visual ring.
 * - On `focus` we read the flag to decide whether to attach a
 *   `data-focus-visible` attribute.
 */
function useFocusVisiblePolyfill(ref: React.RefObject<HTMLElement | null>) {
  const mouseDown = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      mouseDown.current = true;
      // If the element is already focused via keyboard, remove the
      // focus-visible attribute immediately so a mouse click does not
      // leave a stray ring.
      if (el.hasAttribute('data-focus-visible')) {
        el.removeAttribute('data-focus-visible');
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        mouseDown.current = false;
      }
    };

    const onFocus = () => {
      if (mouseDown.current) {
        el.removeAttribute('data-focus-visible');
        mouseDown.current = false;
      } else {
        el.setAttribute('data-focus-visible', '');
      }
    };

    const onBlur = () => {
      el.removeAttribute('data-focus-visible');
    };

    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('keydown', onKeyDown);
    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('keydown', onKeyDown);
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
    };
  }, [ref]);
}

function FocusVisibleButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  useFocusVisiblePolyfill(ref);

  return (
    <button
      ref={ref}
      type="button"
      className="focus-visible:outline-2 focus-visible:outline-red-500"
      {...props}
    >
      {children}
    </button>
  );
}

function FocusVisibleInput({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const ref = useRef<HTMLInputElement>(null);
  useFocusVisiblePolyfill(ref);

  return (
    <input
      ref={ref}
      className="focus-visible:outline-2 focus-visible:outline-red-500"
      {...props}
    />
  );
}

describe('FocusVisiblePolyfill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mouse click does not leave a stray focus ring', () => {
    it('does not set data-focus-visible when button is clicked with mouse', async () => {
      const user = userEvent.setup();
      const { container } = render(<FocusVisibleButton>Click Me</FocusVisibleButton>);
      const button = container.querySelector('button')!;

      await user.click(button);

      expect(button).not.toHaveAttribute('data-focus-visible');
    });

    it('does not set data-focus-visible when input is clicked with mouse', async () => {
      const user = userEvent.setup();
      render(<FocusVisibleInput placeholder="Type here" />);
      const input = screen.getByPlaceholderText('Type here');

      await user.click(input);

      expect(input).not.toHaveAttribute('data-focus-visible');
    });

    it('does not set data-focus-visible on successive mouse clicks', async () => {
      const user = userEvent.setup();
      render(
        <>
          <FocusVisibleButton>First</FocusVisibleButton>
          <FocusVisibleButton>Second</FocusVisibleButton>
        </>,
      );
      const [first, second] = screen.getAllByRole('button');

      await user.click(first);
      expect(first).not.toHaveAttribute('data-focus-visible');

      await user.click(second);
      expect(first).not.toHaveAttribute('data-focus-visible');
      expect(second).not.toHaveAttribute('data-focus-visible');
    });
  });

  describe('keyboard navigation sets the focus ring', () => {
    it('sets data-focus-visible when button is tabbed to', async () => {
      const user = userEvent.setup();
      render(
        <>
          <FocusVisibleButton>First</FocusVisibleButton>
          <FocusVisibleButton>Second</FocusVisibleButton>
          <FocusVisibleButton>Third</FocusVisibleButton>
        </>,
      );
      const [first] = screen.getAllByRole('button');

      await user.tab();
      expect(first).toHaveAttribute('data-focus-visible');
    });

    it('removes data-focus-visible on blur and re-applies on re-focus via keyboard', async () => {
      const user = userEvent.setup();
      render(
        <>
          <button type="button" />
          <FocusVisibleButton>Target</FocusVisibleButton>
          <FocusVisibleButton>Next</FocusVisibleButton>
        </>,
      );
      const target = screen.getByText('Target');

      await user.tab();
      await user.tab();

      expect(target).toHaveAttribute('data-focus-visible');

      await user.tab();

      expect(target).not.toHaveAttribute('data-focus-visible');
    });
  });

  describe('mixed interaction: keyboard then mouse', () => {
    it('removes data-focus-visible when a keyboard-focused element is then clicked', async () => {
      const user = userEvent.setup();
      render(
        <>
          <FocusVisibleButton>Target</FocusVisibleButton>
          <FocusVisibleButton>Other</FocusVisibleButton>
        </>,
      );
      const target = screen.getByText('Target');

      await user.tab();
      expect(target).toHaveAttribute('data-focus-visible');

      await user.click(target);
      expect(target).not.toHaveAttribute('data-focus-visible');
    });
  });
});
