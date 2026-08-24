# Contract API Documentation

## Overview

PropChain smart contracts provide a comprehensive API for real estate tokenization and management on the blockchain. This document outlines the complete contract interface, methods, and data structures for all core system components.

## Core Contracts

### PropertyToken (ERC-721/1155)

The primary token contract for property representation, compatible with ERC-721 and ERC-1155 standards, with added real estate specific features and cross-chain support.

#### Methods

##### `register_property_with_token(metadata: PropertyMetadata) -> Result<TokenId, Error>`
Registers a property and mints its corresponding ownership token.

##### `balance_of(owner: AccountId) -> u32`
Standard ERC-721 balance check.

##### `owner_of(token_id: TokenId) -> Option<AccountId>`
Standard ERC-721 owner query.

##### `transfer_from(from: AccountId, to: AccountId, token_id: TokenId) -> Result<(), Error>`
Standard ERC-721 transfer with property-specific authorization checks.

##### `safe_batch_transfer_from(from: AccountId, to: AccountId, ids: Vec<TokenId>, amounts: Vec<u128>, data: Vec<u8>) -> Result<(), Error>`
Standard ERC-1155 batch transfer support.

##### `attach_legal_document(token_id: TokenId, document_hash: Hash, document_type: String) -> Result<(), Error>`
Attaches a legal document reference (IPFS hash) to a property token.

##### `verify_compliance(token_id: TokenId, verification_status: bool) -> Result<(), Error>`
Updates the compliance verification status for a token.

##### `get_ownership_history(token_id: TokenId) -> Option<Vec<OwnershipTransfer>>`
Retrieves the complete on-chain ownership history for a property.

---

### ComplianceRegistry

Manages user identity verification (KYC), AML checks, and jurisdiction-specific compliance requirements.

#### Methods

##### `submit_verification(account: AccountId, jurisdiction: Jurisdiction, kyc_hash: [u8; 32], risk_level: RiskLevel, document_type: DocumentType, biometric_method: BiometricMethod, risk_score: u8) -> Result<()>`
Submits a user for KYC/AML verification.

##### `is_compliant(account: AccountId) -> bool`
Checks if an account currently meets all compliance requirements (including GDPR consent).

##### `require_compliance(account: AccountId) -> Result<()>`
Enforces compliance for contract calls.

##### `update_aml_status(account: AccountId, passed: bool, risk_factors: AMLRiskFactors) -> Result<()>`
Updates the Anti-Money Laundering status for a user.

##### `update_sanctions_status(account: AccountId, passed: bool, list_checked: SanctionsList) -> Result<()>`
Updates the sanctions screening status.

##### `update_consent(account: AccountId, consent: ConsentStatus) -> Result<()>`
Manages GDPR data processing consent.

---

### PropertyBridge

Enables secure cross-chain property token transfers using a multi-signature bridge architecture.

#### Methods

##### `initiate_bridge_multisig(token_id: TokenId, destination_chain: ChainId, recipient: AccountId, required_signatures: u8, timeout_blocks: Option<u64>, metadata: PropertyMetadata) -> Result<u64, Error>`
Initiates a cross-chain transfer request.

##### `sign_bridge_request(request_id: u64, approve: bool) -> Result<(), Error>`
Allows bridge operators to sign/approve a pending request.

##### `execute_bridge(request_id: u64) -> Result<(), Error>`
Executes the bridge operation once the required signature threshold is met.

##### `estimate_bridge_gas(token_id: TokenId, destination_chain: ChainId) -> Result<u64, Error>`
Estimates the gas costs for a cross-chain transfer.

---

### PropertyInsurance

A decentralized insurance platform for properties, managing risk pools, premiums, and automated claims.

#### Methods

##### `create_risk_pool(name: String, coverage_type: CoverageType, max_coverage_ratio: u32, reinsurance_threshold: u128) -> Result<u64, InsuranceError>`
Creates a new insurance risk pool.

