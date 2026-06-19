/**
 * Component tests for Toast
 * Tests individual toast rendering, variants, interactions, and accessibility
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Toast from './Toast';
import type { Toast as ToastType } from '@/lib/context/ToastContext';

// Extend Vitest expect with jest-axe matchers
expect.extend(toHaveNoViolations);

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockToast: ToastType = {
    id: 'test-toast-1',
    variant: 'success',
    title: 'Test Toast',
    description: 'Test description',
    duration: 5000,
  };

  const mockOnDismiss = vi.fn();

  describe('Rendering', () => {
    it('should render toast with title', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('Test Toast')).toBeInTheDocument();
    });

    it('should render toast with description when provided', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const toastWithoutDesc: ToastType = {
        id: 'test-2',
        variant: 'info',
        title: 'No Description',
      };
      render(<Toast toast={toastWithoutDesc} onDismiss={mockOnDismiss} />);
      expect(screen.queryByText('Test description')).not.toBeInTheDocument();
    });

    it('should render action button when provided', () => {
      const actionClick = vi.fn();
      const toastWithAction: ToastType = {
        id: 'test-3',
        variant: 'info',
        title: 'With Action',
        action: { label: 'Click Me', onClick: actionClick },
      };
      render(<Toast toast={toastWithAction} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('Click Me')).toBeInTheDocument();
    });

    it('should render dismiss button', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render success variant', () => {
      const successToast: ToastType = { ...mockToast, variant: 'success' };
      const { container } = render(<Toast toast={successToast} onDismiss={mockOnDismiss} />);
      const toastElement = container.querySelector('[role="status"]');
      expect(toastElement).toHaveClass('border-status-success-border', 'bg-status-success-soft');
    });

    it('should render error variant', () => {
      const errorToast: ToastType = { ...mockToast, variant: 'error' };
      const { container } = render(<Toast toast={errorToast} onDismiss={mockOnDismiss} />);
      const toastElement = container.querySelector('[role="status"]');
      expect(toastElement).toHaveClass('border-status-error-border', 'bg-status-error-soft');
    });

    it('should render warning variant', () => {
      const warningToast: ToastType = { ...mockToast, variant: 'warning' };
      const { container } = render(<Toast toast={warningToast} onDismiss={mockOnDismiss} />);
      const toastElement = container.querySelector('[role="status"]');
      expect(toastElement).toHaveClass('border-status-warning-border', 'bg-status-warning-soft');
    });

    it('should render info variant', () => {
      const infoToast: ToastType = { ...mockToast, variant: 'info' };
      const { container } = render(<Toast toast={infoToast} onDismiss={mockOnDismiss} />);
      const toastElement = container.querySelector('[role="status"]');
      expect(toastElement).toHaveClass('border-status-info-border', 'bg-status-info-soft');
    });
  });

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have role="status"', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
    });

    it('should have aria-atomic="true"', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = screen.getByRole('status');
      expect(toast).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have aria-hidden="true" on icon', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const icon = document.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('should have aria-label on dismiss button', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toBeInTheDocument();
    });

    it('should have focus-visible ring on dismiss button', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const dismissButton = screen.getByLabelText('Dismiss notification');
      expect(dismissButton).toHaveClass('focus-visible:ring-2');
    });
  });

  describe('Interactions', () => {
    it('should call onDismiss when dismiss button is clicked', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);
      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
    });

    it('should call action onClick when action button is clicked', () => {
      const actionClick = vi.fn();
      const toastWithAction: ToastType = {
        ...mockToast,
        action: { label: 'Action', onClick: actionClick },
      };
      render(<Toast toast={toastWithAction} onDismiss={mockOnDismiss} />);
      const actionButton = screen.getByText('Action');
      fireEvent.click(actionButton);
      expect(actionClick).toHaveBeenCalledTimes(1);
    });

    it('should pause timer on mouse enter', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = screen.getByRole('status');
      fireEvent.mouseEnter(toast);
      // Timer should be paused - verify by advancing timers
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should resume timer on mouse leave', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = screen.getByRole('status');
      
      // Pause
      fireEvent.mouseEnter(toast);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(mockOnDismiss).not.toHaveBeenCalled();
      
      // Resume
      fireEvent.mouseLeave(toast);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
    });

    it('should pause timer on focus', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = screen.getByRole('status');
      fireEvent.focus(toast);
      act(() => {
        vi.advanceTimersByTime(6000);
      });
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should resume timer on blur', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = screen.getByRole('status');
      
      // Pause
      fireEvent.focus(toast);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(mockOnDismiss).not.toHaveBeenCalled();
      
      // Resume
      fireEvent.blur(toast);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
    });
  });

  describe('Auto-dismiss', () => {
    it('should auto-dismiss after duration', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
    });

    it('should not auto-dismiss when duration is 0', () => {
      const persistentToast: ToastType = { ...mockToast, duration: 0 };
      render(<Toast toast={persistentToast} onDismiss={mockOnDismiss} />);
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });

    it('should use custom duration when provided', () => {
      const customDurationToast: ToastType = { ...mockToast, duration: 3000 };
      render(<Toast toast={customDurationToast} onDismiss={mockOnDismiss} />);
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(mockOnDismiss).toHaveBeenCalledWith('test-toast-1');
    });

    it('should clear timer on unmount', () => {
      const { unmount } = render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      unmount();
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(mockOnDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have correct base classes', () => {
      const { container } = render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = container.querySelector('[role="status"]');
      expect(toast).toHaveClass('flex', 'w-full', 'max-w-sm', 'items-start', 'gap-3', 'rounded-2xl');
    });

    it('should have shadow', () => {
      const { container } = render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = container.querySelector('[role="status"]');
      expect(toast).toHaveClass('shadow-lg');
    });

    it('should have backdrop blur', () => {
      const { container } = render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = container.querySelector('[role="status"]');
      expect(toast).toHaveClass('backdrop-blur-md');
    });

    it('should have animation classes', () => {
      const { container } = render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const toast = container.querySelector('[role="status"]');
      expect(toast).toHaveClass('animate-slide-in-bottom');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long titles', () => {
      const longTitleToast: ToastType = {
        ...mockToast,
        title: 'A'.repeat(200),
      };
      render(<Toast toast={longTitleToast} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle very long descriptions', () => {
      const longDescToast: ToastType = {
        ...mockToast,
        description: 'B'.repeat(500),
      };
      render(<Toast toast={longDescToast} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('B'.repeat(500))).toBeInTheDocument();
    });

    it('should handle special characters in title', () => {
      const specialToast: ToastType = {
        ...mockToast,
        title: 'Test <script>alert("xss")</script>',
      };
      render(<Toast toast={specialToast} onDismiss={mockOnDismiss} />);
      expect(screen.getByText('Test <script>alert("xss")</script>')).toBeInTheDocument();
    });

    it('should handle multiple rapid dismiss calls', () => {
      render(<Toast toast={mockToast} onDismiss={mockOnDismiss} />);
      const dismissButton = screen.getByLabelText('Dismiss notification');
      fireEvent.click(dismissButton);
      fireEvent.click(dismissButton);
      fireEvent.click(dismissButton);
      expect(mockOnDismiss).toHaveBeenCalledTimes(3);
    });
  });
});
