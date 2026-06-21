# TODO - Settings preferences persistence

## Step 1: Wire UI to existing hook

- [ ] Update `app/settings/page.tsx` to use `useUserPreferences()`
- [ ] Hydrate Notifications toggles, Wallet currency select, Preferences timezone select, and Preferences density UI from persisted values
- [ ] Ensure optimistic UI for toggles/selects reconciles with server response

## Step 2: Toast + status feedback (i18n)

- [ ] Use `useToast()` to show success/error based on `saveState` from `useUserPreferences`
- [ ] Replace hardcoded copy with i18n via `useClientTranslator()` using en/es locale keys
- [ ] Add reduced-motion safe behavior for “smooth” scroll if applicable

## Step 3: Persist density (server + validation)

- [ ] Extend `app/api/user/preferences/route.ts` to accept/return `density`
- [ ] Extend `utils/validation/preferences-validation.ts` to validate `density`
- [ ] Update types (`utils/types/user.types` if needed) to include `density`
- [ ] Ensure `DensityContext` uses persisted density (if present) instead of only localStorage

## Step 4: Tests (≥85% lines/branches for new/modified hook)

- [ ] Add unit tests for `lib/hooks/useUserPreferences.ts`
  - [ ] optimistic update
  - [ ] PATCH failure rollback
  - [ ] debounce/rapid toggling last-write-wins
- [ ] Run coverage and ensure thresholds

## Step 5: Quality gates

- [ ] `npm run lint`
- [ ] `npx tsc --noEmit`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
