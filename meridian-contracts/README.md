# Stellar Insured Contracts Workspace

This workspace contains the Rust and ink! smart contracts, shared utilities, integration tests, security tooling, SDK adapters, and deployment scripts that support the property tokenization and insurance system.

## Architecture

The workspace is organized around contract crates in [contracts](contracts/README.md), shared support code in [common](common), cross-contract documentation in [docs](docs/README.md), SDK entry points in [sdk](sdk/README.md), and broader validation in [tests](tests/README.md) and [security-tests](security-tests/README.md).

The Rust workspace can be found in [Cargo.toml](Cargo.toml). It lists each contract crate and keeps shared dependency versions together.

The security policy can be found in [SECURITY.md](SECURITY.md). It defines the reporting path and security expectations for contributors.

## Logic Tracking

To find contract implementation logic visit [contracts/README.md](contracts/README.md).

To find shared multisig and integrity helpers visit [common/multisig.rs](common/multisig.rs) and [common/integrity.rs](common/integrity.rs).

To find architectural docs and integration guides visit [docs/README.md](docs/README.md).

To find mobile and backend SDK logic visit [sdk/README.md](sdk/README.md).

To find workspace-level integration tests visit [tests/README.md](tests/README.md).

The contract workspace configuration can be found in [Cargo.toml](Cargo.toml).

## Tradeoffs

The workspace is split by purpose instead of flattening all contract and support files together. That makes individual contract crates easier to review, but it means contributors should start from the workspace manifest or the contracts README before jumping into a specific file.

Build, audit, and test tooling live in this workspace because the contracts are sensitive to toolchain and dependency versions. The tradeoff is a larger folder, so this README acts as the first navigation layer.