##### `provide_pool_liquidity(pool_id: u64)`
Allows users to provide capital to risk pools and earn rewards.

##### `calculate_premium(property_id: u64, coverage_amount: u128, coverage_type: CoverageType) -> Result<PremiumCalculation, InsuranceError>`
Calculates the insurance premium based on property risk assessment.

##### `create_policy(property_id: u64, coverage_type: CoverageType, coverage_amount: u128, pool_id: u64, duration_seconds: u64, metadata_url: String) -> Result<u64, InsuranceError>`
Issues a new insurance policy for a property.

---

### IpfsMetadataRegistry

Manages property-related documents and metadata stored on IPFS with integrated access control.

#### Methods

##### `validate_and_register_metadata(property_id: u64, metadata: PropertyMetadata) -> Result<(), Error>`
Validates and registers core property metadata.

##### `register_ipfs_document(property_id: u64, ipfs_cid: IpfsCid, document_type: DocumentType, content_hash: Hash, file_size: u64, mime_type: String, is_encrypted: bool) -> Result<u64, Error>`
Registers a document stored on IPFS.

##### `grant_access(property_id: u64, account: AccountId, access_level: AccessLevel) -> Result<(), Error>`
Manages document access permissions.

---

### ZkCompliance

Advanced privacy-preserving compliance using Zero-Knowledge proofs.

#### Methods

##### `submit_zk_proof(proof_type: ZkProofType, public_inputs: Vec<[u8; 32]>, proof_data: Vec<u8>, metadata: Vec<u8>) -> Result<u64>`
Submits a ZK proof for verification.

##### `verify_zk_proof(account: AccountId, proof_id: u64, approve: bool) -> Result<()>`
Verifies a submitted ZK proof.

##### `anonymous_compliance_check(account: AccountId, required_proof_types: Vec<ZkProofType>) -> bool`
Performs a compliance check without revealing any sensitive user data.

---

### Legacy Core Contracts (for Reference)

#### PropertyRegistry
*Note: PropertyToken replaces many of these functions in newer implementations.*

##### `new()`
Creates a new PropertyRegistry instance.

##### `register_property(metadata: PropertyMetadata) -> Result<PropertyId, Error>`
Registers a new property.

#### EscrowContract
*Note: AdvancedEscrow features are now integrated into core flows.*

##### `create_escrow(property_id: PropertyId, buyer: AccountId, amount: Balance) -> Result<EscrowId, Error>`
Creates a new escrow for property transfer.

---

### PropertyValuationOracle

Provides real-time property valuations using multiple oracle sources with aggregation and confidence scoring.

#### Methods

##### `get_property_valuation(property_id: PropertyId) -> Result<PropertyValuation, OracleError>`
Gets the current property valuation.

##### `get_valuation_with_confidence(property_id: PropertyId) -> Result<ValuationWithConfidence, OracleError>`
Gets property valuation with confidence metrics including volatility and confidence intervals.

##### `update_valuation_from_sources(property_id: PropertyId) -> Result<(), OracleError>`
Updates property valuation by aggregating prices from all active oracle sources.

## Data Structures

### PropertyMetadata
```rust
pub struct PropertyMetadata {
    pub location: String,
    pub size: u64,
    pub legal_description: String,
    pub valuation: Balance,
    pub documents_url: String,
}
```

### OwnershipTransfer
```rust
pub struct OwnershipTransfer {
    pub from: AccountId,
    pub to: AccountId,
    pub timestamp: u64,
    pub transaction_hash: Hash,
}
```

### ComplianceData
```rust
pub struct ComplianceData {
    pub status: VerificationStatus,
    pub jurisdiction: Jurisdiction,
    pub risk_level: RiskLevel,
    pub verification_timestamp: Timestamp,
    pub expiry_timestamp: Timestamp,
    pub kyc_hash: [u8; 32],
    pub aml_checked: bool,
    pub sanctions_checked: bool,
    pub document_type: DocumentType,
    pub biometric_method: BiometricMethod,
    pub risk_score: u8,
}
```

