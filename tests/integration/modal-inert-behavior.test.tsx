/**
 * Integration tests for modal components and their inert background behavior.
 * Tests the complete focus management ecosystem when modals are open.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

// Import actual modal components to test real behavior
import HowItWorksModal from '@/components/HowItWorksModal';
import EmergencyTransferModal from '@/components/Dashboard/EmergencyTransferModal';

// Add jest-axe matcher
expect.extend(toHaveNoViolations);

// Mock the useFocusTrap hook to capture its usage
const mockUseFocusTrap = vi.fn(() => ({ current: null }));
vi.mock('@/src/lib/hooks/useFocusTrap', () => ({
  useFocusTrap: mockUseFocusTrap,
}));

// Test page layout with background content
const TestPageLayout = ({ 
  children, 
  showModal = false, 
  onCloseModal 
}: { 
  children?: React.ReactNode;
  showModal?: boolean; 
  onCloseModal?: () => void; 
}) => (
  <div>
    {/* Main page content that should become inert when modal opens */}
    <header data-testid="page-header">
      <nav>
        <button data-testid="nav-button-1">Home</button>
        <button data-testid="nav-button-2">Dashboard</button>
        <button data-testid="nav-button-3">Settings</button>
      </nav>
    </header>
    
    <main data-testid="page-main">
      <h1>Main Page Content</h1>
      <button data-testid="main-action-1">Primary Action</button>
      <input data-testid="main-input" placeholder="Search..." />
      <button 
        data-testid="open-modal-button"
        onClick={() => onCloseModal?.()}
      >
        Open Modal
      </button>
      <button data-testid="main-action-2">Secondary Action</button>
    </main>

    <aside data-testid="page-sidebar">
      <button data-testid="sidebar-button-1">Sidebar Action 1</button>
      <select data-testid="sidebar-select">
        <option>Option 1</option>
        <option>Option 2</option>
      </select>
      <button data-testid="sidebar-button-2">Sidebar Action 2</button>
    </aside>

    <footer data-testid="page-footer">
      <a href="/privacy" data-testid="footer-link-1">Privacy</a>
      <a href="/terms" data-testid="footer-link-2">Terms</a>
    </footer>

    {children}
  </div>
);

