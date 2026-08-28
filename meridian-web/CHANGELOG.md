# Changelog

All notable changes to the Stellar Insured Soroban Contracts project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-24

### Added

- Contract upgrade mechanism with tight coupling decoupling between contracts (#270, #271)
- Rate limiting for claims, governance, and policy contract operations (#290, #291, #292, #293)
- Time-lock mechanism for sensitive contract operations (#294, #295)
- Event indexing for efficient on-chain event queries (#296, #310)
- Reorg confirmation depth for cross-chain transaction security (#306)
- Data migration framework for contract upgrades (#308)
- Comprehensive property-based and fuzz testing for contract security
- NestJS StorageModule with IPFS integration (`sdk/backend/`) — provides off-chain REST API for pinning, unpinning, content retrieval, hash verification, and image optimization, integrated with the on-chain ipfs-metadata contract

### Fixed

- Unbounded storage vectors — capped storage growth across contracts (#266)
- Emergency pause — added pause/unpause to contracts missing it (#267)
- Secure randomness — replaced unsafe PRNG patterns with Soroban SDK PRNG (#268)
- Realign contracts to Soroban SDK v20.0.0 APIs (#269)
- Oracle slash transfer — corrected fund redirection logic (#264)
- Monitoring events — fixed event emission for oracle monitoring (#265)
- Bridge Merkle proof — corrected proof verification for cross-chain transfers (#307, #309)
- Escrow reentrancy guard — added CEI ordering for fund transfers
- Bridge transaction hashes — switched to SHA-256 for transaction integrity (#263)
- Evidence proof format for claims — structured on-chain evidence (#133)
- Adjustable dispute window for claim decisions (#134)
- Dependency updates for Soroban SDK and workspace crates

### Security

- Incomplete authorization in bridge contract — enforced full auth checks on all entry points
- Critical storage safety — bounded all unbounded vectors and maps to prevent storage explosion

## [0.3.0] - 2026-03-30

### Added

- Structured evidence metadata required on `submit_claim` in insurance contract
- Insurance coverage ratio payout blocking tests
- Fixed-point reward-shares calculation for insurance liquidity providers
- Structured event enums and schema for policy contract (#132)
- Audit checklist and security regression coverage
- Oracle interface and parametric claim logic
- Gas and fee optimization migration tests and benchmarks
- Slash appeal system with due-process and governance alignment (#193)
- Enterprise-grade history APIs with pagination support
- Explicit role-scope ACL and time-lock for slashing (#139)
- Proptest fuzz tests for contract security (#142)
- Cross-contract claim validation (#141)
- Dynamic pricing engine and emergency pause controls (#215, #216)
- Evidence management with IPFS hash support, verification, and privacy controls in claims
- Time-based vesting schedules, claims, early-penalty, and stats in risk pool
- Automated policy expiration with pagination and batch processing
- Endorsement workflow for policy modifications
- Automated claim payout distribution (#229)
- Parametric insurance trigger contract (#237)
- Regulatory reporting module (#238)
- Cat bond trigger mechanism with core integrations (#199, #200, #201)
- Core logic for reinsurance, cat bonds, and parametric triggers (#198, #199, #200, #201)
- TypeScript SDK for Stellar Insured Soroban contracts

### Fixed

- Build errors in claims contract — `symbol_short` length and Vec API compatibility
- Security: enforced HTTPS, secure cookies, and IP-bound refresh tokens

### Security

- Comprehensive security and error management system (#151, #152, #153)
- SECURITY_FIXES.md documentation added

## [0.2.0] - 2026-02-27

### Added

- Multi-signature support for governance and high-value operations
- Cross-chain interoperability via bridge contract
- Comprehensive input validation and sanitization (#29)
- Automated policy renewal system (#52)
- Emergency pause feature with timelock and staged resumption
- Multi-asset support for insurance contracts
- Governance staking and rewards system
- ZKP privacy enhancement for insurance transactions
- Decentralized oracle network with price feeds, reputation system, and weighted median aggregation (#47)
- Standardized error handling and recovery contract
- Comprehensive audit trail and compliance reporting contract
- State snapshotting and emergency failover mechanisms (#46)
- Advanced risk assessment with ML integration and portfolio optimization
- Bridge security enhancements and automated claims
- Tokenized insurance products with AMM and parametric triggers
- Upgradeable contract architecture with versioning system (#103)
- Oracle validation and governance voting (#104, #105)
- Gas optimization across contracts (#106)
- Time-based policy expiry enforcement (#23)
- Liquidity pool foundation for risk pool (#9)
- Compliance reporting system with filing, audit, certification, and analytics
- Emergency pause system with timelock, staged resumption, recovery, and governance voting
- Dynamic fee optimization, advanced reward distribution, incentive engine, and yield integration
- Vesting, governance timelock queue, analytics queries, and policy lifecycle events (#185, #191, #192, #210)
- Decentralized identity integration
- Performance monitoring and telemetry system

### Fixed

- Oracle-network workspace member inclusion
- Build and test errors across contracts
- Property-token formatting issue

## [0.1.0] - 2026-01-29

### Added

- **Policy Contract**: Insurance policy issuance, renewal, cancellation, and expiration lifecycle
- **Claims Contract**: Multi-stage claim approval workflow (Submitted → UnderReview → Approved/Rejected → Settled)
- **Risk Pool Contract**: Liquidity pool with deposit, withdrawal, reservation, and release
- **Slashing Contract**: Professional on-chain slashing mechanism with configurable penalties, repeat offender system, and cooldown periods
- **Governance Contract**: DAO proposal and voting system with quorum and threshold requirements
- **Treasury Contract**: Protocol fee management
- Shared utility library for insurance contracts (Randomness, etc.)
- Reentrancy guards and state-transition validation
- Read-only views and indexing for core contracts
- Event structure for fee deposits, withdrawal proposals, and execution
- Comprehensive test suites for all core contracts
- On-chain invariant checks and safety assertions
- Cryptographic evidence integrity for claims
- Dispute resolution window for claims decisions
- Secure claim submission logic (#7)
- Policy contract initialization and storage schema
- Unified cross-contract authorization framework

### Fixed

- Claims contract alignment with new reservation APIs
- Policy issuance validation and security enforcement

### Security

- Admin-only authorization for all sensitive claim operations
- Settlement prevention for non-approved claims
- Explicit authorization checks across all entry points

[1.0.0]: https://github.com/MettaChain/PropChain-contract/compare/v0.3.0...v1.0.0
[0.3.0]: https://github.com/MettaChain/PropChain-contract/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/MettaChain/PropChain-contract/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/MettaChain/PropChain-contract/releases/tag/v0.1.0
