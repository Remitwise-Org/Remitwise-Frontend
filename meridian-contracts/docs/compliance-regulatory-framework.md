# Compliance and Regulatory Framework (Issue #45)

This document describes the **enhanced compliance and regulatory framework** for PropChain: multi-jurisdiction rules, KYC/AML integration, reporting, automated checks, sanctions screening, workflow management, and regulatory reporting.

## Overview

- **ComplianceRegistry contract** (`contracts/compliance_registry/`): Multi-jurisdictional compliance rules, KYC/AML/sanctions, audit trails, workflow, and reporting.
- **PropertyRegistry integration** (`contracts/lib`): When a compliance registry is set, `register_property`, `transfer_property`, and related flows call the registry to enforce compliance.

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|-----------------|
| Multi-jurisdictional compliance rules engine | `Jurisdiction`, `JurisdictionRules`, `get_jurisdiction_rules`, `update_jurisdiction_rules`, `check_transaction_compliance(account, operation)` |
| KYC/AML integration with external providers | `create_verification_request`, `process_verification_request`, `register_service_provider`, `submit_verification`, `update_aml_status` |
| Compliance reporting and audit trails | `get_audit_logs`, `get_compliance_report(account)`, `AuditLog`, `ComplianceReport` |
| Automated compliance checking for transactions | `check_transaction_compliance(account, operation)`, PropertyRegistry `check_compliance()` (cross-call to registry) |
| Sanction list screening and monitoring | `update_sanctions_status`, `batch_sanctions_check`, `SanctionsList`, `get_sanctions_screening_summary()` |
| Compliance workflow management | `create_verification_request`, `process_verification_request`, `get_verification_workflow_status(request_id)`, `WorkflowStatus` |
| Regulatory reporting automation | `get_regulatory_report(jurisdiction, period_start, period_end)` returning `RegulatoryReport` |
| Compliance documentation and best practices | This doc, `docs/compliance-integration.md`, `contracts/compliance_registry/README.md` |

## Multi-Jurisdictional Rules Engine

- **Jurisdictions**: US, EU, UK, Singapore, UAE, Other.
- **Per-jurisdiction rules**: `JurisdictionRules` (KYC/AML/sanctions required, minimum verification level, data retention, biometric).
- **Transaction compliance**: Call `check_transaction_compliance(account, ComplianceOperation)` before sensitive operations. Operations: `RegisterProperty`, `TransferProperty`, `UpdateMetadata`, `CreateEscrow`, `ReleaseEscrow`, `ListForSale`, `Purchase`, `BridgeTransfer`.

## KYC/AML and External Providers

- **Verification request flow**: User calls `create_verification_request(jurisdiction, document_hash, biometric_hash)`. Off-chain provider calls `process_verification_request(request_id, ...)` after verification.
- **Service providers**: Register via `register_service_provider(provider, service_type)` (0=KYC, 1=AML, 2=Sanctions, 3=All). Registered KYC providers are added as verifiers.
- **KYC**: `submit_verification(account, jurisdiction, kyc_hash, risk_level, document_type, biometric_method, risk_score)`.
- **AML**: `update_aml_status(account, passed, risk_factors)`, `batch_aml_check(accounts, risk_factors_list)`.
- **Sanctions**: `update_sanctions_status(account, passed, list_checked)`, `batch_sanctions_check(accounts, list_checked, results)`.

## Compliance Reporting and Audit Trails

- **Audit log**: Every verification, AML check, sanctions check, and consent update is logged. Use `get_audit_logs(account, limit)` to retrieve.
- **Compliance report**: `get_compliance_report(account)` returns `ComplianceReport` (compliance status, jurisdiction, risk level, KYC/AML/sanctions flags, audit count, expiry).

## Automated Compliance Checking (PropertyRegistry)

- Admin sets the registry with `set_compliance_registry(Some(registry_address))`.
- On `register_property` and `transfer_property`, the registry’s `is_compliant(account)` is called via the `ComplianceChecker` trait. If the registry is set and returns false, the call fails with `NotCompliant` or `ComplianceCheckFailed`.
- Frontends can call `check_account_compliance(account)` on the PropertyRegistry to query compliance without sending a transaction.

## Sanction List Screening and Monitoring

- **Lists**: UN, OFAC, EU, UK, Singapore, UAE, Multiple.
- **Per-account**: `update_sanctions_status(account, passed, list_checked)`; `sanctions_checked` and `sanctions_list_checked` are stored in `ComplianceData`.
- **Summary**: `get_sanctions_screening_summary()` returns supported lists and (when populated) screening counts.

## Compliance Workflow Management

- **Create request**: `create_verification_request(jurisdiction, document_hash, biometric_hash)` → returns `request_id`.
- **Process**: Verifier calls `process_verification_request(request_id, kyc_hash, risk_level, ...)`.
- **Status**: `get_verification_workflow_status(request_id)` returns `WorkflowStatus` (Pending, InProgress, Verified, Rejected, Expired).

## Regulatory Reporting Automation

- **Report**: `get_regulatory_report(jurisdiction, period_start, period_end)` returns `RegulatoryReport` (jurisdiction, period, verifications_count, compliant_accounts, aml_checks_count, sanctions_checks_count). Counts can be filled by off-chain indexing or future on-chain counters.

## PropertyRegistry Integration

| Message | Description |
|---------|-------------|
| `set_compliance_registry(Option<AccountId>)` | Admin sets or clears the ComplianceRegistry address. |
| `get_compliance_registry()` | Returns the current registry address. |
| `check_account_compliance(AccountId)` | Returns whether the account is compliant (or true if no registry is set). |

Internal: `check_compliance(account)` is used in `register_property` and `transfer_property`; it performs a cross-call to the registry’s `is_compliant(account)` when the registry is set.

## Best Practices

1. **Set the registry**: Deploy ComplianceRegistry, then call `set_compliance_registry(Some(registry_id))` on PropertyRegistry.
2. **Register providers**: Register KYC/AML/sanctions providers with `register_service_provider` and use the verification-request flow for user onboarding.
3. **Check before UX**: Call `check_account_compliance(account)` or `get_compliance_report(account)` before showing restricted actions.
4. **Transaction checks**: For custom flows, call `check_transaction_compliance(account, operation)` on the registry before executing sensitive operations.
5. **Audit**: Use `get_audit_logs(account, limit)` and `get_compliance_report(account)` for audits and reporting.
6. **Jurisdiction rules**: Use `get_jurisdiction_rules(jurisdiction)` and `update_jurisdiction_rules` (admin) to align with local regulations.

## Files

- **Contract**: `contracts/compliance_registry/lib.rs` — ComplianceRegistry logic, traits impl, tests.
- **Traits**: `contracts/traits/src/lib.rs` — `ComplianceChecker`, `ComplianceOperation`.
- **Registry integration**: `contracts/lib/src/lib.rs` — `check_compliance`, `check_account_compliance`, `set_compliance_registry`.
- **Docs**: `docs/compliance-integration.md`, `docs/compliance-regulatory-framework.md`, `docs/compliance-completion-checklist.md`.
