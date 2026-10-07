# Code Quality, Formatting, and Linting Runbook

## Objective
Establishes standardized code formatting, static analysis rules, and CI validation checks for **Remitwise-Frontend**.

Related Issue: #1369 - Refactor: extract the money-formatting hook

## Standard Quality Gates
1. **Formatting**: Automatic adherence to repository Prettier / rustfmt / Black configurations.
2. **Static Linting**: Zero unhandled compiler warnings and zero strict lint suppressions.
3. **Type Safety**: Full type annotations without implicit `any` escape hatches.

## Runbook
```bash
# Verify formatting
npm run format:check || cargo fmt --check

# Execute static analysis
npm run lint || cargo clippy -- -D warnings
```
