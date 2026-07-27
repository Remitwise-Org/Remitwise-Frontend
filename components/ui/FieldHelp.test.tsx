import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import FieldHelp from './FieldHelp';

expect.extend(toHaveNoViolations);

describe('FieldHelp Component', () => {
  it('should render the help button with default label and not show popover by default', () => {
    render(<FieldHelp>Sample help content</FieldHelp>);
    
    const button = screen.getByRole('button', { name: 'Show help' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should accept custom buttonLabel and set aria attributes correctly', () => {
    render(<FieldHelp buttonLabel="Get more info">Sample help content</FieldHelp>);
    expect(screen.getByRole('button', { name: 'Get more info' })).toBeInTheDocument();
  });

  it('should toggle popover visibility on click', async () => {
    const user = userEvent.setup();
    render(<FieldHelp>Sample help content</FieldHelp>);
    
    const trigger = screen.getByRole('button', { name: 'Show help' });
    
    // Open the popover
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    
    const popover = screen.getByRole('dialog');
    expect(popover).toBeInTheDocument();
    expect(screen.getByText('Sample help content')).toBeInTheDocument();
    
    // Close the popover by clicking trigger again
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should close the popover on clicking the close button', async () => {
    const user = userEvent.setup();
    render(<FieldHelp>Sample help content</FieldHelp>);
    
    const trigger = screen.getByRole('button', { name: 'Show help' });
    await user.click(trigger);
    
    const closeBtn = screen.getByRole('button', { name: 'Close help' });
    await user.click(closeBtn);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should close the popover and restore focus to trigger when Escape is pressed', async () => {
    const user = userEvent.setup();
    render(<FieldHelp>Sample help content</FieldHelp>);
    
    const trigger = screen.getByRole('button', { name: 'Show help' });
    await user.click(trigger);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    await user.keyboard('{Escape}');
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('should close the popover when clicking outside the component', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside Element</div>
        <FieldHelp>Sample help content</FieldHelp>
      </div>
    );
    
    const trigger = screen.getByRole('button', { name: 'Show help' });
    await user.click(trigger);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    // Click outside
    await user.click(screen.getByTestId('outside'));
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should link popover content using custom fieldId', async () => {
    const user = userEvent.setup();
    render(<FieldHelp fieldId="test-field">Sample help content</FieldHelp>);
    
    const trigger = screen.getByRole('button', { name: 'Show help' });
    await user.click(trigger);
    
    const content = screen.getByText('Sample help content');
    expect(content).toHaveAttribute('id', 'test-field-help');
  });

  describe('Focus Management & Focus Trap', () => {
    it('should focus the first focusable element inside popover when opened', async () => {
      const user = userEvent.setup();
      render(
        <FieldHelp>
          <a href="#link">Link 1</a>
        </FieldHelp>
      );
      
      const trigger = screen.getByRole('button', { name: 'Show help' });
      await user.click(trigger);
      
      // Close button is the first focusable element inside the popover markup
      const closeBtn = screen.getByRole('button', { name: 'Close help' });
      expect(closeBtn).toHaveFocus();
    });

    it('should cycle focus with Tab inside the popover', async () => {
      const user = userEvent.setup();
      render(
        <FieldHelp>
          <button data-testid="child-btn">Child Button</button>
        </FieldHelp>
      );
      
      const trigger = screen.getByRole('button', { name: 'Show help' });
      await user.click(trigger);
      
      const closeBtn = screen.getByRole('button', { name: 'Close help' });
      const childBtn = screen.getByTestId('child-btn');
      
      // Initially focus should be on the close button
      expect(closeBtn).toHaveFocus();
      
      // Tab to next element (child button)
      await user.tab();
      expect(childBtn).toHaveFocus();
      
      // Tab again (since child button is the last focusable, focus wraps to close button)
      await user.tab();
      expect(closeBtn).toHaveFocus();
    });

    it('should cycle focus backwards with Shift+Tab inside the popover', async () => {
      const user = userEvent.setup();
      render(
        <FieldHelp>
          <button data-testid="child-btn">Child Button</button>
        </FieldHelp>
      );
      
      const trigger = screen.getByRole('button', { name: 'Show help' });
      await user.click(trigger);
      
      const closeBtn = screen.getByRole('button', { name: 'Close help' });
      const childBtn = screen.getByTestId('child-btn');
      
      // Initially focus should be on the close button
      expect(closeBtn).toHaveFocus();
      
      // Shift+Tab from close button (which is the first focusable, wraps to child button)
      await user.tab({ shift: true });
      expect(childBtn).toHaveFocus();
      
      // Shift+Tab again (wraps back to close button)
      await user.tab({ shift: true });
      expect(closeBtn).toHaveFocus();
    });

    it('should handle single focusable element inside popover when tabbing', async () => {
      const user = userEvent.setup();
      // No extra focusable elements in children, so only close button is focusable
      render(<FieldHelp>Just text, no interactive elements</FieldHelp>);
      
      const trigger = screen.getByRole('button', { name: 'Show help' });
      await user.click(trigger);
      
      const closeBtn = screen.getByRole('button', { name: 'Close help' });
      expect(closeBtn).toHaveFocus();
      
      await user.tab();
      expect(closeBtn).toHaveFocus();
      
      await user.tab({ shift: true });
      expect(closeBtn).toHaveFocus();
    });
  });

  describe('Accessibility (axe audit)', () => {
    it('should pass accessibility checks when closed', async () => {
      const { container } = render(<FieldHelp>Sample help content</FieldHelp>);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should pass accessibility checks when open', async () => {
      const user = userEvent.setup();
      const { container } = render(<FieldHelp>Sample help content</FieldHelp>);
      
      const trigger = screen.getByRole('button', { name: 'Show help' });
      await user.click(trigger);
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