### InsurancePolicy
```rust
pub struct InsurancePolicy {
    pub policy_id: u64,
    pub property_id: u64,
    pub policyholder: AccountId,
    pub coverage_type: CoverageType,
    pub coverage_amount: u128,
    pub premium_amount: u128,
    pub deductible: u128,
    pub start_time: u64,
    pub end_time: u64,
    pub status: PolicyStatus,
}
```

### IpfsDocument
```rust
pub struct IpfsDocument {
    pub document_id: u64,
    pub property_id: u64,
    pub ipfs_cid: String,
    pub document_type: DocumentType,
    pub content_hash: Hash,
    pub file_size: u64,
    pub uploader: AccountId,
    pub uploaded_at: u64,
}
```

### ZkProofData
```rust
pub struct ZkProofData {
    pub proof_type: ZkProofType,
    pub status: ZkProofStatus,
    pub public_inputs: Vec<[u8; 32]>,
    pub proof_data: Vec<u8>,
    pub created_at: Timestamp,
    pub expires_at: Timestamp,
}
```

### Property Valuation Structures

#### PropertyValuation
```rust
pub struct PropertyValuation {
    pub property_id: u64,
    pub valuation: u128,              // Current valuation in USD with 8 decimals
    pub confidence_score: u32,        // Confidence score 0-100
    pub sources_used: u32,           // Number of price sources used
    pub last_updated: u64,           // Last update timestamp
    pub valuation_method: ValuationMethod,
}
```

## Error Types

### Standard Token Errors
```rust
pub enum Error {
    TokenNotFound,
    Unauthorized,
    PropertyNotFound,
    InvalidMetadata,
    ComplianceFailed,
    BridgePaused,
    InsufficientSignatures,
}
```

### Compliance Errors
```rust
pub enum ComplianceError {
    NotAuthorized,
    NotVerified,
    VerificationExpired,
    HighRisk,
    JurisdictionNotSupported,
    ConsentNotGiven,
}
```

### Insurance Errors
```rust
pub enum InsuranceError {
    PolicyNotFound,
    ClaimNotFound,
    InsufficientPremium,
    InsufficientPoolFunds,
    OracleVerificationFailed,
    PropertyNotInsurable,
}
```

## Usage Examples

### Registering a Property Token
```rust
let metadata = PropertyMetadata {
    location: "123 Main St, City, State".to_string(),
    size: 2000,
    legal_description: "Lot 1, Block 2".to_string(),
    valuation: 500000,
    documents_url: "ipfs://Qm...".to_string(),
};

let token_id = property_token.register_property_with_token(metadata)?;
```

### Initiating a Cross-Chain Transfer
```rust
let request_id = bridge.initiate_bridge_multisig(
    token_id,
    destination_chain_id,
    recipient_account,
    2, // required signatures
    Some(100), // timeout blocks
    metadata
)?;
```

### Creating an Insurance Policy
```rust
let policy_id = insurance.create_policy(
    property_id,
    CoverageType::Comprehensive,
    500000, // coverage amount
    pool_id,
    31536000, // 1 year in seconds
    "https://metadata.url".to_string()
)?;
```

### Verifying Compliance with ZK Proofs
```rust
let is_compliant = zk_compliance.anonymous_compliance_check(
    user_account,
    vec![ZkProofType::IdentityVerification, ZkProofType::FinancialStanding]
);
```

---

## Gas Optimization Tips

1. Use efficient data structures (e.g., `Mapping` over `Vec`)
2. Batch operations when possible (use `safe_batch_transfer_from`)
3. Minimize storage writes
4. Use appropriate visibility modifiers

## Security Considerations

1. Always validate input parameters
2. Implement proper access control using `require_compliance`
3. Use multi-signature verification for high-value operations (Bridge, Escrow)
4. Monitor contract events for anomalies
