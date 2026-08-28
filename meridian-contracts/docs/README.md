# Docs

This directory is used for architecture, integration, deployment, testing, compliance, and tutorial documentation that supports the contract workspace.

## Architecture

The documentation is organized by contributor task. Architecture and API files explain the system shape, integration files explain cross-contract flows, and tutorials give step-by-step examples for common use cases.

The main architecture overview can be found in [architecture.md](architecture.md).

The contract API documentation can be found in [contracts.md](contracts.md).

## Logic Tracking

To find contract API expectations visit [contracts.md](contracts.md).

To find deployment guidance visit [deployment.md](deployment.md).

To find integration flow guidance visit [integration.md](integration.md).

To find security pipeline guidance visit [security_pipeline.md](security_pipeline.md).

To find testing guidance visit [testing-guide.md](testing-guide.md).

To find compliance integration details visit [compliance-integration.md](compliance-integration.md) and [property-compliance-integration.md](property-compliance-integration.md).

To find tutorial-level walkthroughs visit [tutorials/basic-property-registration.md](tutorials/basic-property-registration.md), [tutorials/escrow-system.md](tutorials/escrow-system.md), and [tutorials/insurance-integration.md](tutorials/insurance-integration.md).

The architecture decision record template can be found in [adr/0001-record-architecture-decisions.md](adr/0001-record-architecture-decisions.md).

## Tradeoffs

Long-form explanations live in this directory instead of overloading contract source comments. That keeps code comments short while still giving contributors a place for deeper context.

Tutorials stay separate from reference docs because they serve different review needs: tutorials help onboarding, while reference docs help maintainers verify contract behavior.
