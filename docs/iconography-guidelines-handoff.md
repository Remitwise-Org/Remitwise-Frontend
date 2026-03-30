# Iconography Guidelines Handoff (Lucide)

Feature area:
- Cross-app navigation, page headers, action buttons, status messaging, and utility controls

Design source:
- Existing master design file: https://www.figma.com/design/yTHE6toX5wHJs39DgsoETp/Design?node-id=0-1&p=f&t=LH2dbdfWo4qFFOW9-0
- Recommended design page name: `Foundations / Iconography`
- Recommended frame set:
  - `Iconography / Mobile / 390`
  - `Iconography / Tablet / 834`
  - `Iconography / Desktop / 1440`

Primary user task:
- Help users identify common actions and statuses quickly without relearning icon meaning between routes.

Route mapping:
- Global desktop navigation -> `components/Nav/PrimaryNav.tsx`
- Global mobile navigation -> `components/Nav/MobileNav.tsx`
- Shared page header -> `components/PageHeader.tsx`
- Financial insights header -> `components/FinancialInsightsHeader.tsx`
- Send page header -> `app/send/components/SendHeader.tsx`
- Settings navigation and section controls -> `app/settings/page.tsx`
- Transaction history actions -> `app/dashboard/transaction-history/page.tsx`
- Family summary cards -> `app/family/components/FamilyWalletsStatsCards.tsx`
- Dashboard quick actions -> `components/Dashboard/QuickActions.tsx`

Breakpoints covered:
- Mobile: 390px width. Prioritize icon + label pairings, 44px minimum touch targets, and one-column card stacks.
- Tablet: 834px width. Preserve label visibility while reducing icon container density in split layouts.
- Desktop: 1440px width. Support dense navigation rows and compact action groups without changing icon meaning.

Current UI audit:
- `lucide-react` is already the dominant icon library across `app/` and `components/`.
- Navigation mostly uses a consistent family, but icon sizes vary between `16px`, `20px`, and ad hoc values.
- Action buttons are inconsistent in sizing:
  - Transaction history uses `17px` icons.
  - Shared page headers use `20px`.
  - Settings mixes `13px`, `18px`, and `20px`.
- A few non-Lucide patterns remain and should be normalized where practical:
  - `components/Hero.tsx` uses `@radix-ui/react-icons` for the lightning bolt CTA accent.
  - `lib/changelog.ts` uses emoji as release icons instead of product-system icons.
- Accessibility patterns are partially in place:
  - Many icon-only buttons already expose `aria-label`.
  - Focus rings exist on several controls, but color and offset treatments vary by route.

Key gaps vs desired pattern:
- No shared size grid for Lucide usage.
- No single meaning map for recurring actions like send, export, settings, filter, copy, success, and error.
- No dedicated handoff page tying icon guidance to route usage and breakpoint behavior.
- No explicit guidance for when icon-only buttons are allowed versus when labels are required.

Recommended Lucide standard:
- Use Lucide for all product UI action, navigation, feedback, and status icons.
- Keep external brand marks and social logos separate from the Lucide system.
- Avoid mixing Lucide with Radix or emoji for recurring in-product actions.

Size and stroke grid:
- `16px / stroke 2`: dense desktop nav items, inline metadata, compact table actions
- `18px / stroke 1.75`: secondary controls, filter/export buttons, settings rows
- `20px / stroke 1.75`: primary header actions, mobile nav icons, icon-only buttons
- `24px / stroke 1.5`: feature cards, onboarding, empty states, explanatory callouts

Icon container guidance:
- Dense nav pills: `h-8 w-8`
- Standard utility buttons: `h-10 w-10`
- Touch-first/mobile controls: `h-11 w-11` or larger
- Feature or stat cards: `h-12 w-12` when the icon is decorative support rather than the only affordance

Meaning mapping for recurring actions:
- Send money: `Send`
- Dashboard overview: `LayoutDashboard`
- Bills or documents: `FileText`
- Insurance or protection: `Shield` or `ShieldCheck` for confirmed protection states
- Family or shared account access: `Users`
- Settings or configuration: `Settings`
- Export or download: `Download`
- Filter results: `Filter`
- Search: `Search`
- Add new item: `Plus`
- Back or previous: `ArrowLeft`
- Success or completed: `CheckCircle2`
- In progress: `Loader2` or `Clock3`
- Warning: `AlertTriangle`
- Error or failed: `AlertCircle` or `XCircle`
- Copy to clipboard: `Copy`, switching to `Check` for temporary confirmation
- Visibility or preview: `Eye`
- Edit: `Pencil` preferred over legacy edit variants unless an older icon is already entrenched

