# Developer Onboarding Checklist

Welcome to the PropChain development team! Use this checklist to set up your environment and get familiar with our smart contract ecosystem.

## Environment Setup

- [ ] **Install Rust**: Follow the instructions in [DEVELOPMENT.md](../DEVELOPMENT.md) to install the Rust toolchain.
- [ ] **Install Substrate Tools**: Ensure you have `cargo-contract` and other necessary Substrate development tools.
- [ ] **Clone the Repository**: `git clone https://github.com/maryjane/PropChain-contract.git`
- [ ] **Verify Build**: Run `cargo build` in the root directory to ensure all contracts compile correctly.
- [ ] **Run Tests**: Run `cargo test` to verify the current state of the codebase.

## Learning the Architecture

- [ ] **Read the Overview**: Start with the [README.md](../README.md) for a high-level project summary.
- [ ] **Explore the Contracts**: Read [docs/contracts.md](contracts.md) to understand the core APIs.
- [ ] **Review Tutorials**:
  - [ ] [Insurance Integration](tutorials/insurance-integration.md)
  - [ ] [Cross-Chain Bridging](tutorials/cross-chain-bridging.md)
- [ ] **Understand Compliance**: Study the `ComplianceRegistry` and `ZkCompliance` contracts to understand how we handle regulatory requirements.

## Hands-On Exploration

- [ ] **Deploy to Local Node**: Follow the deployment guide in [DEVELOPMENT.md](../DEVELOPMENT.md) to deploy the `PropertyToken` contract to a local dev node.
- [ ] **Interact with Contracts**: Use the `polkadot-js/api` or `subxt` to call a simple method like `register_property`.
- [ ] **Debug a Transaction**: Use the local node logs to trace a contract call.

## Contributing

- [ ] **Read Contribution Guidelines**: Review the guidelines in [README.md](../README.md#contributing).
- [ ] **Setup Pre-commit Hooks**: Follow the instructions in [DEVELOPMENT.md](../DEVELOPMENT.md#pre-commit-hooks).
- [ ] **Create a Feature Branch**: Always work on a separate branch for your changes.
- [ ] **Follow ADRs**: Check existing [Architecture Decision Records](adr/) before making major design choices.

## Getting Help

- [ ] **Review FAQ**: Check the [Troubleshooting/FAQ](troubleshooting-faq.md) for common issues.
- [ ] **Join the Dev Channel**: Reach out to the team on our designated discord/slack channel for support.
