# Icon Reference

Quick reference for every icon used in RemitWise. For sizing rules, accessibility patterns, and how to add a custom icon, see [docs/ICON_SYSTEM.md](ICON_SYSTEM.md).

**Audience:** contributors adding new UI, reviewing PRs, or answering "which icon means X?" questions.

---

## How to read this table

| Column | Meaning |
|--------|---------|
| **Icon name** | Exact export name used in TypeScript imports. |
| **Source** | Library or file the icon comes from. |
| **Preferred use** | The one or two UI contexts where this icon should appear. Using it outside these contexts requires justification in the PR. |

---

## Navigation and layout

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `LayoutDashboard` | `lucide-react` | Primary nav — Dashboard route link |
| `Send` | `lucide-react` | Primary nav — Send Money route link; transaction send action |
| `FileText` | `lucide-react` | Primary nav — Bills route link; any document or receipt context |
| `Shield` | `lucide-react` | Primary nav — Insurance route link; generic protection indicator |
| `ShieldCheck` | `lucide-react` | Insurance — confirmed/active policy state; verified protection badge |
| `Users` | `lucide-react` | Primary nav — Family Wallets route link; any multi-person context |
| `Settings` | `lucide-react` | Primary nav — Settings route link; configuration controls |
| `Wallet` | `lucide-react` | Wallet connection button; wallet-related settings sections |
| `ArrowLeft` | `lucide-react` | Back button in page headers; previous-step controls |
| `ArrowRight` | `lucide-react` | Forward navigation; "view all" chevron on summary cards |
| `ArrowLeftRight` | `lucide-react` | Transfer / swap direction indicator in transaction items |
| `ArrowUpRight` | `lucide-react` | External link indicator; outbound navigation cue |
| `Home` | `lucide-react` | 404 / error pages — return to home action |
| `Menu` | `lucide-react` | Mobile nav — hamburger toggle |
| `ChevronDown` | `lucide-react` | Collapsed expandable row or accordion; dropdown trigger |
| `ChevronUp` | `lucide-react` | Expanded accordion; scroll-to-top affordance |
| `ChevronLeft` | `lucide-react` | Calendar or paginated list — previous page/month |
| `ChevronRight` | `lucide-react` | Calendar or paginated list — next page/month; settings row disclosure |
| `LayoutGrid` | `lucide-react` | Toolbar — grid view toggle |
| `LayoutList` | `lucide-react` | Toolbar — list view toggle |

---

## Actions and controls

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `Plus` | `lucide-react` | Add new item (bill, goal, family member) |
| `Save` | `lucide-react` | Save / confirm edits in an inline form |
| `Edit2` | `lucide-react` | Enter inline edit mode (family member stat cards, detail drawer) |
| `PenLine` | `lucide-react` | Edit action in approval queues and dense list rows |
| `Copy` | `lucide-react` | Copy to clipboard — idle state; always paired with `Check` for confirmation |
| `Check` | `lucide-react` | Copy confirmation — shown briefly after a successful clipboard write; also pricing / feature checklist |
| `CheckCheck` | `lucide-react` | All-read confirmation (WhatsNew panel "mark all read") |
| `ClipboardPaste` | `lucide-react` | Paste from clipboard into recipient address field |
| `Download` | `lucide-react` | Export / download (transaction CSV/JSON, financial insights) |
| `Filter` | `lucide-react` | Open filter panel on list views |
| `FilterIcon` | `lucide-react` | Alias for `Filter`; prefer `Filter` for new code |
| `Search` | `lucide-react` | Search input prefix; command palette trigger |
| `SearchCheck` | `lucide-react` | Command palette — confirmed search / "go to" action |
| `SearchX` | `lucide-react` | Empty search results state |
| `RefreshCw` | `lucide-react` | Refresh / retry data (stale-data banner) |
| `RefreshCcw` | `lucide-react` | Alternative refresh; widget error state retry |
| `RotateCcw` | `lucide-react` | Admin — reset / undo action |
| `LogOut` | `lucide-react` | Wallet dropdown — disconnect / sign out |
| `ExternalLink` | `lucide-react` | Opens in a new tab (WhatsNew panel links) |
| `Play` | `lucide-react` | Start a tutorial chapter or video |
| `X` | `lucide-react` | Close modal, dismiss toast, clear filter chip |
| `XCircle` | `lucide-react` | Cancel an item inline (family drawer, approval queue rejection) |
| `Eye` | `lucide-react` | View / preview (family member stat card — view address) |
| `QrCode` | `lucide-react` | Scan QR code to fill recipient address |
| `Hash` | `lucide-react` | Deep-link heading anchor; debug / dev page |
| `Link2` | `lucide-react` | Copy page URL / shareable link (debug page) |

---

## Status and feedback

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `CheckCircle2` | `lucide-react` | Success state — operation completed; async submission success |
| `CheckCircle` | `lucide-react` | Alternative success; bills card completed-payment tick |
| `CircleCheckBig` | `lucide-react` | Allocation confirmed state (AllocationStatusCard) |
| `AlertCircle` | `lucide-react` | Error state — operation failed; notice/banner error variant |
| `AlertTriangle` | `lucide-react` | Warning state — caution needed; stale-data banner; wrong-network banner |
| `Info` | `lucide-react` | Informational notice/banner; tooltip trigger; chart annotation |
| `HelpCircle` | `lucide-react` | Contextual help tooltip trigger; confirm-dialog "help" variant |
| `Loader2` | `lucide-react` | In-progress spinner — always paired with `animate-spin` |
| `Clock` | `lucide-react` | Generic pending/scheduled indicator (recent transactions, session expiry) |
| `Clock3` | `lucide-react` | Pending / idle status in async submission map; bill overdue indicator |
| `Clock4` | `lucide-react` | Bill due-soon state (BillsCard) |
| `Inbox` | `lucide-react` | Empty list state (transaction history — no results) |
| `Repeat` | `lucide-react` | Recurring bill or recurring schedule indicator |
| `Zap` | `lucide-react` | Speed / instant transfer accent (hero CTA, emergency transfer, feature highlight); Lucide replacement for the legacy `LightningBoltIcon` |

