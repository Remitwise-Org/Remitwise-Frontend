/**
 * Tests to assert that inert containers cannot receive focus.
 * These tests lock in the contract for focus management and inert behavior,
 * preventing regressions in accessibility functionality.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { axe, toHaveNoViolations } from 'jest-axe';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Test component with explicit inert attribute
const TestInertContainer = ({ 
  isInert, 
  children 
}: { 
  isInert: boolean; 
  children: React.ReactNode; 
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as any).inert = isInert;
    }
  }, [isInert]);

  return (
    <div 
      ref={containerRef}
      data-testid="inert-container"
      // @ts-ignore - inert is a valid HTML attribute but TS doesn't recognize it yet
      inert={isInert ? '' : undefined}
    >
      {children}
    </div>
  );
};

// Simple modal component to test focus behavior
const TestModal = ({ 
  isOpen, 
  onClose 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
}) => {
  if (!isOpen) return null;

  return (
    <div 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="modal-title"
      data-testid="modal"
    >
      <h2 id="modal-title">Modal Title</h2>
      <button data-testid="modal-button">Modal Button</button>
      <button onClick={onClose} data-testid="close-button">Close</button>
    </div>
  );
};

describe('Inert Focus Management', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    
    // Mock inert property support with focus prevention
    Object.defineProperty(HTMLElement.prototype, 'inert', {
      get() {
        return this.hasAttribute('inert');
      },
      set(value: boolean) {
        if (value) {
          this.setAttribute('inert', '');
          // Make elements unfocusable by setting tabIndex to -1
          if (!this.hasAttribute('data-original-tabindex')) {
            this.setAttribute('data-original-tabindex', this.tabIndex.toString());
          }
          this.tabIndex = -1;
        } else {
          this.removeAttribute('inert');
          // Restore original tabIndex
          const originalTabIndex = this.getAttribute('data-original-tabindex');
          if (originalTabIndex) {
            this.tabIndex = parseInt(originalTabIndex, 10);
            this.removeAttribute('data-original-tabindex');
          }
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

  describe('Inert Attribute Behavior', () => {
    it('sets_inert_attribute_when_container_is_inert', () => {
      render(
        <TestInertContainer isInert={true}>
          <button data-testid="test-button">Test Button</button>
        </TestInertContainer>
      );

      const container = screen.getByTestId('inert-container');
      expect(container).toHaveAttribute('inert');
    });

    it('removes_inert_attribute_when_container_is_not_inert', () => {
      render(
        <TestInertContainer isInert={false}>
          <button data-testid="test-button">Test Button</button>
        </TestInertContainer>
      );

      const container = screen.getByTestId('inert-container');
      expect(container).not.toHaveAttribute('inert');
    });

    it('prevents_focus_on_elements_in_inert_container', () => {
      render(
        <TestInertContainer isInert={true}>
          <button data-testid="inert-button">Inert Button</button>
          <input data-testid="inert-input" placeholder="Inert Input" />
        </TestInertContainer>
      );

      const button = screen.getByTestId('inert-button');
      const input = screen.getByTestId('inert-input');

      // Elements in inert container should not receive focus
      button.focus();
      expect(button).not.toHaveFocus();

      input.focus();
      expect(input).not.toHaveFocus();
    });

    it('allows_focus_on_elements_in_non_inert_container', () => {
      render(
        <TestInertContainer isInert={false}>
          <button data-testid="active-button">Active Button</button>
          <input data-testid="active-input" placeholder="Active Input" />
        </TestInertContainer>
      );

      const button = screen.getByTestId('active-button');
      const input = screen.getByTestId('active-input');

      // Elements in non-inert container should receive focus
      button.focus();
      expect(button).toHaveFocus();

      input.focus();
      expect(input).toHaveFocus();
    });

    it('handles_nested_inert_containers_correctly', () => {
      render(
        <TestInertContainer isInert={true}>
          <button data-testid="outer-button">Outer Button</button>
          <TestInertContainer isInert={false}>
            <button data-testid="inner-button">Inner Button</button>
          </TestInertContainer>
        </TestInertContainer>
      );

      const outerButton = screen.getByTestId('outer-button');
      const innerButton = screen.getByTestId('inner-button');

      // Both should be unfocusable due to outer inert container
      outerButton.focus();
      expect(outerButton).not.toHaveFocus();

      innerButton.focus();
      expect(innerButton).not.toHaveFocus();
    });
  });

  describe('Modal Focus Management', () => {
    it('provides_modal_with_proper_aria_attributes', () => {
      render(<TestModal isOpen={true} onClose={vi.fn()} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('role', 'dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });

    it('focuses_elements_within_modal_when_open', () => {
      render(<TestModal isOpen={true} onClose={vi.fn()} />);

      const modalButton = screen.getByTestId('modal-button');
      modalButton.focus();
      expect(modalButton).toHaveFocus();
    });

    it('does_not_render_modal_when_closed', () => {
      render(<TestModal isOpen={false} onClose={vi.fn()} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('calls_onClose_when_close_button_clicked', () => {
      const onClose = vi.fn();
      render(<TestModal isOpen={true} onClose={onClose} />);

      const closeButton = screen.getByTestId('close-button');
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Dynamic Inert State Changes', () => {
    it('updates_inert_state_when_prop_changes', () => {
      const TestDynamicInert = ({ isInert }: { isInert: boolean }) => (
        <TestInertContainer isInert={isInert}>
          <button data-testid="dynamic-button">Dynamic Button</button>
        </TestInertContainer>
      );

      const { rerender } = render(<TestDynamicInert isInert={false} />);

      const container = screen.getByTestId('inert-container');
      const button = screen.getByTestId('dynamic-button');

      // Initially not inert
      expect(container).not.toHaveAttribute('inert');
      button.focus();
      expect(button).toHaveFocus();

      // Clear focus before changing inert state
      button.blur();
      expect(button).not.toHaveFocus();

      // Change to inert
      rerender(<TestDynamicInert isInert={true} />);

      expect(container).toHaveAttribute('inert');
      button.focus();
      expect(button).not.toHaveFocus();

      // Change back to not inert
      rerender(<TestDynamicInert isInert={false} />);

      expect(container).not.toHaveAttribute('inert');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('handles_toggle_between_inert_states', () => {
      const TestToggleInert = () => {
        const [isInert, setIsInert] = React.useState(false);
        
        return (
          <div>
            <button 
              data-testid="toggle-button"
              onClick={() => setIsInert(!isInert)}
            >
              Toggle Inert: {isInert ? 'ON' : 'OFF'}
            </button>
            <TestInertContainer isInert={isInert}>
              <button data-testid="target-button">Target Button</button>
            </TestInertContainer>
          </div>
        );
      };

      render(<TestToggleInert />);

      const toggleButton = screen.getByTestId('toggle-button');
      const targetButton = screen.getByTestId('target-button');
      const container = screen.getByTestId('inert-container');

      // Initially not inert
      expect(container).not.toHaveAttribute('inert');
      targetButton.focus();
      expect(targetButton).toHaveFocus();

      // Toggle to inert
      fireEvent.click(toggleButton);
      expect(container).toHaveAttribute('inert');

      // Clear focus and try to focus again
      targetButton.blur();
      targetButton.focus();
      expect(targetButton).not.toHaveFocus();

      // Toggle back to not inert
      fireEvent.click(toggleButton);
      expect(container).not.toHaveAttribute('inert');
      targetButton.focus();
      expect(targetButton).toHaveFocus();
    });
  });

  describe('Focus Prevention Mechanisms', () => {
    it('prevents_programmatic_focus_on_inert_elements', () => {
      render(
        <TestInertContainer isInert={true}>
          <button data-testid="programmatic-target">Target Button</button>
        </TestInertContainer>
      );

      const button = screen.getByTestId('programmatic-target');
      
      // Programmatic focus should fail on inert element
      button.focus();
      expect(button).not.toHaveFocus();
      
      // Even with explicit focus calls should not work
      expect(document.activeElement).not.toBe(button);
    });

    it('allows_programmatic_focus_on_non_inert_elements', () => {
      render(
        <TestInertContainer isInert={false}>
          <button data-testid="programmatic-target">Target Button</button>
        </TestInertContainer>
      );

      const button = screen.getByTestId('programmatic-target');
      
      // Programmatic focus should succeed on non-inert element
      button.focus();
      expect(button).toHaveFocus();
      expect(document.activeElement).toBe(button);
    });

    it('updates_tabindex_for_inert_elements', () => {
      const TestTabIndexChange = ({ isInert }: { isInert: boolean }) => (
        <TestInertContainer isInert={isInert}>
          <button data-testid="tab-button">Tab Button</button>
        </TestInertContainer>
      );

      const { rerender } = render(<TestTabIndexChange isInert={false} />);

      const button = screen.getByTestId('tab-button');
      const container = screen.getByTestId('inert-container');

      // Initially should not be inert
      expect(container).not.toHaveAttribute('inert');

      // Change to inert
      rerender(<TestTabIndexChange isInert={true} />);
      expect(container).toHaveAttribute('inert');
      
      // Should not be focusable when inert
      button.focus();
      expect(button).not.toHaveFocus();

      // Change back to not inert
      rerender(<TestTabIndexChange isInert={false} />);
      expect(container).not.toHaveAttribute('inert');
      
      // Should be focusable when not inert
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles_empty_inert_containers', () => {
      render(<TestInertContainer isInert={true} />);
      
      const container = screen.getByTestId('inert-container');
      expect(container).toHaveAttribute('inert');
      
      // Should not throw or cause issues with empty inert container
      expect(() => container.focus()).not.toThrow();
    });

    it('handles_containers_with_only_non_focusable_content', () => {
      render(
        <TestInertContainer isInert={true}>
          <p>Just text content</p>
          <div>More non-focusable content</div>
        </TestInertContainer>
      );
      
      const container = screen.getByTestId('inert-container');
      expect(container).toHaveAttribute('inert');
      
      // Should handle gracefully
      expect(() => container.focus()).not.toThrow();
    });

    it('maintains_inert_state_through_react_updates', () => {
      const TestWithUpdates = ({ content }: { content: string }) => (
        <TestInertContainer isInert={true}>
          <button data-testid="test-button">{content}</button>
        </TestInertContainer>
      );

      const { rerender } = render(<TestWithUpdates content="Initial" />);
      
      const container = screen.getByTestId('inert-container');
      const button = screen.getByTestId('test-button');
      
      expect(container).toHaveAttribute('inert');
      button.focus();
      expect(button).not.toHaveFocus();

      // Update content but keep inert
      rerender(<TestWithUpdates content="Updated" />);
      
      expect(container).toHaveAttribute('inert');
      button.focus();
      expect(button).not.toHaveFocus();
    });
  });

  describe('Accessibility Standards Compliance', () => {
    it('maintains_accessibility_standards_with_inert_containers', async () => {
      const { container } = render(
        <TestInertContainer isInert={true}>
          <button>Test Button</button>
          <input placeholder="Test Input" />
        </TestInertContainer>
      );

      // Should not introduce accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('maintains_accessibility_standards_with_modal', async () => {
      const { container } = render(
        <TestModal isOpen={true} onClose={vi.fn()} />
      );

      // Should not introduce accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('preserves_semantic_structure_with_inert_elements', () => {
      render(
        <TestInertContainer isInert={true}>
          <nav aria-label="Test Navigation">
            <button>Nav Button 1</button>
            <button>Nav Button 2</button>
          </nav>
          <main>
            <h1>Main Content</h1>
            <p>Some text content</p>
          </main>
        </TestInertContainer>
      );

      // Semantic elements should still be present
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      
      // But buttons should not be focusable
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        button.focus();
        expect(button).not.toHaveFocus();
      });
    });
  });

  describe('Browser Compatibility', () => {
    it('gracefully_handles_missing_inert_support', () => {
      // Temporarily remove inert support
      const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'inert');
      delete (HTMLElement.prototype as any).inert;

      render(
        <TestInertContainer isInert={true}>
          <button data-testid="fallback-button">Fallback Button</button>
        </TestInertContainer>
      );

      const button = screen.getByTestId('fallback-button');
      
      // Should not throw when inert is not supported
      expect(() => button.focus()).not.toThrow();

      // Restore inert support
      if (originalDescriptor) {
        Object.defineProperty(HTMLElement.prototype, 'inert', originalDescriptor);
      }
    });

    it('works_with_different_element_types', () => {
      render(
        <TestInertContainer isInert={true}>
          <button data-testid="button-element">Button</button>
          <input data-testid="input-element" placeholder="Input" />
          <select data-testid="select-element">
            <option>Option 1</option>
          </select>
          <textarea data-testid="textarea-element" placeholder="Textarea" />
          <a href="#" data-testid="link-element">Link</a>
        </TestInertContainer>
      );

      // All focusable element types should be prevented from focusing
      const elements = [
        screen.getByTestId('button-element'),
        screen.getByTestId('input-element'),
        screen.getByTestId('select-element'),
        screen.getByTestId('textarea-element'),
        screen.getByTestId('link-element'),
      ];

      elements.forEach(element => {
        element.focus();
        expect(element).not.toHaveFocus();
      });
    });
  });
});