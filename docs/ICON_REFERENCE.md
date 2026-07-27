# Icon Reference

Single-page lookup table for every named icon used in the RemitWise UI.
Audience: contributors adding a feature or reviewing a PR.

For sizing rules, accessibility patterns, and instructions for adding a custom icon see [docs/ICON_SYSTEM.md](ICON_SYSTEM.md).

---

## How to read this table

| Column | Meaning |
|--------|---------|
| **Icon name** | The named export from `lucide-react` (or the component path for non-Lucide icons) |
| **Source** | `lucide-react` for every standard icon; the file path for hand-crafted SVG components |
| **Preferred use** | Where and when to reach for this icon; picking from this list keeps meanings consistent across routes |

Import Lucide icons directly — there is no barrel re-export:

```tsx
import { Send, CheckCircle2, AlertCircle } from "lucide-react";
```

---

## Navigation

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `LayoutDashboard` | `lucide-react` | Primary nav — Dashboard route |
| `Send` | `lucide-react` | Primary nav — Send Money route |
| `FileText` | `lucide-react` | Primary nav — Bills / Documents route |
| `Shield` | `lucide-react` | Primary nav — Insurance route (unconfirmed / general protection) |
| `Users` | `lucide-react` | Primary nav — Family Wallets route |
| `Settings` | `lucide-react` | Primary nav — Settings route |
| `Bell` | `lucide-react` | Primary nav — Notifications |
| `Search` | `lucide-react` | Primary nav search trigger; search input fields |
| `HelpCircle` | `lucide-react` | Primary nav — Help / tutorial entry point |
| `History` | `lucide-react` | Mobile nav — Transaction history |
| `Wallet` | `lucide-react` | Mobile nav — Wallet / balance; wallet-connect actions |
| `LogOut` | `lucide-react` | Mobile nav — Sign out |
| `Home` | `lucide-react` | 404 page back-to-home link |

---

## Navigation sub-items

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `PieChart` | `lucide-react` | Sub-nav — Financial overview / split breakdown |
| `Target` | `lucide-react` | Sub-nav — Savings goals |
| `Zap` | `lucide-react` | Sub-nav — Quick actions / instant transfer accent; replaces legacy `LightningBoltIcon` from `@radix-ui/react-icons` |
| `ChevronRight` | `lucide-react` | Sub-nav and list items — disclosure chevron pointing right |

---

## Page headers and wayfinding

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `ArrowLeft` | `lucide-react` | Back button on all secondary and detail pages |
| `ArrowRight` | `lucide-react` | Forward / next-step affordance |
| `ArrowUp` | `lucide-react` | Back-to-top scroll utility (`BackToTop` component) |
| `ArrowUpRight` | `lucide-react` | External link indicator in async operations panel |
| `BookOpen` | `lucide-react` | Tutorial / onboarding page header |
| `BarChart3` | `lucide-react` | Insights / analytics page header |
| `Activity` | `lucide-react` | Dashboard header — activity view toggle; family activity tab |
| `Star` | `lucide-react` | Dashboard header — favourites or highlights |
| `Sparkles` | `lucide-react` | Dashboard header — AI / smart features indicator; preferences |
| `Hash` | `lucide-react` | Deep-link anchor on page headings (`PageHeadingLink`) |

---

## Actions

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `Plus` | `lucide-react` | Add new item (bill, goal, policy, family member) |
| `Download` | `lucide-react` | Export / download (CSV, JSON, receipt) |
| `FilterIcon` | `lucide-react` | Open filter panel on list views |
| `Filter` | `lucide-react` | Filter trigger in toolbar stories / compact controls |
| `Edit2` | `lucide-react` | Inline edit on family member cards (legacy; prefer `Pencil` for new work) |
| `Pencil` | `lucide-react` | Edit action — preferred over `Edit2` for new components |
| `PenLine` | `lucide-react` | Edit action in approvals queue |
| `Save` | `lucide-react` | Save / confirm edit |
| `Printer` | `lucide-react` | Print receipt |
| `Share2` | `lucide-react` | Share transaction receipt |
| `ExternalLink` | `lucide-react` | Link that opens in a new tab (Horizon explorer, external docs) |
| `RefreshCw` | `lucide-react` | Refresh exchange rates or reload data |
| `Play` | `lucide-react` | Start / play a tutorial |
| `Power` | `lucide-react` | Deactivate / toggle off (insurance policy deactivation) |
| `Repeat` | `lucide-react` | Recurring bill or schedule indicator |

---

## Form and input controls

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `ChevronDown` | `lucide-react` | Dropdown / select expansion; collapsible section |
| `ChevronUp` | `lucide-react` | Collapse / scroll-up affordance |
| `ChevronLeft` | `lucide-react` | Calendar month back; paginated list previous |
| `ChevronRight` (form) | `lucide-react` | Calendar month forward; settings row disclosure |
| `QrCode` | `lucide-react` | Scan QR code for recipient address input |
| `ClipboardPaste` | `lucide-react` | Paste from clipboard into address input |
| `DollarSign` | `lucide-react` | Currency / amount field indicator |
| `CreditCard` | `lucide-react` | Payment method / card indicator in send review |
| `Globe` | `lucide-react` | Locale / language selector; international transfer context |
| `Keyboard` | `lucide-react` | Keyboard shortcut help modal trigger |
| `Terminal` | `lucide-react` | Developer debug / request-id display |
| `Cpu` | `lucide-react` | Debug page — system / runtime info |
| `Flag` | `lucide-react` | Debug page — feature-flag indicator |
| `Link2` | `lucide-react` | Debug page — URL / link field |
| `Lock` | `lucide-react` | Locked / inaccessible tutorial chapter |
| `Command` | `lucide-react` | Command palette trigger key indicator |