---

## Data and finance

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `DollarSign` | `lucide-react` | Savings goal stats — dollar-value metric |
| `CircleDollarSign` | `lucide-react` | Transaction type — payment / dollar-denominated event |
| `CreditCard` | `lucide-react` | Payment method indicator in send review step |
| `Receipt` | `lucide-react` | Bill payments stats — total-due metric |
| `PiggyBank` | `lucide-react` | Savings context (SavingsByGoalWidget, financial insights) |
| `Target` | `lucide-react` | Savings goal metric card; goal-progress callout |
| `TrendingUp` | `lucide-react` | Positive trend indicator on stat cards and charts |
| `TrendingDown` | `lucide-react` | Negative trend indicator on stat cards |
| `Minus` | `lucide-react` | No-change / flat trend indicator on stat cards |
| `BarChart3` | `lucide-react` | Bar chart widget header; Insights page header |
| `PieChart` | `lucide-react` | Pie / donut chart widget header |
| `ArrowUp` | `lucide-react` | Outgoing / debit transaction direction |
| `ArrowDown` | `lucide-react` | Incoming / credit transaction direction |
| `Layers3` | `lucide-react` | Split allocation widget; stacked-distribution concept |
| `Split` | `lucide-react` | Feature section — "automatic split" feature card |
| `History` | `lucide-react` | Transaction history link / context |
| `Activity` | `lucide-react` | Activity feed; admin monitoring panel; dashboard header indicator |

---

## User and access

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `User` | `lucide-react` | Individual user / profile (wallet dropdown, settings profile, family member) |
| `Crown` | `lucide-react` | Family wallet — Owner role badge |
| `CalendarClock` | `lucide-react` | Recurring bills indicator; send-recurring page header |
| `Calendar` | `lucide-react` | Date picker trigger (financial insights date range) |
| `BookOpen` | `lucide-react` | Tutorial landing page header |
| `Bell` | `lucide-react` | Notifications section in settings |
| `Globe` | `lucide-react` | Language/locale switcher; global reach feature highlight |
| `Smartphone` | `lucide-react` | Mobile app or device preference in settings |
| `Moon` | `lucide-react` | Dark mode toggle in preferences |
| `Sun` | `lucide-react` | Light mode toggle in preferences |
| `Sparkles` | `lucide-react` | AI / smart-suggestion affordance (dashboard header, preferences section) |
| `Star` | `lucide-react` | Favourite or featured indicator (dashboard header) |
| `Lock` | `lucide-react` | Security / locked-state feature highlight |
| `MapPin` | `lucide-react` | Address or location result in search |

---

## Developer and admin

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `Terminal` | `lucide-react` | Debug page — dev tooling UI only; never shown to end users |
| `Cpu` | `lucide-react` | Debug page — system / runtime metrics; never shown to end users |
| `Flag` | `lucide-react` | Debug page — feature flag indicator |
| `Command` | `lucide-react` | Command palette keyboard shortcut badge (⌘ key) |
| `Keyboard` | `lucide-react` | Shortcut help modal trigger |
| `GitPullRequest` | `lucide-react` | Admin page — open PR / deployment indicator |
| `StaleBanner` trigger | `lucide-react` (`AlertTriangle`) | See status table above |

---

## Social / brand (footer only)

These are brand-mark icons. Use them **only** in the site footer. Do not mix them with product-UI icons in navigation or action buttons.

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `Facebook` | `lucide-react` | Footer social link |
| `Github` | `lucide-react` | Footer social link |
| `Instagram` | `lucide-react` | Footer social link |
| `Linkedin` | `lucide-react` | Footer social link |
| `Twitter` | `lucide-react` | Footer social link |
| `Youtube` | `lucide-react` | Footer social link |

---

## Custom / non-Lucide icons

| Icon name | Source | Preferred use |
|-----------|--------|--------------|
| `LightningBoltIcon` | `@radix-ui/react-icons` | **Legacy.** Used only in `components/Hero.tsx` for the CTA accent. Do not introduce new usages — use Lucide `Zap` instead. |

There are no custom SVG components in `components/icons/` yet. When you need a brand logo or platform glyph that Lucide does not provide, create a file there following the pattern in [ICON_SYSTEM.md — Adding a custom icon](ICON_SYSTEM.md#adding-a-custom-icon).

---

## Quick-import cheatsheet

```tsx
// Navigation
import { LayoutDashboard, Send, FileText, Shield, Users, Settings } from "lucide-react";

// Actions
import { Plus, Copy, Check, Download, Filter, Search, X } from "lucide-react";

// Status / feedback
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";

// Trends
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

// Async submission status map
import { AlertCircle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
```

---

## Related docs

- [docs/ICON_SYSTEM.md](ICON_SYSTEM.md) — sizing grid, accessibility rules, how to add a custom icon, design tokens
- [docs/iconography-guidelines-handoff.md](iconography-guidelines-handoff.md) — design handoff: stroke weights, breakpoint guidance, container specs, open questions
- [docs/COMPONENTS.md](COMPONENTS.md) — per-component prop tables; notes on icon-accessibility patterns
- [docs/THEMING.md](THEMING.md) — colour tokens used with icons (`currentColor` → Tailwind classes)
