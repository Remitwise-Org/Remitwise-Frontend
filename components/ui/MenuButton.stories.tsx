import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Pencil,
  Trash2,
  Copy,
  Share2,
  Download,
  Settings,
  LogOut,
  Star,
  Flag,
  MoreHorizontal,
} from 'lucide-react';
import { MenuButton, MenuItemDef } from './MenuButton';

const meta: Meta<typeof MenuButton> = {
  title: 'UI/MenuButton',
  component: MenuButton,
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: `
A fully accessible dropdown menu button following the **WAI-ARIA 1.1 Menu Button** pattern
(§3.15 — \`role="menu"\`, \`role="menuitem"\`, \`aria-haspopup="menu"\`, \`aria-expanded\`, \`aria-controls\`).

### Keyboard contract

| Key | Action |
|-----|--------|
| Enter / Space / ↓ | Open menu; focus first enabled item |
| ↑ | Open menu; focus last enabled item |
| ↓ / ↑ | Navigate items (wraps) |
| Home / Page Up | Focus first enabled item |
| End / Page Down | Focus last enabled item |
| Escape | Close menu; return focus to trigger |
| Tab | Close menu (focus moves naturally) |
| Enter / Space on item | Activate item; close menu |

### Accessibility
- Trigger has \`aria-haspopup="menu"\`, \`aria-expanded\`, and \`aria-controls\`.
- Popup has \`role="menu"\` and \`aria-labelledby\` pointing to the trigger.
- Disabled items have \`aria-disabled="true"\` and are excluded from keyboard navigation.
- Respects \`prefers-reduced-motion\`.
- Uses design tokens — no hardcoded colours, spacing, or radii.
        `,
      },
    },
  },
  argTypes: {
    label: { control: 'text' },
    variant: {
      control: { type: 'select' },
      options: ['default', 'ghost', 'danger'],
    },
    placement: {
      control: { type: 'select' },
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof MenuButton>;

// ─── Shared item fixtures ─────────────────────────────────────────────────────

const baseItems: MenuItemDef[] = [
  {
    key: 'edit',
    label: 'Edit',
    icon: <Pencil className="h-4 w-4" />,
    onSelect: () => console.log('edit'),
  },
  {
    key: 'copy',
    label: 'Duplicate',
    icon: <Copy className="h-4 w-4" />,
    onSelect: () => console.log('duplicate'),
  },
  {
    key: 'share',
    label: 'Share',
    icon: <Share2 className="h-4 w-4" />,
    onSelect: () => console.log('share'),
  },
  {
    key: 'download',
    label: 'Export',
    icon: <Download className="h-4 w-4" />,
    onSelect: () => console.log('export'),
  },
  {
    key: 'delete',
    label: 'Delete',
    icon: <Trash2 className="h-4 w-4" />,
    hasSeparatorAbove: true,
    onSelect: () => console.log('delete'),
  },
];

// ─── Default ──────────────────────────────────────────────────────────────────

export const Default: Story = {
  args: {
    label: 'Actions',
    items: baseItems,
    variant: 'default',
    placement: 'bottom-start',
  },
};

// ─── Ghost variant ────────────────────────────────────────────────────────────

export const Ghost: Story = {
  args: {
    label: 'Actions',
    items: baseItems,
    variant: 'ghost',
    placement: 'bottom-start',
  },
  parameters: {
    docs: {
      description: { story: 'Ghost variant — transparent background, lighter hover state.' },
    },
  },
};

// ─── Danger variant ───────────────────────────────────────────────────────────

export const Danger: Story = {
  args: {
    label: 'Danger actions',
    items: [
      { key: 'flag', label: 'Flag account', icon: <Flag className="h-4 w-4" /> },
      { key: 'suspend', label: 'Suspend', icon: <LogOut className="h-4 w-4" />, hasSeparatorAbove: true },
      { key: 'delete', label: 'Delete permanently', icon: <Trash2 className="h-4 w-4" /> },
    ],
    variant: 'danger',
    placement: 'bottom-start',
  },
  parameters: {
    docs: {
      description: { story: 'Danger variant — uses error semantic tokens for the trigger.' },
    },
  },
};

// ─── With disabled items ──────────────────────────────────────────────────────

export const WithDisabledItems: Story = {
  args: {
    label: 'Actions',
    items: [
      {
        key: 'edit',
        label: 'Edit',
        icon: <Pencil className="h-4 w-4" />,
        onSelect: () => console.log('edit'),
      },
      {
        key: 'share',
        label: 'Share (unavailable)',
        icon: <Share2 className="h-4 w-4" />,
        disabled: true,
      },
      {
        key: 'delete',
        label: 'Delete',
        icon: <Trash2 className="h-4 w-4" />,
        hasSeparatorAbove: true,
        onSelect: () => console.log('delete'),
      },
    ],
    variant: 'default',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Disabled items render with `aria-disabled="true"` and are skipped during arrow-key navigation.',
      },
    },
  },
};