---

## Clipboard and copy

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `Copy` | `lucide-react` | Copy to clipboard — default state |
| `Check` | `lucide-react` | Copy confirmed — transient success state replacing `Copy`; also used for checkboxes, pricing tiers, and filter selection |
| `CheckCheck` | `lucide-react` | "What's New" panel — all items read / acknowledged |

---

## Status and feedback

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `CheckCircle2` | `lucide-react` | Success / completed state (transactions, steps, submissions) |
| `CheckCircle` | `lucide-react` | Bill paid confirmation (variant; prefer `CheckCircle2` for new work) |
| `AlertCircle` | `lucide-react` | Error / failed state; inline validation error |
| `AlertTriangle` | `lucide-react` | Warning — wrong network banner, confirm dialog, destructive action |
| `XCircle` | `lucide-react` | Hard failure or cancellation (family member actions, policy cancel) |
| `Clock3` | `lucide-react` | Pending / idle state in status indicators and split config |
| `Clock4` | `lucide-react` | Bill upcoming / due-soon indicator |
| `Clock` | `lucide-react` | General "scheduled / time-based" context (emergency transfer, money distribution) |
| `Loader2` | `lucide-react` | Spinner — animated with `animate-spin`; in-progress state across all routes |
| `Info` | `lucide-react` | Informational tooltip or notice (insights widget, send split info) |
| `HelpCircle` (status) | `lucide-react` | Unknown / unrecognised transaction status |
| `SearchX` | `lucide-react` | Empty search results state |
| `Inbox` | `lucide-react` | Empty list / no transactions state |
| `SearchCheck` | `lucide-react` | Command palette — confirmed search result |

---

## Financial data

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `TrendingUp` | `lucide-react` | Positive trend on stat cards |
| `TrendingDown` | `lucide-react` | Negative trend on stat cards |
| `Minus` | `lucide-react` | No change / neutral trend on stat cards |
| `PiggyBank` | `lucide-react` | Savings goals; home page feature card |
| `CircleDollarSign` | `lucide-react` | Transaction type — fee or system charge |
| `GitBranch` | `lucide-react` | Transaction type — split transaction |
| `ArrowDownLeft` | `lucide-react` | Incoming / received transaction |
| `ArrowRightLeft` | `lucide-react` | Exchange or swap transaction |
| `CalendarClock` | `lucide-react` | Scheduled / recurring remittance; bills with due dates |
| `Calendar` | `lucide-react` | Insurance policy date fields |
| `LayoutGrid` | `lucide-react` | Grid view toggle in toolbar |
| `LayoutList` | `lucide-react` | List view toggle in toolbar |
| `Layers3` | `lucide-react` | Multi-category split or stacked allocation view |

---

## Security and identity

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `ShieldCheck` | `lucide-react` | Confirmed protection / verified insurance; send review security indicator |
| `User` | `lucide-react` | Individual user / profile; send recipient indicator |
| `Eye` | `lucide-react` | View / reveal detail on family member stat card |
| `Moon` | `lucide-react` | Dark mode preference |
| `Sun` | `lucide-react` | Light mode preference |
| `Smartphone` | `lucide-react` | Push notifications / mobile preference |

---

## Misc / utility

| Icon name | Source | Preferred use |
|-----------|--------|---------------|
| `X` | `lucide-react` | Close modal, dismiss toast, clear filter |
| `MapPin` | `lucide-react` | Address / location result in global search |
| `PieChart` (icon) | `lucide-react` | Money distribution widget header; sub-nav overview |

---

## Non-Lucide icons

| Component path | Source | Preferred use |
|----------------|--------|---------------|
| `@radix-ui/react-icons` → `LightningBoltIcon` | `components/Hero.tsx` | Legacy CTA accent on the marketing Hero. **Do not introduce new usages.** Use Lucide `Zap` instead. |
| `components/icons/` | Custom SVG | Brand marks, wallet logos, and platform-specific glyphs that have no Lucide equivalent. Follow the pattern in [docs/ICON_SYSTEM.md § Adding a custom icon](ICON_SYSTEM.md#adding-a-custom-icon). |

---

## Quick example

```tsx
// Navigation item — decorative icon with visible label
import { Send } from "lucide-react";

<a href="/send" className="flex items-center gap-2 text-sm font-medium">
  <Send className="w-4 h-4" aria-hidden="true" />
  Send Money
</a>

// Icon-only button — must carry aria-label
import { Copy, Check } from "lucide-react";

<button
  type="button"
  aria-label="Copy address"
  onClick={handleCopy}
>
  {copied
    ? <Check className="w-4 h-4 text-emerald-300" aria-hidden="true" />
    : <Copy className="w-4 h-4" aria-hidden="true" />}
</button>
```

---

## Related docs

- [docs/ICON_SYSTEM.md](ICON_SYSTEM.md) — sizing grid, accessibility rules, and how to add a custom icon
- [docs/iconography-guidelines-handoff.md](iconography-guidelines-handoff.md) — design handoff: stroke weights, breakpoint guidance, open questions
- [docs/THEMING.md](THEMING.md) — colour tokens applied to icons
- [docs/COMPONENTS.md](COMPONENTS.md) — per-component notes
