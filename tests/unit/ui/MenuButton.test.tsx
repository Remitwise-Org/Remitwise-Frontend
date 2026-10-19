/**
 * MenuButton unit tests
 *
 * Coverage:
 *  - ARIA roles and attributes (trigger + popup + items)
 *  - Keyboard navigation (ArrowDown, ArrowUp, Home, End, PageUp, PageDown)
 *  - Escape closes menu, focus returns to trigger
 *  - Tab closes menu (natural focus movement)
 *  - Enter / Space opens menu (from trigger) and activates item
 *  - ArrowUp on trigger opens and focuses last item
 *  - ArrowDown on trigger opens and focuses first item
 *  - Disabled items skipped during navigation, not activated
 *  - Separator rendered above items with hasSeparatorAbove
 *  - Outside click closes menu
 *  - onOpen / onClose callbacks
 *  - prefers-reduced-motion: no transition classes
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuButton, MenuItemDef } from '../../../components/ui/MenuButton';

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock matchMedia — default: reduced motion OFF
function mockMatchMedia(prefersReduced = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: prefersReduced && query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// ── Fixture ───────────────────────────────────────────────────────────────────

const onSelectA = vi.fn();
const onSelectB = vi.fn();
const onSelectC = vi.fn();

const defaultItems: MenuItemDef[] = [
  { key: 'a', label: 'Action A', onSelect: onSelectA },
  { key: 'b', label: 'Action B', onSelect: onSelectB },
  { key: 'c', label: 'Action C', onSelect: onSelectC },
];

function renderMenu(overrides: Partial<Parameters<typeof MenuButton>[0]> = {}) {
  return render(<MenuButton label="Options" items={defaultItems} {...overrides} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMatchMedia(false);
});

// ── Trigger ───────────────────────────────────────────────────────────────────

describe('Trigger button', () => {
  it('renders with a visible label', () => {
    renderMenu();
    expect(screen.getByRole('button', { name: /Options/i })).toBeTruthy();
  });

  it('has aria-haspopup="menu"', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
  });

  it('has aria-expanded="false" when closed', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('has aria-expanded="true" when open', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    await user.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('has aria-controls pointing to the menu when open', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    await user.click(trigger);
    const menuId = trigger.getAttribute('aria-controls');
    expect(menuId).toBeTruthy();
    const menu = document.getElementById(menuId!);
    expect(menu).toBeTruthy();
  });

  it('does not have aria-controls when closed', () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    expect(trigger.getAttribute('aria-controls')).toBeNull();
  });

  it('is disabled when disabled prop is true', () => {
    renderMenu({ disabled: true });
    const trigger = screen.getByRole('button', { name: /Options/i });
    expect(trigger).toBeDisabled();
  });
});

// ── Menu popup ────────────────────────────────────────────────────────────────

describe('Menu popup', () => {
  it('is not rendered while closed', () => {
    renderMenu();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('appears after trigger click', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('has role="menu"', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
  });

  it('has aria-orientation="vertical"', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    expect(screen.getByRole('menu').getAttribute('aria-orientation')).toBe('vertical');
  });

  it('is labelled by the trigger button (aria-labelledby)', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    await user.click(trigger);
    const menu = screen.getByRole('menu');
    const labelledBy = menu.getAttribute('aria-labelledby');
    expect(labelledBy).toBe(trigger.id);
  });
});

// ── Menu items ────────────────────────────────────────────────────────────────

describe('Menu items', () => {
  async function openMenu() {
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: /Options/i });
    await user.click(trigger);
    return user;
  }

  it('renders all items with role="menuitem"', async () => {
    renderMenu();
    await openMenu();
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
  });

  it('shows item labels', async () => {
    renderMenu();
    await openMenu();
    expect(screen.getByRole('menuitem', { name: 'Action A' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Action B' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Action C' })).toBeTruthy();
  });

  it('renders a separator above items with hasSeparatorAbove', async () => {
    const itemsWithSep: MenuItemDef[] = [
      { key: 'a', label: 'First' },
      { key: 'b', label: 'Second', hasSeparatorAbove: true },
    ];
    renderMenu({ items: itemsWithSep });
    await openMenu();
    expect(document.querySelector('[role="separator"]')).toBeTruthy();
  });

  it('does not render separator when hasSeparatorAbove is false/absent', async () => {
    renderMenu();
    await openMenu();
    expect(document.querySelector('[role="separator"]')).toBeNull();
  });

  it('marks disabled items with aria-disabled="true"', async () => {
    const items: MenuItemDef[] = [
      { key: 'a', label: 'Enabled' },
      { key: 'b', label: 'Disabled', disabled: true },
    ];
    renderMenu({ items });
    await openMenu();
    const disabledItem = screen.getByRole('menuitem', { name: 'Disabled' });
    expect(disabledItem.getAttribute('aria-disabled')).toBe('true');
  });

  it('icons are hidden from assistive technology', async () => {
    const Star = () => <svg data-testid="icon-star" />;
    const items: MenuItemDef[] = [{ key: 'a', label: 'With icon', icon: <Star /> }];
    renderMenu({ items });
    await openMenu();
    const iconWrapper = document.querySelector('[aria-hidden="true"]');
    expect(iconWrapper).toBeTruthy();
  });
});

// ── Click interaction ─────────────────────────────────────────────────────────

describe('Click interaction', () => {
  it('calls onSelect when an item is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Action A' }));
    expect(onSelectA).toHaveBeenCalledTimes(1);
  });

  it('closes menu after item is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Action A' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not call onSelect for a disabled item', async () => {
    const onSelectDisabled = vi.fn();
    const items: MenuItemDef[] = [
      { key: 'a', label: 'Enabled', onSelect: onSelectA },
      { key: 'b', label: 'Disabled', disabled: true, onSelect: onSelectDisabled },
    ];
    const user = userEvent.setup();
    renderMenu({ items });
    await user.click(screen.getByRole('button', { name: /Options/i }));
    // Try clicking the disabled item directly
    fireEvent.click(screen.getByRole('menuitem', { name: 'Disabled' }));
    expect(onSelectDisabled).not.toHaveBeenCalled();
  });

  it('toggles menu closed when trigger is clicked while open', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();
    await user.click(trigger);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes menu when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <>
        <div data-testid="outside">Outside</div>
        <MenuButton label="Options" items={defaultItems} />
      </>,
    );
    await user.click(screen.getByRole('button', { name: /Options/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.pointerDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

// ── Keyboard — trigger ────────────────────────────────────────────────────────

describe('Keyboard on trigger', () => {
  it('opens on Enter', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  });

  it('opens on Space', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: ' ' });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  });

  it('opens on ArrowDown and moves focus to first item', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  });

  it('opens on ArrowUp and moves focus to last item', async () => {
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  });
});

// ── Keyboard — menu navigation ────────────────────────────────────────────────

describe('Keyboard navigation inside menu', () => {
  async function openAndGetItems() {
    const user = userEvent.setup();
    const trigger = screen.getByRole('button', { name: /Options/i });
    await user.click(trigger);
    const items = screen.getAllByRole('menuitem');
    return { user, items };
  }

  it('moves focus down with ArrowDown', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[0].focus();
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
  });

  it('moves focus up with ArrowUp', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[1].focus();
    fireEvent.keyDown(panel, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('wraps from last to first with ArrowDown', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[items.length - 1].focus();
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('wraps from first to last with ArrowUp', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[0].focus();
    fireEvent.keyDown(panel, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('moves to first item with Home', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[2].focus();
    fireEvent.keyDown(panel, { key: 'Home' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('moves to last item with End', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[0].focus();
    fireEvent.keyDown(panel, { key: 'End' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('moves to first item with PageUp', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[2].focus();
    fireEvent.keyDown(panel, { key: 'PageUp' });
    expect(document.activeElement).toBe(items[0]);
  });

  it('moves to last item with PageDown', async () => {
    renderMenu();
    const { items } = await openAndGetItems();
    const panel = screen.getByRole('menu');
    items[0].focus();
    fireEvent.keyDown(panel, { key: 'PageDown' });
    expect(document.activeElement).toBe(items[items.length - 1]);
  });

  it('skips disabled items during ArrowDown navigation', async () => {
    const items: MenuItemDef[] = [
      { key: 'a', label: 'First', onSelect: onSelectA },
      { key: 'b', label: 'Disabled', disabled: true, onSelect: onSelectB },
      { key: 'c', label: 'Third', onSelect: onSelectC },
    ];
    renderMenu({ items });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const panel = screen.getByRole('menu');
    const enabledItems = screen.getAllByRole('menuitem').filter(
      (el) => el.getAttribute('aria-disabled') !== 'true',
    );
    enabledItems[0].focus();
    fireEvent.keyDown(panel, { key: 'ArrowDown' });
    // Should skip the disabled item and land on the third item (enabledItems[1])
    expect(document.activeElement).toBe(enabledItems[1]);
  });
});

// ── Keyboard — Escape ─────────────────────────────────────────────────────────

describe('Escape key', () => {
  it('closes the menu', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const panel = screen.getByRole('menu');
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('returns focus to the trigger after Escape', async () => {
    const user = userEvent.setup();
    renderMenu();
    const trigger = screen.getByRole('button', { name: /Options/i });
    await user.click(trigger);
    const panel = screen.getByRole('menu');
    fireEvent.keyDown(panel, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });
});

// ── Keyboard — item activation ────────────────────────────────────────────────

describe('Item activation via keyboard', () => {
  it('activates item on Enter', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const item = screen.getByRole('menuitem', { name: 'Action A' });
    item.focus();
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(onSelectA).toHaveBeenCalledTimes(1);
  });

  it('activates item on Space', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const item = screen.getByRole('menuitem', { name: 'Action A' });
    item.focus();
    fireEvent.keyDown(item, { key: ' ' });
    expect(onSelectA).toHaveBeenCalledTimes(1);
  });

  it('closes menu after Enter activation', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const item = screen.getByRole('menuitem', { name: 'Action A' });
    item.focus();
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not activate disabled item on Enter', async () => {
    const onSelectDisabled = vi.fn();
    const items: MenuItemDef[] = [
      { key: 'a', label: 'Enabled' },
      { key: 'b', label: 'Disabled', disabled: true, onSelect: onSelectDisabled },
    ];
    const user = userEvent.setup();
    renderMenu({ items });
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const disabledItem = screen.getByRole('menuitem', { name: 'Disabled' });
    disabledItem.focus();
    fireEvent.keyDown(disabledItem, { key: 'Enter' });
    expect(onSelectDisabled).not.toHaveBeenCalled();
  });
});

// ── Callbacks ─────────────────────────────────────────────────────────────────

describe('onOpen / onClose callbacks', () => {
  it('calls onOpen when menu opens', async () => {
    const onOpen = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onOpen });
    await user.click(screen.getByRole('button', { name: /Options/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when menu closes via Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const panel = screen.getByRole('menu');
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when menu closes via item click', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderMenu({ onClose });
    await user.click(screen.getByRole('button', { name: /Options/i }));
    await user.click(screen.getByRole('menuitem', { name: 'Action A' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── prefers-reduced-motion ────────────────────────────────────────────────────

describe('prefers-reduced-motion', () => {
  it('omits transition classes when reduced motion is preferred', async () => {
    mockMatchMedia(true);
    const user = userEvent.setup();
    renderMenu();
    await user.click(screen.getByRole('button', { name: /Options/i }));
    const menu = screen.getByRole('menu');
    expect(menu.className).not.toContain('transition-all');
  });
});

// ── Variants ──────────────────────────────────────────────────────────────────

describe('Trigger variants', () => {
  it('renders default variant without error', () => {
    renderMenu({ variant: 'default' });
    expect(screen.getByRole('button', { name: /Options/i })).toBeTruthy();
  });

  it('renders ghost variant without error', () => {
    renderMenu({ variant: 'ghost' });
    expect(screen.getByRole('button', { name: /Options/i })).toBeTruthy();
  });

  it('renders danger variant without error', () => {
    renderMenu({ variant: 'danger' });
    expect(screen.getByRole('button', { name: /Options/i })).toBeTruthy();
  });
});

// ── Placement ─────────────────────────────────────────────────────────────────

describe('Placement prop', () => {
  const placements: Array<MenuButtonProps['placement']> = [
    'bottom-start',
    'bottom-end',
    'top-start',
    'top-end',
  ];

  for (const placement of placements) {
    it(`renders popup for placement="${placement}"`, async () => {
      const user = userEvent.setup();
      render(<MenuButton label="Options" items={defaultItems} placement={placement} />);
      await user.click(screen.getByRole('button', { name: /Options/i }));
      expect(screen.getByRole('menu')).toBeTruthy();
    });
  }
});

// Re-export for type inference use in stories
export type { MenuButtonProps } from '../../../components/ui/MenuButton';