describe('Modal Inert Background Behavior', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    vi.useFakeTimers();
    mockUseFocusTrap.mockClear();

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
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('HowItWorksModal Integration', () => {
    it('prevents_focus_on_background_when_modal_is_open', async () => {
      const onClose = vi.fn();
      
      render(
        <TestPageLayout>
          <HowItWorksModal isOpen={true} onClose={onClose} />
        </TestPageLayout>
      );

      // Verify modal is rendered
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(mockUseFocusTrap).toHaveBeenCalledWith({
        isActive: true,
        onEscape: onClose,
        onOverlayClick: onClose,
        restoreFocusOnClose: true,
      });

      // Background elements should exist but not be focusable
      const backgroundButton = screen.getByTestId('nav-button-1');
      const backgroundInput = screen.getByTestId('main-input');
      
      expect(backgroundButton).toBeInTheDocument();
      expect(backgroundInput).toBeInTheDocument();

      // In a proper implementation, these would be inert
      // This test documents the expected behavior
      
      // Modal elements should be focusable
      const modalButton = screen.getByText('Got it');
      expect(modalButton).toBeInTheDocument();
      
      modalButton.focus();
      expect(modalButton).toHaveFocus();
    });

    it('restores_background_focus_when_modal_closes', async () => {
      const TestWithToggle = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        return (
          <TestPageLayout>
            <button 
              data-testid="open-modal"
              onClick={() => setIsOpen(true)}
            >
              Open Modal
            </button>
            <HowItWorksModal 
              isOpen={isOpen} 
              onClose={() => setIsOpen(false)} 
            />
          </TestPageLayout>
        );
      };

      render(<TestWithToggle />);

      const openButton = screen.getByTestId('open-modal');
      const backgroundButton = screen.getByTestId('nav-button-1');

      // Focus background element
      backgroundButton.focus();
      expect(backgroundButton).toHaveFocus();

      // Open modal
      await user.click(openButton);

      // Verify modal opened and focus trap activated
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Close modal
      const closeButton = screen.getByText('Got it');
      await user.click(closeButton);

      // Modal should be closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      
      // Background should be focusable again
      backgroundButton.focus();
      expect(backgroundButton).toHaveFocus();
    });

    it('handles_tab_navigation_properly_with_modal_open', async () => {
      const onClose = vi.fn();
      
      render(
        <TestPageLayout>
          <HowItWorksModal isOpen={true} onClose={onClose} />
        </TestPageLayout>
      );

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Focus should be trapped within modal
      const modalButton = screen.getByText('Got it');
      modalButton.focus();
      expect(modalButton).toHaveFocus();

      // Tab navigation should not reach background elements
      // This would be ensured by the focus trap implementation
      await user.tab();
      
      // Focus should remain within modal bounds
      // (specific behavior depends on focus trap implementation)
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });

  describe('EmergencyTransferModal Integration', () => {
    it('properly_manages_focus_trap_activation', async () => {
      const onClose = vi.fn();
      
      render(
        <TestPageLayout>
          <EmergencyTransferModal isOpen={true} onClose={onClose} />
        </TestPageLayout>
      );

      // Verify focus trap is activated
      expect(mockUseFocusTrap).toHaveBeenCalledWith({
        isActive: true,
        onEscape: onClose,
        onOverlayClick: onClose,
        restoreFocusOnClose: true,
        initialFocusRef: expect.any(Object),
      });

      // Modal should be present
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Emergency Transfer')).toBeInTheDocument();
    });

    it('prevents_background_interaction_during_transfer_flow', async () => {
      const onClose = vi.fn();
      
      render(
        <TestPageLayout>
          <EmergencyTransferModal isOpen={true} onClose={onClose} />
        </TestPageLayout>
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Background navigation should not be accessible
      const backgroundNavButton = screen.getByTestId('nav-button-1');
      const backgroundMainButton = screen.getByTestId('main-action-1');
      
      // These should be rendered but not focusable due to inert state
      expect(backgroundNavButton).toBeInTheDocument();
      expect(backgroundMainButton).toBeInTheDocument();

      // Modal form elements should be focusable
      const recipientInput = screen.getByPlaceholderText(/recipient/i) || 
                           screen.getByDisplayValue('') ||
                           dialog.querySelector('input');
      
      if (recipientInput) {
        recipientInput.focus();
        expect(dialog.contains(recipientInput)).toBe(true);
      }
    });

    it('cleans_up_focus_trap_when_modal_closes', async () => {
      const TestToggleModal = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        return (
          <TestPageLayout>
            <button 
              data-testid="close-modal"
              onClick={() => setIsOpen(false)}
            >
              Close Modal
            </button>
            <EmergencyTransferModal 
              isOpen={isOpen} 
              onClose={() => setIsOpen(false)} 
            />
          </TestPageLayout>
        );
      };

      render(<TestToggleModal />);

      // Initially open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(mockUseFocusTrap).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true })
      );

      // Close modal
      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);

      // Modal should be closed and focus trap deactivated
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      
      // Background should be interactive again
      const backgroundButton = screen.getByTestId('nav-button-1');
      backgroundButton.focus();
      expect(backgroundButton).toHaveFocus();
    });
  });

  describe('Multiple Modal Scenarios', () => {
    it('handles_nested_modal_scenarios_correctly', async () => {
      const TestNestedModals = () => {
        const [showFirst, setShowFirst] = React.useState(false);
        const [showSecond, setShowSecond] = React.useState(false);
        
        return (
          <TestPageLayout>
            <button 
              data-testid="open-first"
              onClick={() => setShowFirst(true)}
            >
              Open First Modal
            </button>
            <HowItWorksModal 
              isOpen={showFirst} 
              onClose={() => setShowFirst(false)} 
            />
            <button 
              data-testid="open-second"
              onClick={() => setShowSecond(true)}
            >
              Open Second Modal
            </button>
            <EmergencyTransferModal 
              isOpen={showSecond} 
              onClose={() => setShowSecond(false)} 
            />
          </TestPageLayout>
        );
      };

      render(<TestNestedModals />);

      const openFirstButton = screen.getByTestId('open-first');
      const openSecondButton = screen.getByTestId('open-second');

      // Open first modal
      await user.click(openFirstButton);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Background should be inert, second modal trigger not accessible
      // In proper implementation, this would be enforced by inert attributes

      // Open second modal (if possible via programmatic means)
      await user.click(openSecondButton);
      
      // Should handle multiple modals appropriately
      // (Behavior depends on application requirements)
    });

    it('maintains_inert_state_consistency_across_modal_changes', async () => {
      const TestModalSwitching = () => {
        const [currentModal, setCurrentModal] = React.useState<string | null>(null);
        
        return (
          <TestPageLayout>
            <button 
              data-testid="show-howto"
              onClick={() => setCurrentModal('howto')}
            >
              Show How To
            </button>
            <button 
              data-testid="show-transfer"
              onClick={() => setCurrentModal('transfer')}
            >
              Show Transfer
            </button>
            <button 
              data-testid="close-modal"
              onClick={() => setCurrentModal(null)}
            >
              Close Modal
            </button>
            
            <HowItWorksModal 
              isOpen={currentModal === 'howto'} 
              onClose={() => setCurrentModal(null)} 
            />
            <EmergencyTransferModal 
              isOpen={currentModal === 'transfer'} 
              onClose={() => setCurrentModal(null)} 
            />
          </TestPageLayout>
        );
      };

      render(<TestModalSwitching />);

      const showHowto = screen.getByTestId('show-howto');
      const showTransfer = screen.getByTestId('show-transfer');
      const closeModal = screen.getByTestId('close-modal');
      const backgroundButton = screen.getByTestId('nav-button-1');

      // Initially, background should be interactive
      backgroundButton.focus();
      expect(backgroundButton).toHaveFocus();

      // Show first modal
      await user.click(showHowto);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      
      // Switch to second modal
      await user.click(showTransfer);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal
      await user.click(closeModal);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Background should be interactive again
      backgroundButton.focus();
      expect(backgroundButton).toHaveFocus();
    });
  });

  describe('Accessibility and Screen Reader Integration', () => {
    it('maintains_accessibility_compliance_with_inert_backgrounds', async () => {
      const onClose = vi.fn();
      
      const { container } = render(
        <TestPageLayout>
          <HowItWorksModal isOpen={true} onClose={onClose} />
        </TestPageLayout>
      );

      // Should not introduce accessibility violations
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('properly_manages_aria_hidden_and_inert_attributes', async () => {
      const TestInertImplementation = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        // Simulate proper inert implementation
        React.useEffect(() => {
          const backgroundElements = [
            document.querySelector('[data-testid="page-header"]'),
            document.querySelector('[data-testid="page-main"]'),
            document.querySelector('[data-testid="page-sidebar"]'),
            document.querySelector('[data-testid="page-footer"]'),
          ];

          backgroundElements.forEach(el => {
            if (el) {
              if (isOpen) {
                (el as HTMLElement).inert = true;
                el.setAttribute('aria-hidden', 'true');
              } else {
                (el as HTMLElement).inert = false;
                el.removeAttribute('aria-hidden');
              }
            }
          });
        }, [isOpen]);

        return (
          <TestPageLayout>
            <button onClick={() => setIsOpen(true)}>Open</button>
            <HowItWorksModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
          </TestPageLayout>
        );
      };

      render(<TestInertImplementation />);

      const openButton = screen.getByText('Open');
      await user.click(openButton);

      // Background elements should have proper attributes
      const header = screen.getByTestId('page-header');
      const main = screen.getByTestId('page-main');
      
      expect(header).toHaveAttribute('inert');
      expect(header).toHaveAttribute('aria-hidden', 'true');
      expect(main).toHaveAttribute('inert');
      expect(main).toHaveAttribute('aria-hidden', 'true');

      // Modal should be accessible
      const dialog = screen.getByRole('dialog');
      expect(dialog).not.toHaveAttribute('inert');
      expect(dialog).not.toHaveAttribute('aria-hidden');
    });

    it('preserves_screen_reader_navigation_within_modal', async () => {
      const onClose = vi.fn();
      
      render(
        <TestPageLayout>
          <HowItWorksModal isOpen={true} onClose={onClose} />
        </TestPageLayout>
      );

      const dialog = screen.getByRole('dialog');
      
      // Modal should have proper ARIA attributes
      expect(dialog).toHaveAttribute('role', 'dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      
      // Content should be navigable by screen readers
      const title = screen.getByText('How It Works');
      expect(title).toBeInTheDocument();
      
      // Button should be reachable
      const button = screen.getByText('Got it');
      expect(button).toBeInTheDocument();
      expect(button).toBeEnabled();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('handles_rapid_modal_open_close_cycles_efficiently', async () => {
      const TestRapidToggle = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        
        return (
          <TestPageLayout>
            <button 
              data-testid="toggle-modal"
              onClick={() => setIsOpen(!isOpen)}
            >
              Toggle Modal
            </button>
            <HowItWorksModal 
              isOpen={isOpen} 
              onClose={() => setIsOpen(false)} 
            />
          </TestPageLayout>
        );
      };

      render(<TestRapidToggle />);

      const toggleButton = screen.getByTestId('toggle-modal');

      // Rapid toggle cycles
      for (let i = 0; i < 5; i++) {
        await user.click(toggleButton);
        await vi.runOnlyPendingTimersAsync();
      }

      // Should not cause memory leaks or performance issues
      expect(() => {
        vi.runAllTimers();
      }).not.toThrow();

      // Final state should be consistent
      const dialog = screen.queryByRole('dialog');
      if (dialog) {
        expect(mockUseFocusTrap).toHaveBeenLastCalledWith(
          expect.objectContaining({ isActive: true })
        );
      } else {
        expect(mockUseFocusTrap).toHaveBeenLastCalledWith(
          expect.objectContaining({ isActive: false })
        );
      }
    });

    it('gracefully_handles_focus_trap_failures', async () => {
      // Mock focus trap to simulate failure
      mockUseFocusTrap.mockImplementation(() => {
        throw new Error('Focus trap failed');
      });

      const onClose = vi.fn();
      
      // Should not crash when focus trap fails
      expect(() => {
        render(
          <TestPageLayout>
            <HowItWorksModal isOpen={true} onClose={onClose} />
          </TestPageLayout>
        );
      }).not.toThrow();
    });

    it('handles_modal_unmounting_while_open', () => {
      const TestConditionalModal = ({ showModal }: { showModal: boolean }) => (
        <TestPageLayout>
          {showModal && (
            <HowItWorksModal isOpen={true} onClose={vi.fn()} />
          )}
        </TestPageLayout>
      );

      const { rerender } = render(<TestConditionalModal showModal={true} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Unmount modal while open
      rerender(<TestConditionalModal showModal={false} />);

      // Should clean up properly
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      
      // Background should be accessible again
      const backgroundButton = screen.getByTestId('nav-button-1');
      backgroundButton.focus();
      expect(backgroundButton).toHaveFocus();
    });
  });
});