// ─── Icon-only trigger ────────────────────────────────────────────────────────

export const IconOnlyTrigger: Story = {
  args: {
    label: (
      <>
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">More options</span>
      </>
    ),
    items: baseItems,
    variant: 'ghost',
    className: 'px-2',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Icon-only trigger — wrap the icon in an accessible label with `sr-only` for screen readers.',
      },
    },
  },
};

// ─── Placement ────────────────────────────────────────────────────────────────

export const PlacementBottomEnd: Story = {
  render: () => (
    <div className="flex justify-end p-4">
      <MenuButton label="Options" items={baseItems} placement="bottom-end" />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: 'Popup anchored to the right edge of the trigger.' },
    },
  },
};

// ─── Disabled trigger ─────────────────────────────────────────────────────────

export const DisabledTrigger: Story = {
  args: {
    label: 'Actions',
    items: baseItems,
    disabled: true,
  },
  parameters: {
    docs: {
      description: { story: 'Trigger button is itself disabled; menu cannot be opened.' },
    },
  },
};

// ─── With separator ───────────────────────────────────────────────────────────

export const WithSeparator: Story = {
  args: {
    label: 'Settings',
    items: [
      {
        key: 'profile',
        label: 'Profile',
        icon: <Star className="h-4 w-4" />,
        onSelect: () => console.log('profile'),
      },
      {
        key: 'preferences',
        label: 'Preferences',
        icon: <Settings className="h-4 w-4" />,
        onSelect: () => console.log('preferences'),
      },
      {
        key: 'logout',
        label: 'Sign out',
        icon: <LogOut className="h-4 w-4" />,
        hasSeparatorAbove: true,
        onSelect: () => console.log('logout'),
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Use `hasSeparatorAbove: true` on an item to render a `role="separator"` divider above it.',
      },
    },
  },
};

// ─── Interactive / callback demo ──────────────────────────────────────────────

function ControlledDemo() {
  const [lastAction, setLastAction] = useState<string | null>(null);

  const items: MenuItemDef[] = [
    { key: 'edit', label: 'Edit', icon: <Pencil className="h-4 w-4" />, onSelect: () => setLastAction('Edit') },
    { key: 'copy', label: 'Duplicate', icon: <Copy className="h-4 w-4" />, onSelect: () => setLastAction('Duplicate') },
    { key: 'delete', label: 'Delete', icon: <Trash2 className="h-4 w-4" />, hasSeparatorAbove: true, onSelect: () => setLastAction('Delete') },
  ];

  return (
    <div className="space-y-4 p-4">
      <MenuButton label="Actions" items={items} />
      <p className="text-sm text-gray-400">
        Last action:{' '}
        <span className="font-mono text-white">{lastAction ?? '—'}</span>
      </p>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <ControlledDemo />,
  parameters: {
    docs: {
      description: {
        story: 'Live demo — click or keyboard-navigate the menu to see `onSelect` callbacks fire.',
      },
    },
  },
};

// ─── Keyboard walkthrough (docs only) ─────────────────────────────────────────

export const KeyboardWalkthrough: Story = {
  render: () => (
    <div className="space-y-4 p-4 text-sm text-gray-300">
      <p className="font-semibold text-white">Keyboard-only walkthrough</p>
      <ol className="list-decimal list-inside space-y-1 text-gray-400">
        <li>Tab to the &ldquo;Actions&rdquo; button.</li>
        <li>Press <kbd className="rounded bg-white/10 px-1 font-mono">&#x2193;</kbd> or <kbd className="rounded bg-white/10 px-1 font-mono">Enter</kbd> to open the menu. Focus moves to the first item.</li>
        <li>Press <kbd className="rounded bg-white/10 px-1 font-mono">↓</kbd> / <kbd className="rounded bg-white/10 px-1 font-mono">↑</kbd> to move between items.</li>
        <li>Press <kbd className="rounded bg-white/10 px-1 font-mono">Home</kbd> / <kbd className="rounded bg-white/10 px-1 font-mono">End</kbd> to jump to first / last item.</li>
        <li>Press <kbd className="rounded bg-white/10 px-1 font-mono">Enter</kbd> or <kbd className="rounded bg-white/10 px-1 font-mono">Space</kbd> to activate the focused item.</li>
        <li>Press <kbd className="rounded bg-white/10 px-1 font-mono">Escape</kbd> to close; focus returns to the trigger.</li>
      </ol>
      <MenuButton label="Actions" items={baseItems} />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Documented keyboard walkthrough satisfying the WCAG 2.1 AA keyboard requirement.',
      },
    },
  },
};
