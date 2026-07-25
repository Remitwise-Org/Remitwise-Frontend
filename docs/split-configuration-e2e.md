# Smart Money Split — E2E Test Scenario

## Overview

The `split-configuration.spec.ts` Playwright spec covers the full Smart Money Split
configuration journey, from slider adjustment through live validation to save and reload.

## Test Coverage

| Scenario | Description |
|----------|-------------|
| **Adjust sliders** | Moving spending/savings/bills/insurance sliders updates the live total |
| **Single-bucket 100%** | Setting one bucket to 100% and others to 0 is valid and saveable |
| **Over-100% guard** | Total &gt; 100 blocks save, shows red guard, disables button |
| **Under-100% guard** | Total &lt; 100 blocks save, shows guard, disables button |
| **Exactly-100%** | Total = 100 enables save, shows "Ready to submit", removes guard |
| **Save via /api/split/update** | Valid split triggers POST, returns XDR, shows success toast |
| **Save via /api/split/initialize** | When no prior config exists, uses initialize endpoint |
| **Persisted reload** | After save and reload, slider values are restored from API |
| **Keyboard ArrowRight/Left** | Arrow keys increment/decrement slider values |
| **Keyboard Home/End** | Home → 0, End → max for each slider |
| **Keyboard Tab order** | Tab navigates through all sliders and the save button |
| **Save failure 500** | API 500 surfaces error toast with contract message |
| **Save failure 400** | API 400 (validation) surfaces error toast |
| **Save failure 401** | API 401 (unauth) surfaces error toast |
| **All-zero edge case** | 0% total is under-100, blocked |
| **All-25 edge case** | 25% each = 100%, valid |
| **Cancel reset** | Cancel button restores default values |

## Running

```bash
# Run the full e2e suite
npm run test:e2e

# Run only the split spec
npx playwright test tests/e2e/split-configuration.spec.ts

# Run with UI mode for debugging
npx playwright test tests/e2e/split-configuration.spec.ts --ui