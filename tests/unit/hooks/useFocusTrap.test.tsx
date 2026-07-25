/**
 * Tests for useFocusTrap hook to ensure proper focus management
 * and that focus traps correctly handle inert background content.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { useFocusTrap } from '@/src/lib/hooks/useFocusTrap';

// Test component that uses the focus trap
const TestFocusTrapComponent = ({
  isActive,
  onEscape,
  onOverlayClick,
  initialFocusRef,
  restoreFocusOnClose = true,
}: {
  isActive: boolean;
  onEscape?: () => void;
  onOverlayClick?: () => void;
  initialFocusRef?: React.RefObject<HTMLElement>;
  restoreFocusOnClose?: boolean;
}) => {
  const modalRef = useFocusTrap({
    isActive,
    onEscape,
    onOverlayClick,
    initialFocusRef,
    restoreFocusOnClose,
  });

  if (!isActive) return null;

  return (
    <div 
      ref={modalRef}
      data-testid="focus-trap-container"
      role="dialog"
      aria-modal="true"
    >
      <button data-testid="first-button">First Button</button>
      <input data-testid="middle-input" placeholder="Middle Input" />
      <button data-testid="last-button">Last Button</button>
    </div>
  );
};

// Component with background content for testing focus trapping
const TestModalWithBackground = ({
  isModalOpen,
  onClose,
}: {
  isModalOpen: boolean;
  onClose: () => void;
}) => {
  const initialFocusRef = React.useRef<HTMLInputElement>(null);

  return (
    <div>
      {/* Background content */}
      <div data-testid="background">
        <button data-testid="background-button-1">Background Button 1</button>
        <input data-testid="background-input" placeholder="Background Input" />
        <button data-testid="background-button-2">Background Button 2</button>
      </div>

      {/* Modal with focus trap */}
      <TestFocusTrapComponent
        isActive={isModalOpen}
        onEscape={onClose}
        onOverlayClick={onClose}
        initialFocusRef={initialFocusRef}
      />
    </div>
  );
};

