# Settings Page Structure

The Settings screen (`app/settings/page.tsx`) was previously a single ~840-line
client component that held every section and a set of inline primitives. It has
been decomposed into per-section components under `components/settings/` so the
page is easy to review, test, and extend (e.g. future persistence work).

## Layout overview

```
app/settings/page.tsx                     ← page shell: header, nav, scroll-spy
└── components/settings/
    ├── SettingsPrimitives.tsx            ← shared building blocks
    ├── ProfileSection.tsx
    ├── NotificationsSection.tsx
    │   └── InsuranceReminderPreview.tsx  ← data-fetching widget used by Notifications
    ├── SecuritySection.tsx
    ├── WalletSection.tsx
    ├── FamilySection.tsx
    └── PreferencesSection.tsx
```

## Page shell — `app/settings/page.tsx`

The page owns only cross-cutting concerns:

- **`SECTIONS`** — the single source of truth for nav order, ids, label keys, and
  icons. Both the mobile pill nav and the desktop sidebar map over it, and the
  main content stack renders the section components in the same order.
- **Scroll-spy** — an `IntersectionObserver` watches each section element (looked
  up by `id`) and sets the `active` nav item to the most visible one. Each
  section component renders its own `<section id="...">` (via `SectionCard`) so
  the observer can find it. The ids must stay in sync with `SECTIONS`.
- **`scrollTo`** — smooth-scrolls to a section on nav click and optimistically
  sets the active item.

## Shared primitives — `components/settings/SettingsPrimitives.tsx`

Reused across sections; styling is intentionally identical to the previous inline
versions:

| Primitive       | Purpose |
| --------------- | ------- |
| `SectionCard`   | The bordered card wrapper that also renders the `<section id>` scroll-spy target. |
| `SectionHeader` | Icon + translated title/description header row. |
| `FieldRow`      | Label/hint on the left, control(s) on the right (responsive grid). |
| `TextInput`     | Styled text/email/tel input with translated placeholder + disabled state. |
| `Toggle`        | Accessible `role="switch"`; supports controlled and uncontrolled use. |
| `SaveButton`    | idle → saving → saved button that fires a success toast. |

## Sections

Each section is a self-contained component that renders one `SectionCard` with a
fixed `id` matching `SECTIONS`:

- **`ProfileSection`** (`#profile`) — avatar + identity fields, save button.
- **`NotificationsSection`** (`#notifications`) — grouped notification toggles and
  the embedded `InsuranceReminderPreview`, save button.
- **`SecuritySection`** (`#security`) — security toggles, session-timeout select,
  and a dismissible 2FA alert toggled by "sign out of all sessions".
- **`WalletSection`** (`#wallet`) — network radios, Soroban RPC field, auto-split
  toggle, default-currency select, save button.
- **`FamilySection`** (`#family`) — family member list with role badges and an
  invite button.
- **`PreferencesSection`** (`#preferences`) — theme picker, **density controls
  wired to `useDensity()`**, language/timezone selects, and date-format radios.

## Cross-cutting integrations

- **i18n** — every section uses `useClientTranslator()`. The app currently ships
  no `settings.*` translations, so `t()` falls back to returning the key path
  verbatim; component tests assert against those keys.
- **Density** — `PreferencesSection` reads/writes `useDensity()`; both the button
  group and the mirrored `<select>` reflect the same context value.
- **Toasts** — `SaveButton` calls `useToast()`, so any section containing it must
  be rendered within a `ToastProvider`.

## Testing

Each section (and the shared primitives + the insurance preview widget) has a
focused component test under `components/settings/*.test.tsx`. Tests render with
`tests/react/renderWithProviders`, which supplies `DensityProvider` and
`ToastProvider`. `InsuranceReminderPreview` tests mock `@/lib/client/apiClient`
to drive the loading/empty/loaded/unauthorized/error states.