Labeling rules:
- Mobile primary actions should keep text labels next to icons.
- Desktop navigation should keep labels visible unless space is severely constrained.
- Icon-only controls are acceptable for back, close, copy, menu, and overflow actions only when `aria-label` is present.
- Do not rely on color alone to distinguish status icons; pair icon changes with text labels or badges.

Component and state inventory:
- Navigation:
  - Default, hover, active, focus-visible
- Header actions:
  - Default, hover, focus-visible, disabled
- Filter/export buttons:
  - Default, hover, focus-visible, loading
- Status badges and cards:
  - Success, pending, warning, error
- Form-affiliated icon controls:
  - Default, focus-visible, error, disabled
- Copy/share utilities:
  - Default, hover, focus-visible, success confirmation

Spacing and layout specs:
- Desktop nav should keep `gap-2` between icon and label.
- Mobile menu rows should preserve `gap-4` between icon tile and label for quick scanning.
- Header icon buttons should remain square and align to the same optical size as the adjacent text block.
- Mixed action groups should keep the icon baseline centered with the text cap height; avoid arbitrary icon sizes like `17px`.

Typography specs:
- Icon labels in navigation: `text-sm font-medium`
- Utility buttons: `text-sm font-semibold`
- Section tabs or pills: `text-xs` to `text-sm` depending on density
- Status labels adjacent to icons: `text-xs` or `text-sm`, never icon-only for critical outcomes

Interaction notes:
- Hover should change surface or icon color, not swap icon glyphs.
- Focus-visible should use a consistent red ring treatment on dark UI surfaces.
- Disabled states should reduce opacity and remove hover-only color shifts.
- Loading states should reserve icon space to avoid button text jump.
- Error states should pair icon color with helper copy and, where relevant, field-level messaging.

Accessibility notes:
- Target WCAG 2.1 AA contrast for icon strokes against their surfaces.
- Maintain visible focus indicators with at least a `2px` ring and offset on dark backgrounds.
- Keep icon-only controls at `44x44px` minimum touch size where they are interactive.
- Decorative icons should be marked `aria-hidden`.
- Interactive icons must expose an accessible name through visible text or `aria-label`.

Tailwind / design system notes:
- This pass does not require a `tailwind.config.js` extension.
- Existing tokens already cover the main iconography surfaces:
  - `brand.red`
  - `brand.dark`
  - `red.600`, `red.700`
- Engineering should standardize around shared size utilities or component props instead of continuing route-level one-offs.
- Optional future semantic tokens if the team wants stricter reuse:
  - `icon.nav = 16`
  - `icon.control = 20`
  - `icon.feature = 24`
  - `stroke.default = 1.75`

Annotated handoff notes for engineering:
- Replace ad hoc `17px` action icons in transaction-history actions with the standard `18px / stroke 1.75`.
- Normalize settings navigation and section icon sizes to the same grid instead of mixing `13px` and `18px`.
- Keep desktop and mobile nav on a predictable two-size system:
  - Desktop nav: `16px`
  - Mobile nav: `20px`
- Review `components/Hero.tsx` and decide whether the Radix lightning icon should be replaced with Lucide `Zap` to avoid mixed visual language.
- Review `lib/changelog.ts` and decide whether emoji should remain content-side only or be replaced in UI render layers with Lucide icons.

Repo avatar note:
- Repository avatar work is external to this codebase.
- Recommended handoff for GitHub avatar:
  - Use the existing RemitWise brand mark from the logo design source.
  - Export square variants at `512x512` and `128x128`.
  - Preserve a simple silhouette that remains legible at small sizes and does not compete with in-product Lucide strokes.

Open questions:
- Product: should any route intentionally keep a non-Lucide illustrative icon set, or should Lucide fully own product UI iconography?
- Engineering: do you want a shared `IconButton` and route-nav config cleanup in a follow-up implementation ticket?
- Engineering: should `Edit2` usages be normalized to `Pencil` for consistency?
- Content: should release/changelog items keep emoji for tone, or switch to a product-system icon treatment?
- Design: can the master Figma file add a dedicated `Foundations / Iconography` page so route teams do not reinterpret the action map independently?

Suggested review flow:
- Run a 15-20 minute design review with engineering using the routes listed above.
- Confirm final icon meanings before any shared component refactor.
- Track code cleanup separately from this handoff so design sign-off is not blocked on implementation debt.

Example closure note:
- `design: handoff approved - iconography guidelines linked in repo, route audit captured, engineering review pending`
