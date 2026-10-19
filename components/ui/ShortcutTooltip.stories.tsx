import type { Meta, StoryObj } from '@storybook/react'
import ShortcutTooltip from './ShortcutTooltip'
import { Search, HelpCircle, Menu } from 'lucide-react'

const meta: Meta<typeof ShortcutTooltip> = {
  title: 'UI/ShortcutTooltip',
  component: ShortcutTooltip,
  parameters: {
    docs: {
      description: {
        component:
          'Wraps any interactive element and shows a keyboard shortcut hint on hover/focus. ' +
          'Meets WCAG 2.1 AA: visible on focus, keyboard-dismissible, semantic ARIA, ' +
          'and automatic platform detection (⌘K on Mac, Ctrl+K on Windows).',
      },
    },
  },
  argTypes: {
    label: {
      description: 'Human-readable action label',
      control: 'text',
    },
    shortcut: {
      description: 'Keyboard shortcut hint (e.g. "⌘K", "Ctrl+S", "Shift+?")',
      control: 'text',
    },
    side: {
      description: 'Tooltip position relative to trigger',
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
    className: {
      description: 'Extra className on the wrapper',
      control: 'text',
    },
  },
}

export default meta
type Story = StoryObj<typeof ShortcutTooltip>

// ──────────────────────────────────────────────────────────────────────────
// Default: Command Palette shortcut
// ──────────────────────────────────────────────────────────────────────────

export const CommandPalette: Story = {
  args: {
    label: 'Command Palette',
    shortcut: '⌘K',
  },
  render: (args) => (
    <ShortcutTooltip {...args}>
      <button
        aria-label="Command Palette"
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
      >
        <Search className="w-5 h-5" />
      </button>
    </ShortcutTooltip>
  ),
}

// ──────────────────────────────────────────────────────────────────────────
// Help / Keyboard Shortcuts
// ──────────────────────────────────────────────────────────────────────────

export const HelpButton: Story = {
  args: {
    label: 'Keyboard Shortcuts',
    shortcut: '?',
  },
  render: (args) => (
    <ShortcutTooltip {...args}>
      <button
        aria-label="Keyboard Shortcuts Help"
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </ShortcutTooltip>
  ),
}

// ──────────────────────────────────────────────────────────────────────────
// Mobile Menu
// ──────────────────────────────────────────────────────────────────────────

export const MobileMenu: Story = {
  args: {
    label: 'Open Mobile Menu',
    shortcut: 'Esc',
    side: 'left',
  },
  render: (args) => (
    <ShortcutTooltip {...args}>
      <button
        aria-label="Open Mobile Menu"
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
    </ShortcutTooltip>
  ),
}

// ──────────────────────────────────────────────────────────────────────────
// All positioning options
// ──────────────────────────────────────────────────────────────────────────

export const AllPositions: Story = {
  render: () => (
    <div className="flex gap-16 items-center justify-center p-16">
      {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
        <ShortcutTooltip
          key={side}
          label={`Position: ${side}`}
          shortcut="⌘K"
          side={side}
        >
          <button
            className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-red hover:bg-brand-redHover text-white border border-red-500 transition-colors focus-visible:outline-none focus-visible:ring-focus focus-visible:ring-red-400 focus-visible:ring-offset-focus focus-visible:ring-offset-black"
          >
            {side[0].toUpperCase()}
          </button>
        </ShortcutTooltip>
      ))}
    </div>
  ),
}

// ──────────────────────────────────────────────────────────────────────────
// With different shortcuts
// ──────────────────────────────────────────────────────────────────────────

export const CommonShortcuts: Story = {
  render: () => (
    <div className="flex gap-8 flex-wrap items-center p-8">
      <ShortcutTooltip label="Open" shortcut="⌘O">
        <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          Open File
        </button>
      </ShortcutTooltip>

      <ShortcutTooltip label="Save" shortcut="⌘S">
        <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          Save
        </button>
      </ShortcutTooltip>

      <ShortcutTooltip label="Search" shortcut="⌘F">
        <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          Search
        </button>
      </ShortcutTooltip>

      <ShortcutTooltip label="Undo" shortcut="⌘Z">
        <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          Undo
        </button>
      </ShortcutTooltip>

      <ShortcutTooltip label="Redo" shortcut="⌘⇧Z">
        <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors">
          Redo
        </button>
      </ShortcutTooltip>
    </div>
  ),
}

// ──────────────────────────────────────────────────────────────────────────
// Keyboard focus accessibility demo
// ──────────────────────────────────────────────────────────────────────────

export const KeyboardAccessible: Story = {
  render: () => (
    <div className="p-8 space-y-4">
      <p className="text-sm text-gray-400 mb-4">
        Tab between buttons to focus. Hover or focus to see tooltips. Press Escape to dismiss.
      </p>
      <div className="flex gap-4 flex-wrap">
        <ShortcutTooltip label="Previous" shortcut="←">
          <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors">
            Previous
          </button>
        </ShortcutTooltip>

        <ShortcutTooltip label="Next" shortcut="→">
          <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors">
            Next
          </button>
        </ShortcutTooltip>

        <ShortcutTooltip label="Expand" shortcut="Enter">
          <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors">
            Expand
          </button>
        </ShortcutTooltip>

        <ShortcutTooltip label="Close" shortcut="Esc">
          <button className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors">
            Close
          </button>
        </ShortcutTooltip>
      </div>
    </div>
  ),
}

// ──────────────────────────────────────────────────────────────────────────
// With custom wrapper className
// ──────────────────────────────────────────────────────────────────────────

export const WithCustomClassName: Story = {
  args: {
    label: 'Custom Styled',
    shortcut: '⌘X',
    className: 'block',
  },
  render: (args) => (
    <ShortcutTooltip {...args}>
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-600 hover:bg-red-700 text-white border border-red-500 cursor-pointer transition-colors">
        X
      </div>
    </ShortcutTooltip>
  ),
}
