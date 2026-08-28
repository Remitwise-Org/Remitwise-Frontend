# Contracts

This directory contains the production smart contract crates. Each subdirectory owns one contract domain or shared contract interface, while [lib](lib/src/lib.rs) keeps reusable support code.

## Architecture

The workspace mixes ink! contracts and Soroban-oriented helpers. Most contract crates expose their main behavior from a `src/lib.rs` file, while a few legacy or compatibility crates keep `lib.rs` at the crate root.

The contract workspace members can be found in [../Cargo.toml](../Cargo.toml).

The shared traits used by multiple contracts can be found in [traits/src/lib.rs](traits/src/lib.rs).

## Logic Tracking

To find AI valuation model registration, prediction, drift, and A/B test logic visit [ai-valuation/src/lib.rs](ai-valuation/src/lib.rs).

To find market analytics and report generation logic visit [analytics/src/lib.rs](analytics/src/lib.rs).

To find cross-chain bridge request, signature, proof, and migration logic visit [bridge/src/lib.rs](bridge/src/lib.rs).

To find KYC, AML, sanctions, GDPR consent, and compliance reporting logic visit [compliance_registry/lib.rs](compliance_registry/lib.rs).

To find Soroban escrow lifecycle logic visit [escrow/src/lib.rs](escrow/src/lib.rs).

To find dynamic fee, premium auction, validator reward, and fee reporting logic visit [fees/src/lib.rs](fees/src/lib.rs).

To find fractional ownership share accounting and dividend logic visit [fractional/src/lib.rs](fractional/src/lib.rs).

To find insurance policy, pool, claim, RBAC, payout, and reinsurance logic visit [insurance/src/lib.rs](insurance/src/lib.rs) and [insurance/src/insurance_impl.rs](insurance/src/insurance_impl.rs).

To find IPFS metadata and document access logic visit [ipfs-metadata/src/lib.rs](ipfs-metadata/src/lib.rs).

To find shared randomness and error-handling helpers visit [lib/src/random.rs](lib/src/random.rs) and [lib/src/error_handling.rs](lib/src/error_handling.rs).

To find valuation oracle source aggregation, confidence scoring, alerts, and migration logic visit [oracle/src/lib.rs](oracle/src/lib.rs).

To find property token ownership, fractional share, dividend, governance, and bridge-facing logic visit [property-token/src/lib.rs](property-token/src/lib.rs).

To find upgradeable proxy logic visit [proxy/src/lib.rs](proxy/src/lib.rs).

To find zero-knowledge compliance proof, privacy preference, audit, and dashboard logic visit [zk-compliance/lib.rs](zk-compliance/lib.rs).

The core contract connection interfaces can be found in [traits/src/lib.rs](traits/src/lib.rs).

## Storage Migration Policy

### Overview

All Soroban contracts in this workspace implement a standardized storage migration pattern to enable backward-compatible schema evolution. This ensures that existing on-chain deployments can be upgraded without data loss or breaking changes.

### Implementation Pattern

Each contract defines:

1. **StorageVersion enum**: An enum with variants representing each storage schema version (V1, V2, etc.)
2. **Version DataKey**: A storage key tracking the current schema version
3. **migrate() function**: An admin-only entry point that performs incremental migrations

### Migration Rules

- **Additive only**: Migrations may only add new fields or modify logic, never remove or rename existing storage keys
- **Idempotent**: Calling `migrate(env, to_version)` multiple times with the same target version is safe and no-op
- **Forward only**: Downgrades are rejected to prevent data corruption
- **Admin only**: Migration requires admin authorization (or appropriate role-based access)
- **Default values**: New fields are initialized with safe defaults (typically 0 or empty collections)

### Contract-Specific Implementations

#### Escrow Contract ([escrow/src/lib.rs](escrow/src/lib.rs))

- **Current version**: V2
- **V1 → V2 migration**: Adds `FeeBps` field (default: 0)
- **Storage keys**: See [escrow/src/storage.rs](escrow/src/storage.rs)
- **Migration tests**: [escrow/src/migration_test.rs](escrow/src/migration_test.rs)

#### Risk Pool Contract ([risk_pool/src/lib.rs](risk_pool/src/lib.rs))

- **Current version**: V2
- **V1 → V2 migration**: Adds `LockedCapital` field (default: 0)
- **Storage keys**: See [risk_pool/src/lib.rs](risk_pool/src/lib.rs)
- **Migration tests**: [risk_pool/src/migration_test.rs](risk_pool/src/migration_test.rs)

### Migration Process

When adding new fields to a contract:

1. Increment the current version in `StorageVersion::current()`
2. Add new `DataKey` variants for the new fields
3. Add a migration step in the `migrate()` function's match statement
4. Initialize new fields with safe defaults
5. Add tests verifying:
   - Old data is preserved
   - New fields default correctly
   - Migration is idempotent
   - Non-admins cannot migrate

### Historical Notes

- **escrow/src/lib.rs.new**: Removed - was an outdated draft that duplicated the main contract file without the modular structure (storage.rs, types.rs, validation.rs) now in use

## Tradeoffs

This README focuses on major contract entry points rather than documenting every test and helper file. That keeps the map useful for reviewers while the source-level comments explain function behavior closer to the code.

Each contract crate remains independent because the repository needs maintainers to review changes by domain. The tradeoff is some repeated patterns across crates, especially authorization and migration hooks.
