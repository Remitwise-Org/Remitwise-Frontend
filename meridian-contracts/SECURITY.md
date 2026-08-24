# Security Policy

## Security Pipeline & Automated Checks
All contributions to `PropChain-contract` must pass our rigorous security pipeline:
1. **Static Analysis**: `cargo clippy` and custom linters run on all modules.
2. **Dependency Scanning**: `cargo audit` & `cargo deny` ensure no vulnerable/unapproved dependencies.
3. **Formal Verification**: `cargo contract verify` and `cargo kani` run for formal theorem proving of our smart contracts.
4. **Fuzzing Tests**: `proptest` ensures fuzzy inputs handle edge cases safely.
5. **Gas Optimization Analysis**: `security-audit-tool` limits expensive structures (e.g. nested loops, vectors).
6. **Vulnerability Scanning**: `slither` handles general checks and `trivy` scans structural dependencies.

## Best Practices Guide
- NEVER use `unsafe { ... }` blocks unless fundamentally necessary (e.g. zero-copy serialization optimizations), and ensure thorough fuzzing limits access.
- Avoid large allocations (`Vec`) - use mappings instead when scaling data points.
- Implement explicit integer size conversions or `saturating_mul` / `checked_add` to prevent overflows, even outside of `overflow-checks = true` bounds.
- Always include explicit assertions for input validations.

## Security Incident Response Workflow

If you discover a security vulnerability, we would appreciate if you could disclose it responsibly.

**DO NOT** open a public issue! Instead, follow these steps:
1. Email our security team at `security@propchain.io` (or the repository owner).
2. Write a detailed description of the vulnerability, including reproduceable steps.
3. Wait for our acknowledgement (typically within 48 hours).
4. Our team will triage the issue and respond with a timeline for fixing.
5. Once resolved and merged, we will coordinate public disclosure if needed.

Thank you for helping keep PropChain secure!
