# Wallet dropdown — Connected & Disconnected states

Scope: UI/UX specification only. Reference components: components/WalletButton.tsx, components/WalletDropdown.tsx, components/Header.tsx

Branch: uiux/wallet-dropdown-states

Summary
- Provide clear, trustworthy wallet affordance in two states: Disconnected and Connected.
- Add truncated address display with a copy affordance + accessible feedback.
- Define dropdown contents and keyboard interactions.

1. Disconnected state (Connect wallet)
- Primary appearance: a prominent CTA button reading “Connect wallet”.
  - Shape: rounded pill (border-radius: 999px).
  - Height: 36px on desktop, 44px on mobile.
  - Padding: 12px 16px.
  - Icon: wallet/plug icon left (16px) optional.
  - Visual weight: solid primary color (brand red `#D72323`, RemitWise design system) or subtle outline when header is dense.
  - Hover: elevate (box-shadow: 0 2px 6px rgba(0,0,0,0.08)).
  - CSS state class: `.wallet--disconnected`

Redline notes
- Desktop: inline in header, right-aligned, 36px height.
- Mobile (375px): use full tappable area; button remains visible in header top-right but increases hit target to 44px.

2. Connected state (compact address + network)
- Primary appearance: composite pill — menu trigger + copy control.
  - Layout: `[network-dot] [truncated address] [chevron] | [copy-icon]`
  - Pill height: 44px mobile / 36px from 375px breakpoint; padding: 8px 12px; gap: 8px.
  - Font-size: 14px; font-weight: 600; mono for address.
  - Network indicator: 8px circle colored per network (green for mainnet, amber for testnet, gray for unknown).
  - CSS state class: `.wallet--connected`

Truncated address format
- Rule: keep first 6 chars and last 4 chars separated by ellipsis.
  - Example (Stellar): `GABCDE...7890`
  - Rationale: balances recognizability and compactness; 6/4 fits within header at 1280px and 375px.
  - Implementation: `truncateAddress()` in `lib/utils/walletAddress.ts`. Copy always uses the full address.

Copy affordance and feedback
- Connected pill: copy control sits beside the menu trigger (not nested inside it).
  - Visual: icon-only; tooltip “Copy address” → “Copied!” for 2 seconds after success.
  - On click: copies the **full** address (never the truncated string).
  - Accessibility: polite `aria-live` region announces “Wallet address copied to clipboard”.
  - Keyboard: copy is a separate focusable button (Tab / Enter / Space).
- Menu also exposes “Copy address” as item 3 for discoverability.

3. Dropdown (menu) — layout & items
Top area (non-interactive header within menu)
- Show the full connected identity block at top of dropdown (visually distinct):
  - Large network dot (10px), full ENS or truncated address, copy action (icon) and small explorer-link icon (optional).
  - Small label under address: wallet provider / connected wallet name (e.g., “MetaMask”).

Primary menu items (ordered)
1. Account — label: Account → `/dashboard`
2. Settings — label: Wallet settings → `/settings`
3. Copy address — label: Copy address (duplicates inline copy affordance)
4. View on explorer — label: View on explorer (stellar.expert, new tab)
5. Disconnect — label: Disconnect (destructive action, visually separated)

Menu visual rules
- Group items with a divider above Disconnect. Keep menu width 240px on desktop; for small screens allow 100% width sheet (see responsive notes).
- Menu items: left icon (20px), label, right secondary text when needed (e.g., network name). Use 12px vertical padding per item.
- Disconnect: color the label in critical color (red500); add subtle hover background.

4. Keyboard interactions and a11y
- Trigger button
  - WalletButton is button with aria-haspopup="menu" and aria-expanded updated on open/close.
  - Activate with Enter/Space to open.
- Menu behavior
  - On open via keyboard: focus moves to the first menu item.
  - ArrowDown/ArrowUp navigate between items (role="menu" and role="menuitem").
  - Home/End jump to first/last.
  - Enter/Space activates item.
  - Escape closes menu and returns focus to the WalletButton (focus return required).
  - Tab: moves focus out — when tabbing forward from last item, close menu and allow normal tabbing. When Shift+Tab from first item, close and return focus to button.
  - Focus outline: use system focus ring for keyboard users; do not hide.

Focus trap vs focus return
- We do NOT force a hard focus trap inside the menu (users should be able to Tab out), but we DO ensure that when the menu closes, focus returns to the WalletButton. This satisfies usability and keyboard flow.

ARIA & live regions
- Provide a polite aria-live="polite" container (visually hidden) for announcements such as copy success and network switching.
- Announcements to include:
  - "Wallet address copied to clipboard"
  - "Wallet disconnected"

5. Responsive behavior & visual QA
- Desktop (1280px)
  - Wallet pill fits in header; menu floats under the button, aligned to button's right edge.
  - Menu width: 240px; ample spacing.
- Mobile (375px)
  - Show compact pill in header; on open use a full-width bottom sheet or full-screen modal for the menu (preferred: bottom sheet) to improve tap targets.
  - Bottom sheet layout: top area shows identity block, then list items with full-width tappable rows.

6. Accessibility checklist (must pass)
- Menu keyboard operability: open, navigate with arrows, activate with Enter, close with Escape, focus returns to trigger.
- Focus visible for all interactive elements (copy, menu items, close).
- Copy action announced via ARIA live region.
- Contrast: ensure label and icons meet 4.5:1 for normal text (or 3:1 for large text if used).

7. Visual redlines (pixels & spacing)
- Wallet pill: height 36px, padding-left: 12px, padding-right: 12px, gap 8px.
- Network dot: 8px diameter; margin-left: 2px.
- Copy icon: 16px glyph; tap target min 36px.
- Menu item height: 44px; icon 20px left; label font-size 14px.

8. Implementation notes for engineers (UI/UX handoff)
- Provide two CSS states: .wallet--connected and .wallet--disconnected.
- Expose accessible hooks: props/attributes on the WalletButton for aria-expanded, aria-controls, and the menu should have id matching aria-controls.
- Ensure that the copy control copies the full address string.

9. Test plan (manual + automated checks)
- Visual QA at 375px and 1280px: verify pill fits, copy button visible, menu items full-width on mobile.
- Commands to run before merge:
  - npm run build
  - npm run lint
- Accessibility checks:
  - Keyboard-only: tab to WalletButton, open, arrow through items, activate Copy address, verify ARIA announcement.
  - Screen reader: verify that opening the menu reads the first menu item and copy announces success.

10. Commit message (suggested)
feat(uiux): design wallet dropdown connected and disconnected states

11. PR description notes
- Link to this spec (design/wallet-dropdown-states.md).
- Attach screenshots or Figma frames for disconnected and connected states, desktop and mobile.

Appendix — Example copy interaction flow
1. User tabs to WalletButton and presses Enter.
2. Menu opens; focus lands on first item Account.
3. User presses Tab to focus Copy address (or clicks icon inline).
4. Button copies address; an aria-live region reads: "Wallet address copied to clipboard"; visual tooltip shows "Copied!" for 2s.