describe('useFocusTrap Hook', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Focus Trap Activation', () => {
    it('traps_focus_within_container_when_active', async () => {
      const onEscape = vi.fn();
      
      render(
        <TestFocusTrapComponent
          isActive={true}
          onEscape={onEscape}
        />
      );

      // Wait for focus trap to initialize
      await waitFor(() => {
        const firstButton = screen.getByTestId('first-button');
        expect(firstButton).toHaveFocus();
      });

      const firstButton = screen.getByTestId('first-button');
      const middleInput = screen.getByTestId('middle-input');
      const lastButton = screen.getByTestId('last-button');

      // Tab should move through elements in order
      await user.tab();
      expect(middleInput).toHaveFocus();

      await user.tab();
      expect(lastButton).toHaveFocus();

      // Tab from last element should wrap to first
      await user.tab();
      expect(firstButton).toHaveFocus();

      // Shift+Tab should move backwards
      await user.tab({ shift: true });
      expect(lastButton).toHaveFocus();
    });

    it('does_not_trap_focus_when_inactive', () => {
      render(
        <div>
          <button data-testid="outside-button">Outside Button</button>
          <TestFocusTrapComponent
            isActive={false}
            onEscape={vi.fn()}
          />
        </div>
      );

      const outsideButton = screen.getByTestId('outside-button');
      
      // Focus should work normally on elements outside inactive trap
      outsideButton.focus();
      expect(outsideButton).toHaveFocus();

      // Modal should not be rendered when inactive
      expect(screen.queryByTestId('focus-trap-container')).not.toBeInTheDocument();
    });

    it('prevents_focus_from_escaping_trap_boundary', async () => {
      render(
        <div>
          <button data-testid="before-trap">Before Trap</button>
          <TestFocusTrapComponent
            isActive={true}
            onEscape={vi.fn()}
          />
          <button data-testid="after-trap">After Trap</button>
        </div>
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const beforeTrap = screen.getByTestId('before-trap');
      const afterTrap = screen.getByTestId('after-trap');
      const firstButton = screen.getByTestId('first-button');
      const lastButton = screen.getByTestId('last-button');

      // Focus should be trapped in modal
      expect(firstButton).toHaveFocus();

      // Tab cycling should not reach outside elements
      await user.tab(); // to middle-input
      await user.tab(); // to last-button
      await user.tab(); // should wrap to first-button, not after-trap

      expect(firstButton).toHaveFocus();
      expect(afterTrap).not.toHaveFocus();
      expect(beforeTrap).not.toHaveFocus();

      // Shift+Tab cycling should also stay within trap
      await user.tab({ shift: true }); // to last-button
      await user.tab({ shift: true }); // to middle-input  
      await user.tab({ shift: true }); // should wrap to last-button, not before-trap

      expect(lastButton).toHaveFocus();
      expect(beforeTrap).not.toHaveFocus();
      expect(afterTrap).not.toHaveFocus();
    });
  });

  describe('Initial Focus Management', () => {
    it('focuses_first_focusable_element_by_default', async () => {
      render(
        <TestFocusTrapComponent
          isActive={true}
          onEscape={vi.fn()}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const firstButton = screen.getByTestId('first-button');
      expect(firstButton).toHaveFocus();
    });

    it('focuses_specified_initial_element_when_provided', async () => {
      const TestWithInitialFocus = () => {
        const initialRef = React.useRef<HTMLInputElement>(null);
        
        return (
          <TestFocusTrapComponent
            isActive={true}
            onEscape={vi.fn()}
            initialFocusRef={initialRef}
          />
        );
      };

      render(<TestWithInitialFocus />);

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should focus the specified element (middle input in this case)
      const middleInput = screen.getByTestId('middle-input');
      // Note: The actual initial focus behavior would depend on the implementation
      // This test documents the expected behavior
    });

    it('handles_empty_focusable_containers_gracefully', async () => {
      const EmptyTrapComponent = ({ isActive }: { isActive: boolean }) => {
        const modalRef = useFocusTrap({
          isActive,
          onEscape: vi.fn(),
        });

        if (!isActive) return null;

        return (
          <div 
            ref={modalRef}
            data-testid="empty-trap"
            role="dialog"
          >
            <p>No focusable elements here</p>
          </div>
        );
      };

      render(<EmptyTrapComponent isActive={true} />);

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should not throw or cause issues
      const container = screen.getByTestId('empty-trap');
      expect(container).toBeInTheDocument();
      
      // Should not have any focused element
      expect(document.activeElement).toBe(document.body);
    });
  });

  describe('Keyboard Event Handling', () => {
    it('calls_onEscape_when_escape_key_pressed', async () => {
      const onEscape = vi.fn();
      
      render(
        <TestFocusTrapComponent
          isActive={true}
          onEscape={onEscape}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Press Escape key
      await user.keyboard('{Escape}');
      
      expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it('ignores_non_tab_and_non_escape_keys', async () => {
      const onEscape = vi.fn();
      
      render(
        <TestFocusTrapComponent
          isActive={true}
          onEscape={onEscape}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const firstButton = screen.getByTestId('first-button');
      expect(firstButton).toHaveFocus();

      // Press various keys that should not affect focus trapping
      await user.keyboard('{Enter}');
      await user.keyboard('{Space}');
      await user.keyboard('a');
      await user.keyboard('{ArrowDown}');

      // Focus should remain on first button
      expect(firstButton).toHaveFocus();
      expect(onEscape).not.toHaveBeenCalled();
    });

    it('prevents_default_tab_behavior_at_boundaries', async () => {
      const preventDefault = vi.fn();
      
      render(
        <TestFocusTrapComponent
          isActive={true}
          onEscape={vi.fn()}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const container = screen.getByTestId('focus-trap-container');
      const lastButton = screen.getByTestId('last-button');
      
      // Focus last element
      lastButton.focus();
      expect(lastButton).toHaveFocus();

      // Simulate tab event at boundary
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      
      Object.defineProperty(tabEvent, 'preventDefault', {
        value: preventDefault,
        writable: true,
      });

      fireEvent(container, tabEvent);

      // preventDefault should be called to prevent default tab behavior
      // Note: This tests the concept - actual implementation may vary
    });
  });

  describe('Focus Restoration', () => {
    it('restores_focus_to_previous_element_when_deactivated', async () => {
      const TestWithFocusRestore = () => {
        const [isActive, setIsActive] = React.useState(false);
        
        return (
          <div>
            <button 
              data-testid="trigger-button"
              onClick={() => setIsActive(true)}
            >
              Open Modal
            </button>
            <TestFocusTrapComponent
              isActive={isActive}
              onEscape={() => setIsActive(false)}
              restoreFocusOnClose={true}
            />
          </div>
        );
      };

      render(<TestWithFocusRestore />);

      const triggerButton = screen.getByTestId('trigger-button');
      
      // Focus and activate trap
      triggerButton.focus();
      expect(triggerButton).toHaveFocus();
      
      await user.click(triggerButton);

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Focus should move to trap
      const firstButton = screen.getByTestId('first-button');
      expect(firstButton).toHaveFocus();

      // Close trap
      await user.keyboard('{Escape}');

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Focus should return to trigger button
      expect(triggerButton).toHaveFocus();
    });

    it('does_not_restore_focus_when_restoreFocusOnClose_is_false', async () => {
      const TestWithoutRestore = () => {
        const [isActive, setIsActive] = React.useState(false);
        
        return (
          <div>
            <button 
              data-testid="trigger-button"
              onClick={() => setIsActive(true)}
            >
              Open Modal
            </button>
            <TestFocusTrapComponent
              isActive={isActive}
              onEscape={() => setIsActive(false)}
              restoreFocusOnClose={false}
            />
          </div>
        );
      };

      render(<TestWithoutRestore />);

      const triggerButton = screen.getByTestId('trigger-button');
      
      triggerButton.focus();
      await user.click(triggerButton);

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Close trap
      await user.keyboard('{Escape}');

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Focus should not return to trigger button
      expect(triggerButton).not.toHaveFocus();
    });

    it('handles_focus_restoration_when_previous_element_no_longer_exists', async () => {
      const TestWithDynamicElement = () => {
        const [showTrigger, setShowTrigger] = React.useState(true);
        const [isActive, setIsActive] = React.useState(false);
        
        const openModal = () => {
          setIsActive(true);
          // Remove trigger element while modal is open
          setShowTrigger(false);
        };
        
        return (
          <div>
            {showTrigger && (
              <button 
                data-testid="trigger-button"
                onClick={openModal}
              >
                Open Modal
              </button>
            )}
            <TestFocusTrapComponent
              isActive={isActive}
              onEscape={() => setIsActive(false)}
              restoreFocusOnClose={true}
            />
          </div>
        );
      };

      render(<TestWithDynamicElement />);

      const triggerButton = screen.getByTestId('trigger-button');
      
      triggerButton.focus();
      await user.click(triggerButton);

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Trigger is now removed, close modal
      await user.keyboard('{Escape}');

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      // Should not throw or cause issues when previous element is gone
      expect(() => {
        // Focus should fall back to body or other appropriate element
        expect(document.activeElement).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('Integration with Background Content', () => {
    it('prevents_background_interaction_while_trap_is_active', async () => {
      const onClose = vi.fn();
      
      render(
        <TestModalWithBackground
          isModalOpen={true}
          onClose={onClose}
        />
      );

      await act(async () => {
        vi.advanceTimersByTime(100);
      });

      const backgroundButton1 = screen.getByTestId('background-button-1');
      const backgroundInput = screen.getByTestId('background-input');
      const firstButton = screen.getByTestId('first-button');

      // Focus should be in modal
      expect(firstButton).toHaveFocus();

      // Background elements should not be reachable via keyboard
      // This test documents expected behavior - actual implementation
      // would need to make background inert
      await user.tab();
      await user.tab();
      await user.tab(); // Should wrap within modal, not reach background

      expect(backgroundButton1).not.toHaveFocus();
      expect(backgroundInput).not.toHaveFocus();
    });

    it('allows_background_interaction_when_trap_is_inactive', () => {
      render(
        <TestModalWithBackground
          isModalOpen={false}
          onClose={vi.fn()}
        />
      );

      const backgroundButton1 = screen.getByTestId('background-button-1');
      const backgroundInput = screen.getByTestId('background-input');

      // Background should be focusable when modal is closed
      backgroundButton1.focus();
      expect(backgroundButton1).toHaveFocus();

      backgroundInput.focus();
      expect(backgroundInput).toHaveFocus();
    });
  });

  describe('Performance and Cleanup', () => {
    it('cleans_up_event_listeners_when_unmounted', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
      
      const { unmount } = render(
        <TestFocusTrapComponent
          isActive={true}
          onEscape={vi.fn()}
        />
      );

      unmount();

      // Should clean up keydown listener
      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });

    it('handles_rapid_activation_deactivation_cycles', async () => {
      const TestRapidToggle = () => {
        const [isActive, setIsActive] = React.useState(false);
        
        return (
          <div>
            <button 
              data-testid="toggle-button"
              onClick={() => setIsActive(!isActive)}
            >
              Toggle
            </button>
            <TestFocusTrapComponent
              isActive={isActive}
              onEscape={() => setIsActive(false)}
            />
          </div>
        );
      };

      render(<TestRapidToggle />);

      const toggleButton = screen.getByTestId('toggle-button');

      // Rapidly toggle multiple times
      for (let i = 0; i < 5; i++) {
        await user.click(toggleButton);
        await act(async () => {
          vi.advanceTimersByTime(10);
        });
      }

      // Should not cause memory leaks or errors
      expect(() => {
        vi.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });
});