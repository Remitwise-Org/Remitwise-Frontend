# PropChain Compliance Registry (Issue #45)

Multi-jurisdictional compliance and regulatory framework for PropChain: KYC/AML, sanctions screening, audit trails, workflow management, and regulatory reporting.

## Features

- **Multi-jurisdiction**: US, EU, UK, Singapore, UAE, Other with configurable rules per jurisdiction.
- **KYC**: Verification requests, document/biometric types, verification levels, expiry.
- **AML**: Risk factors (PEP, high-risk country, transaction patterns, source of funds), batch AML checks.
- **Sanctions**: Multiple list sources (UN, OFAC, EU, UK, Singapore, UAE), status and list stored per account.
- **Audit**: Audit log per account; compliance report and sanctions screening summary.
- **Workflow**: Create verification request → off-chain processing → process_verification_request; workflow status query.
- **Regulatory reporting**: `get_regulatory_report(jurisdiction, period_start, period_end)`.
- **Transaction compliance**: `check_transaction_compliance(account, operation)` for rules-engine style checks.
- **Integration**: Implements `ComplianceChecker` trait for PropertyRegistry cross-calls.

## Build and Test

From repo root:

```bash
cargo build -p compliance_registry
cargo test -p compliance_registry
```

## Usage with PropertyRegistry

1. Deploy ComplianceRegistry.
2. On PropertyRegistry, call `set_compliance_registry(Some(registry_address))` (admin).
3. Registration and transfers will then require compliant accounts (registry `is_compliant(account)` must be true).

See `docs/compliance-regulatory-framework.md` and `docs/compliance-integration.md` for full integration and best practices.
