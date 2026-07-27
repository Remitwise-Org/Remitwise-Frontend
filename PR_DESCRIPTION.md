# Implement Keyboard Navigation & Focus Return for Wallet Dropdown

## Summary

This PR implements full keyboard navigation accessibility support and ensures focus returns to the trigger button upon closure for the `WalletButton` and `WalletDropdown` components, locking in the contract with comprehensive unit tests.

Closes #

## Type of Change

- [ ] `feat` — new feature
- [x] `fix` — bug fix / accessibility improvement
- [x] `test` — adding or updating tests
- [ ] `docs` — documentation only

## Scope

- [x] Frontend / Web (`components/WalletDropdown.tsx`, `components/WalletButton.tsx`, tests)
- [ ] CI / Ops

---

## What Changed and Why

### Keyboard Navigation Features in `components/WalletDropdown.tsx`
- **ArrowDown / ArrowUp**: Cycle focus through the dropdown items (Copy Address button, Account, Settings, Disconnect) with complete wrap-around support.
- **Home / PageUp**: Jump focus directly to the first interactive element in the dropdown.
- **End / PageDown**: Jump focus directly to the last interactive element in the dropdown.
- **Enter**: Activate the currently focused element programmatically by triggering its `click()` event.
- Fully preserved standard `Escape` and `Tab` focus ring behaviors.

### Focus Return to Trigger in `components/WalletButton.tsx`
- Updated the `handleConnect` and `handleDisconnect` flows to synchronously call `buttonRef.current?.focus()` after closing the dropdown, ensuring that keyboard focus is never lost or dropped to the document body.

### Unit Testing Coverage
- **[WalletDropdown.test.tsx](file:///c:/Users/HP/Desktop/Stellar/Remitwise-Frontend-1/components/WalletDropdown.test.tsx)**: Verifies connecting and disconnecting initial focus, arrow keys focus cycle and wrap-around, Home/End/Page Up/Down direct focus jumps, Enter click activation, Tab cycling, Escape key dropdown close callback, and sad path empty menu cases.
- **[wallet-button.test.tsx](file:///c:/Users/HP/Desktop/Stellar/Remitwise-Frontend-1/tests/unit/ui/wallet-button.test.tsx)**: Re-architected with a dynamic `useWallet` mock. Added unit tests verifying that focus correctly returns to the trigger button when connect succeeds, disconnect succeeds, or Escape closes the dropdown.

---

## Verification

### Automated Tests
- Ran the complete test suite:
  ```bash
  npm test
  ```
  Result: **Passed (130/130 tests: 26 Node unit tests + 104 Vitest unit tests)**

### Linter & Type Check
- Ran eslint check specifically on changed files:
  ```bash
  npx eslint components/WalletDropdown.tsx components/WalletDropdown.test.tsx components/WalletButton.tsx tests/unit/ui/wallet-button.test.tsx
  ```
  Result: **Clean (0 errors, 0 warnings)**
