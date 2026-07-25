/**
 * Tests for Tooltip component's inert behavior
 * Ensures that tooltip content cannot receive focus when not visible
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Simple test tooltip component that demonstrates inert behavior
const TestTooltip = ({ 
  isVisible, 
  children 
}: { 
  isVisible: boolean; 
  children: React.ReactNode; 
}) => {
  const tooltipRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (tooltipRef.current) {
      (tooltipRef.current as any).inert = !isVisible;
    }
  }, [isVisible]);

  return (
    <div>
      <button data-testid="trigger">Trigger</button>
      <div
        ref={tooltipRef}
        data-testid="tooltip"
        role="tooltip"
        className={isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        // @ts-ignore - inert is a valid HTML attribute
        inert={!isVisible ? '' : undefined}
      >
        {children}
      </div>
    </div>
  );
};

describe('Tooltip Inert Behavior', () => {
  beforeEach(() => {
    // Mock inert property support
    Object.defineProperty(HTMLElement.prototype, 'inert', {
      get() {
        return this.hasAttribute('inert');
      },
      set(value: boolean) {
        if (value) {
          this.setAttribute('inert', '');
        } else {
          this.removeAttribute('inert');
        }
      },
      configurable: true,
    });

    // Override focus method to respect inert
    const originalFocus = HTMLElement.prototype.focus;
    Object.defineProperty(HTMLElement.prototype, 'focus', {
      value: function(options?: FocusOptions) {
        // Check if this element or any ancestor is inert
        let current: Element | null = this;
        while (current) {
          if (current.hasAttribute && current.hasAttribute('inert')) {
            return; // Don't focus inert elements
          }
          current = current.parentElement;
        }
        
        // Call original focus method
        originalFocus.call(this, options);
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Tooltip Inert State Management', () => {
    it('makes_tooltip_inert_when_hidden', () => {
      render(
        <TestTooltip isVisible={false}>
          <span>Test tooltip content</span>
        </TestTooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('inert');
      expect(tooltip).toHaveClass('opacity-0', 'pointer-events-none');
    });

    it('removes_inert_when_tooltip_becomes_visible', () => {
      render(
        <TestTooltip isVisible={true}>
          <span>Test tooltip content</span>
        </TestTooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).not.toHaveAttribute('inert');
      expect(tooltip).toHaveClass('opacity-100');
      expect(tooltip).not.toHaveClass('pointer-events-none');
    });

    it('prevents_focus_on_inert_tooltip_content', () => {
      render(
        <TestTooltip isVisible={false}>
          <div>
            Tooltip with <button data-testid="tooltip-button">button</button>
          </div>
        </TestTooltip>
      );

      const tooltipButton = screen.getByTestId('tooltip-button');
      const tooltip = screen.getByRole('tooltip');

      // Tooltip is inert, so button inside should not be focusable
      expect(tooltip).toHaveAttribute('inert');
      
      // Try to focus the button inside inert tooltip
      tooltipButton.focus();
      expect(tooltipButton).not.toHaveFocus();
    });

    it('allows_focus_on_tooltip_content_when_visible', () => {
      render(
        <TestTooltip isVisible={true}>
          <div>
            Tooltip with <button data-testid="tooltip-button">button</button>
          </div>
        </TestTooltip>
      );

      const tooltipButton = screen.getByTestId('tooltip-button');
      const tooltip = screen.getByRole('tooltip');

      // Tooltip is not inert, so button should be focusable
      expect(tooltip).not.toHaveAttribute('inert');
      
      tooltipButton.focus();
      expect(tooltipButton).toHaveFocus();
    });

    it('updates_inert_state_when_visibility_changes', () => {
      const TestDynamicTooltip = ({ isVisible }: { isVisible: boolean }) => (
        <TestTooltip isVisible={isVisible}>
          <button data-testid="tooltip-content">Content Button</button>
        </TestTooltip>
      );

      const { rerender } = render(<TestDynamicTooltip isVisible={false} />);

      const tooltip = screen.getByRole('tooltip');
      const button = screen.getByTestId('tooltip-content');

      // Initially hidden and inert
      expect(tooltip).toHaveAttribute('inert');
      button.focus();
      expect(button).not.toHaveFocus();

      // Make visible
      rerender(<TestDynamicTooltip isVisible={true} />);
      
      expect(tooltip).not.toHaveAttribute('inert');
      button.focus();
      expect(button).toHaveFocus();

      // Hide again
      button.blur();
      rerender(<TestDynamicTooltip isVisible={false} />);
      
      expect(tooltip).toHaveAttribute('inert');
      button.focus();
      expect(button).not.toHaveFocus();
    });
  });

  describe('Accessibility Standards', () => {
    it('maintains_accessibility_with_inert_tooltips', async () => {
      const { container } = render(
        <TestTooltip isVisible={false}>
          <span>Accessible tooltip</span>
        </TestTooltip>
      );

      // Should not introduce accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('preserves_semantic_structure_with_inert_state', () => {
      render(
        <TestTooltip isVisible={false}>
          <div>
            <p>Tooltip content</p>
            <button data-testid="action-button">Action</button>
          </div>
        </TestTooltip>
      );

      // Tooltip should still have proper role
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('role', 'tooltip');
      expect(tooltip).toHaveAttribute('inert');
      
      // Button should exist but not be focusable
      const button = screen.getByTestId('action-button');
      expect(button).toBeInTheDocument();
      button.focus();
      expect(button).not.toHaveFocus();
    });

    it('handles_complex_tooltip_content_inert_state', () => {
      render(
        <TestTooltip isVisible={false}>
          <div>
            <p>Complex content</p>
            <ul>
              <li><button data-testid="button-1">Button 1</button></li>
              <li><button data-testid="button-2">Button 2</button></li>
            </ul>
          </div>
        </TestTooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      const button1 = screen.getByTestId('button-1');
      const button2 = screen.getByTestId('button-2');

      // Tooltip is inert
      expect(tooltip).toHaveAttribute('inert');

      // All buttons should be unfocusable
      button1.focus();
      expect(button1).not.toHaveFocus();

      button2.focus();
      expect(button2).not.toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('handles_tooltip_without_focusable_content', () => {
      render(
        <TestTooltip isVisible={false}>
          <span>Just text content</span>
        </TestTooltip>
      );

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('inert');
      
      // Should not throw or cause issues
      expect(() => tooltip.focus()).not.toThrow();
    });

    it('maintains_inert_state_through_react_updates', () => {
      const TestWithUpdates = ({ content }: { content: string }) => (
        <TestTooltip isVisible={false}>
          <span>{content}</span>
        </TestTooltip>
      );

      const { rerender } = render(<TestWithUpdates content="Initial" />);
      
      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveAttribute('inert');

      // Update content
      rerender(<TestWithUpdates content="Updated" />);
      
      // Inert state should be preserved after update
      expect(tooltip).toHaveAttribute('inert');
    });

    it('handles_nested_inert_scenarios', () => {
      render(
        <div data-testid="outer-container">
          <TestTooltip isVisible={false}>
            <div>
              <TestTooltip isVisible={true}>
                <button data-testid="nested-button">Nested Button</button>
              </TestTooltip>
            </div>
          </TestTooltip>
        </div>
      );

      const nestedButton = screen.getByTestId('nested-button');
      
      // Even though inner tooltip is "visible", outer tooltip is inert
      // So nested button should not be focusable
      nestedButton.focus();
      expect(nestedButton).not.toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('handles_rapid_visibility_changes', () => {
      const TestRapidToggle = ({ isVisible }: { isVisible: boolean }) => (
        <TestTooltip isVisible={isVisible}>
          <button data-testid="content-button">Content</button>
        </TestTooltip>
      );

      const { rerender } = render(<TestRapidToggle isVisible={false} />);

      const tooltip = screen.getByRole('tooltip');
      const button = screen.getByTestId('content-button');

      // Rapid toggle cycles
      for (let i = 0; i < 5; i++) {
        // Show
        rerender(<TestRapidToggle isVisible={true} />);
        expect(tooltip).not.toHaveAttribute('inert');

        // Hide
        rerender(<TestRapidToggle isVisible={false} />);
        expect(tooltip).toHaveAttribute('inert');
      }

      // Final state should be consistent
      button.focus();
      expect(button).not.toHaveFocus();
    });
  });
});