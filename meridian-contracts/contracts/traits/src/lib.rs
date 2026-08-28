#![cfg_attr(not(feature = "std"), no_std)]

//! Shared trait and error definitions used across PropChain contracts.


use ink::prelude::string::String;
use ink::primitives::{AccountId, Hash};

/// Error types for the Property Valuation Oracle
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum OracleError {
    PropertyNotFound,
    InsufficientSources,
    InvalidValuation,
    Unauthorized,
    OracleSourceNotFound,
    InvalidParameters,
    PriceFeedError,
    AlertNotFound,
    InsufficientReputation,
    SourceAlreadyExists,
    RequestPending,
    NotEnoughConfirmations,
    MigrationRequired,
    ContractPaused,
}

/// Trait definitions for PropChain contracts
pub trait PropertyRegistry {
    /// Error type for the contract
    type Error;

    /// Register a new property
    fn register_property(&mut self, metadata: PropertyMetadata) -> Result<u64, Self::Error>;

    /// Transfer property ownership
    fn transfer_property(&mut self, property_id: u64, to: AccountId) -> Result<(), Self::Error>;

    /// Get property information
    fn get_property(&self, property_id: u64) -> Option<PropertyInfo>;

    /// Update property metadata
    fn update_metadata(
        &mut self,
        property_id: u64,
        metadata: PropertyMetadata,
    ) -> Result<(), Self::Error>;

    /// Approve an account to transfer a specific property
    fn approve(&mut self, property_id: u64, to: Option<AccountId>) -> Result<(), Self::Error>;

    /// Get the approved account for a property
    fn get_approved(&self, property_id: u64) -> Option<AccountId>;
}

/// Property metadata structure
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct PropertyMetadata {
    pub location: String,
    pub size: u64,
    pub legal_description: String,
    pub valuation: u128,
    pub documents_url: String,
}

/// Property information structure
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct PropertyInfo {
    pub id: u64,
    pub owner: AccountId,
    pub metadata: PropertyMetadata,
    pub registered_at: u64,
}

/// Property type enumeration
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum PropertyType {
    Residential,
    Commercial,
    Industrial,
    Land,
    MultiFamily,
    Retail,
    Office,
}

/// Price data from external feeds
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct PriceData {
    pub price: u128,    // Price in USD with 8 decimals
    pub timestamp: u64, // Timestamp when price was recorded
    pub source: String, // Price feed source identifier
}

/// Property valuation structure
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct PropertyValuation {
    pub property_id: u64,
    pub valuation: u128,       // Current valuation in USD with 8 decimals
    pub confidence_score: u32, // Confidence score 0-100
    pub sources_used: u32,     // Number of price sources used
    pub last_updated: u64,     // Last update timestamp
    pub valuation_method: ValuationMethod,
    pub confirmed_at_block: Option<u64>, // Block number when valuation was confirmed
}

/// Valuation method enumeration
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum ValuationMethod {
    Automated,   // AVM (Automated Valuation Model)
    Manual,      // Manual appraisal
    MarketData,  // Based on market comparables
    Hybrid,      // Combination of methods
    AIValuation, // AI-powered machine learning valuation
}

/// Valuation with confidence metrics
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct ValuationWithConfidence {
    pub valuation: PropertyValuation,
    pub volatility_index: u32,             // Market volatility 0-100
    pub confidence_interval: (u128, u128), // Min and max valuation range
    pub outlier_sources: u32,              // Number of outlier sources detected
}

/// Volatility metrics for market analysis
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct VolatilityMetrics {
    pub property_type: PropertyType,
    pub location: String,
    pub volatility_index: u32,     // 0-100 scale
    pub average_price_change: i32, // Average % change over period (can be negative)
    pub period_days: u32,          // Analysis period in days
    pub last_updated: u64,
}

/// Comparable property for AVM analysis
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct ComparableProperty {
    pub property_id: u64,
    pub distance_km: u32,       // Distance from subject property
    pub price_per_sqm: u128,    // Price per square meter
    pub size_sqm: u64,          // Property size in square meters
    pub sale_date: u64,         // When it was sold
    pub adjustment_factor: i32, // Adjustment factor (+/- percentage)
}

/// Price alert configuration
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct PriceAlert {
    pub property_id: u64,
    pub threshold_percentage: u32, // Alert threshold (e.g., 5 for 5%)
    pub alert_address: AccountId,  // Address to notify
    pub last_triggered: u64,       // Last time alert was triggered
    pub is_active: bool,
}

/// Oracle source configuration
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct OracleSource {
    pub id: String, // Unique source identifier
    pub source_type: OracleSourceType,
    pub address: AccountId, // Contract address for the price feed
    pub is_active: bool,
    pub weight: u32, // Weight in aggregation (0-100)
    pub last_updated: u64,
}

/// Oracle source type enumeration
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum OracleSourceType {
    Chainlink,
    Pyth,
    Substrate,
    Custom,
    Manual,
    AIModel, // AI-powered valuation model
}

/// Location-based adjustment factors
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct LocationAdjustment {
    pub location_code: String,      // Geographic location identifier
    pub adjustment_percentage: i32, // Adjustment factor (+/- percentage)
    pub last_updated: u64,
    pub confidence_score: u32,
}

/// Market trend data
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct MarketTrend {
    pub property_type: PropertyType,
    pub location: String,
    pub trend_percentage: i32, // Trend direction and magnitude
    pub period_months: u32,    // Analysis period in months
    pub last_updated: u64,
}

/// Oracle trait for real-time property valuation
#[ink::trait_definition]
pub trait Oracle {
    /// Get current property valuation
    #[ink(message)]
    fn get_valuation(&self, property_id: u64) -> Result<PropertyValuation, OracleError>;

    /// Get valuation with detailed confidence metrics
    #[ink(message)]
    fn get_valuation_with_confidence(
        &self,
        property_id: u64,
    ) -> Result<ValuationWithConfidence, OracleError>;

    /// Request a new valuation for a property (async pattern)
    #[ink(message)]
    fn request_valuation(&mut self, property_id: u64) -> Result<u64, OracleError>;

    /// Batch request valuations for multiple properties
    #[ink(message)]
    fn batch_request_valuations(&mut self, property_ids: Vec<u64>)
        -> Result<Vec<u64>, OracleError>;

    /// Get historical valuations for a property
    #[ink(message)]
    fn get_historical_valuations(&self, property_id: u64, limit: u32) -> Vec<PropertyValuation>;

    /// Get market volatility for a specific location and property type
    #[ink(message)]
    fn get_market_volatility(
        &self,
        property_type: PropertyType,
        location: String,
    ) -> Result<VolatilityMetrics, OracleError>;
}

/// Oracle Registry trait for managing multiple price feeds and reputation
#[ink::trait_definition]
pub trait OracleRegistry {
    /// Register a new oracle source
    #[ink(message)]
    fn add_source(&mut self, source: OracleSource) -> Result<(), OracleError>;

    /// Remove an oracle source
    #[ink(message)]
    fn remove_source(&mut self, source_id: String) -> Result<(), OracleError>;

    /// Update oracle source reputation based on performance
    #[ink(message)]
    fn update_reputation(&mut self, source_id: String, success: bool) -> Result<(), OracleError>;

    /// Get oracle source reputation score
    #[ink(message)]
    fn get_reputation(&self, source_id: String) -> Option<u32>;

    /// Slash oracle source for providing invalid data
    #[ink(message)]
    fn slash_source(&mut self, source_id: String, penalty_amount: u128) -> Result<(), OracleError>;

    /// Check for anomalies in price data
    #[ink(message)]
    fn detect_anomalies(&self, property_id: u64, new_valuation: u128) -> bool;
}

/// Escrow trait for secure property transfers
pub trait Escrow {
    /// Error type for escrow operations
    type Error;

    /// Create a new escrow
    fn create_escrow(&mut self, property_id: u64, amount: u128) -> Result<u64, Self::Error>;

    /// Release escrow funds
    fn release_escrow(&mut self, escrow_id: u64) -> Result<(), Self::Error>;

    /// Refund escrow funds
    fn refund_escrow(&mut self, escrow_id: u64) -> Result<(), Self::Error>;
}

#[cfg(not(feature = "std"))]
use scale_info::prelude::vec::Vec;

/// Advanced escrow trait with multi-signature and document custody
pub trait AdvancedEscrow {
    /// Error type for escrow operations
    type Error;

    /// Create an advanced escrow with multi-signature support
    #[allow(clippy::too_many_arguments)]
    fn create_escrow_advanced(
        &mut self,
        property_id: u64,
        amount: u128,
        buyer: AccountId,
        seller: AccountId,
        participants: Vec<AccountId>,
        required_signatures: u8,
        release_time_lock: Option<u64>,
    ) -> Result<u64, Self::Error>;

    /// Deposit funds to escrow
    fn deposit_funds(&mut self, escrow_id: u64) -> Result<(), Self::Error>;

    /// Release funds with multi-signature approval
    fn release_funds(&mut self, escrow_id: u64) -> Result<(), Self::Error>;

    /// Refund funds with multi-signature approval
    fn refund_funds(&mut self, escrow_id: u64) -> Result<(), Self::Error>;

    /// Upload document hash to escrow
    fn upload_document(
        &mut self,
        escrow_id: u64,
        document_hash: ink::primitives::Hash,
        document_type: String,
    ) -> Result<(), Self::Error>;

    /// Verify a document
    fn verify_document(
        &mut self,
        escrow_id: u64,
        document_hash: ink::primitives::Hash,
    ) -> Result<(), Self::Error>;

    /// Add a condition to the escrow
    fn add_condition(&mut self, escrow_id: u64, description: String) -> Result<u64, Self::Error>;

    /// Mark a condition as met
    fn mark_condition_met(&mut self, escrow_id: u64, condition_id: u64) -> Result<(), Self::Error>;

    /// Sign approval for release or refund
    fn sign_approval(
        &mut self,
        escrow_id: u64,
        approval_type: ApprovalType,
    ) -> Result<(), Self::Error>;

    /// Raise a dispute
    fn raise_dispute(&mut self, escrow_id: u64, reason: String) -> Result<(), Self::Error>;

    /// Resolve a dispute (admin only)
    fn resolve_dispute(&mut self, escrow_id: u64, resolution: String) -> Result<(), Self::Error>;

    /// Emergency override (admin only)
    fn emergency_override(
        &mut self,
        escrow_id: u64,
        release_to_seller: bool,
    ) -> Result<(), Self::Error>;
}

/// Approval type for multi-signature operations
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ApprovalType {
    Release,
    Refund,
    EmergencyOverride,
}

/// Chain ID type for cross-chain operations
pub type ChainId = u64;

/// Token ID type for property tokens
pub type TokenId = u64;

/// Cross-chain bridge trait for property tokens
pub trait PropertyTokenBridge {
    /// Error type for bridge operations
    type Error;

    /// Lock a token for bridging to another chain
    fn lock_token_for_bridge(
        &mut self,
        token_id: TokenId,
        destination_chain: ChainId,
        recipient: ink::primitives::AccountId,
    ) -> Result<(), Self::Error>;

    /// Mint a bridged token from another chain
    fn mint_bridged_token(
        &mut self,
        source_chain: ChainId,
        original_token_id: TokenId,
        recipient: ink::primitives::AccountId,
        metadata: PropertyMetadata,
    ) -> Result<TokenId, Self::Error>;

    /// Burn a bridged token when returning to original chain
    fn burn_bridged_token(
        &mut self,
        token_id: TokenId,
        destination_chain: ChainId,
        recipient: ink::primitives::AccountId,
    ) -> Result<(), Self::Error>;

    /// Unlock a token that was previously locked
    fn unlock_token(
        &mut self,
        token_id: TokenId,
        recipient: ink::primitives::AccountId,
    ) -> Result<(), Self::Error>;

    /// Get bridge status for a token
    fn get_bridge_status(&self, token_id: TokenId) -> Option<BridgeStatus>;

    /// Verify bridge transaction hash
    fn verify_bridge_transaction(
        &self,
        token_id: TokenId,
        transaction_hash: ink::primitives::Hash,
        source_chain: ChainId,
    ) -> bool;

    /// Add a bridge operator
    fn add_bridge_operator(
        &mut self,
        operator: ink::primitives::AccountId,
    ) -> Result<(), Self::Error>;

    /// Remove a bridge operator
    fn remove_bridge_operator(
        &mut self,
        operator: ink::primitives::AccountId,
    ) -> Result<(), Self::Error>;

    /// Check if an account is a bridge operator
    fn is_bridge_operator(&self, account: ink::primitives::AccountId) -> bool;

    /// Get all bridge operators
    fn get_bridge_operators(&self) -> Vec<ink::primitives::AccountId>;
}

/// Advanced bridge trait with multi-signature and monitoring
pub trait AdvancedBridge {
    /// Error type for advanced bridge operations
    type Error;

    /// Initiate bridge with multi-signature requirement
    fn initiate_bridge_multisig(
        &mut self,
        token_id: TokenId,
        destination_chain: ChainId,
        recipient: ink::primitives::AccountId,
        required_signatures: u8,
        timeout_blocks: Option<u64>,
    ) -> Result<u64, Self::Error>; // Returns bridge request ID

    /// Sign a bridge request
    fn sign_bridge_request(
        &mut self,
        bridge_request_id: u64,
        approve: bool,
    ) -> Result<(), Self::Error>;

    /// Execute bridge after collecting required signatures
    fn execute_bridge(&mut self, bridge_request_id: u64) -> Result<(), Self::Error>;

    /// Monitor bridge status and handle errors
    fn monitor_bridge_status(&self, bridge_request_id: u64) -> Option<BridgeMonitoringInfo>;

    /// Recover from failed bridge operation
    fn recover_failed_bridge(
        &mut self,
        bridge_request_id: u64,
        recovery_action: RecoveryAction,
    ) -> Result<(), Self::Error>;

    /// Get gas estimation for bridge operation
    fn estimate_bridge_gas(
        &self,
        token_id: TokenId,
        destination_chain: ChainId,
    ) -> Result<u64, Self::Error>;

    /// Get bridge history for an account
    fn get_bridge_history(&self, account: ink::primitives::AccountId) -> Vec<BridgeTransaction>;
}

/// Bridge status information
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct BridgeStatus {
    pub is_locked: bool,
    pub source_chain: Option<ChainId>,
    pub destination_chain: Option<ChainId>,
    pub locked_at: Option<u64>,
    pub bridge_request_id: Option<u64>,
    pub status: BridgeOperationStatus,
}

/// Bridge operation status
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum BridgeOperationStatus {
    None,
    Pending,
    Locked,
    InTransit,
    Completed,
    Failed,
    Recovering,
    Expired,
}

/// Bridge monitoring information
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct BridgeMonitoringInfo {
    pub bridge_request_id: u64,
    pub token_id: TokenId,
    pub source_chain: ChainId,
    pub destination_chain: ChainId,
    pub status: BridgeOperationStatus,
    pub created_at: u64,
    pub expires_at: Option<u64>,
    pub signatures_collected: u8,
    pub signatures_required: u8,
    pub error_message: Option<String>,
}

/// Recovery action for failed bridges
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum RecoveryAction {
    UnlockToken,
    RefundGas,
    RetryBridge,
    CancelBridge,
}

/// Bridge transaction record
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct BridgeTransaction {
    pub transaction_id: u64,
    pub token_id: TokenId,
    pub source_chain: ChainId,
    pub destination_chain: ChainId,
    pub sender: ink::primitives::AccountId,
    pub recipient: ink::primitives::AccountId,
    pub transaction_hash: ink::primitives::Hash,
    pub timestamp: u64,
    pub gas_used: u64,
    pub status: BridgeOperationStatus,
    pub metadata: PropertyMetadata,
}

/// Multi-signature bridge request
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct MultisigBridgeRequest {
    pub request_id: u64,
    pub token_id: TokenId,
    pub source_chain: ChainId,
    pub destination_chain: ChainId,
    pub sender: ink::primitives::AccountId,
    pub recipient: ink::primitives::AccountId,
    pub required_signatures: u8,
    pub signatures: Vec<ink::primitives::AccountId>,
    pub created_at: u64,
    pub expires_at: Option<u64>,
    pub locked_at_block: Option<u64>, // Block number when request was locked (all signatures collected)
    pub status: BridgeOperationStatus,
    pub metadata: PropertyMetadata,
}

/// Bridge configuration
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct BridgeConfig {
    pub supported_chains: Vec<ChainId>,
    pub min_signatures_required: u8,
    pub max_signatures_required: u8,
    pub default_timeout_blocks: u64,
    pub gas_limit_per_bridge: u64,
    pub metadata_preservation: bool,
}

/// Upgradeability interface for proxy and self-upgrade contracts.
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum UpgradeError {
    Unauthorized,
    UpgradeFailed,
}

#[ink::trait_definition]
pub trait Upgradeable {
    /// Upgrade the contract code hash while preserving storage.
    #[ink(message)]
    fn upgrade_to(&mut self, new_code_hash: Hash) -> Result<(), UpgradeError>;

    /// Change the admin authorized to trigger upgrades.
    #[ink(message)]
    fn change_admin(&mut self, new_admin: AccountId) -> Result<(), UpgradeError>;

    /// Get the current upgrade admin.
    #[ink(message)]
    fn admin(&self) -> AccountId;
}

/// Chain-specific bridge information
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct ChainBridgeInfo {
    pub chain_id: ChainId,
    pub chain_name: String,
    pub bridge_contract_address: Option<ink::primitives::AccountId>,
    pub is_active: bool,
    pub gas_multiplier: u32,      // Gas cost multiplier for this chain
    pub confirmation_blocks: u32, // Blocks to wait for confirmation
    pub supported_tokens: Vec<TokenId>,
}

// =============================================================================
// Dynamic Fee and Market Mechanism (Issue #38)
// =============================================================================

/// Operation types for dynamic fee calculation
#[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum FeeOperation {
    RegisterProperty,
    TransferProperty,
    UpdateMetadata,
    CreateEscrow,
    ReleaseEscrow,
    PremiumListingBid,
    IssueBadge,
    OracleUpdate,
    BridgeTransfer,
    IssuePolicy,
    RenewPolicy,
}

/// Trait for dynamic fee provider (implemented by fee manager contract)
#[ink::trait_definition]
pub trait DynamicFeeProvider {
    /// Get recommended fee for an operation (market-based price discovery)
    #[ink(message)]
    fn get_recommended_fee(&self, operation: FeeOperation) -> u128;

    /// Collect fee for an operation. Should be called with transferred value.
    #[ink(message, payable)]
    fn collect_fee(
        &mut self,
        operation: FeeOperation,
        from: AccountId,
        amount: u128,
    ) -> Result<(), String>;
}

// =============================================================================
// Compliance and Regulatory Framework (Issue #45)
// =============================================================================

/// Transaction type for compliance rules engine
#[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum ComplianceOperation {
    RegisterProperty,
    TransferProperty,
    UpdateMetadata,
    CreateEscrow,
    ReleaseEscrow,
    ListForSale,
    Purchase,
    BridgeTransfer,
}

/// Trait for compliance registry (used by PropertyRegistry for automated checks)
#[ink::trait_definition]
pub trait ComplianceChecker {
    /// Returns true if the account meets current compliance requirements
    #[ink(message)]
    fn is_compliant(&self, account: ink::primitives::AccountId) -> bool;
}

// =============================================================================
// Property Token Ownership Interface (used by bridge for cross-contract auth)
// =============================================================================

/// Trait for querying property token ownership.
/// Implemented by the PropertyToken contract and consumed by the bridge
/// contract to verify that a caller actually owns the token they want to bridge.
#[ink::trait_definition]
pub trait PropertyTokenOwnership {
    /// Returns the owner of `token_id`, or `None` if the token does not exist.
    #[ink(message)]
    fn owner_of(&self, token_id: TokenId) -> Option<ink::primitives::AccountId>;

    /// Returns the account approved to transfer `token_id` on behalf of the
    /// owner, or `None` if no approval has been granted.
    #[ink(message)]
    fn get_approved(&self, token_id: TokenId) -> Option<ink::primitives::AccountId>;
}

// =============================================================================
// Data Migration Framework (Issue #308)
// =============================================================================

// =============================================================================
// Zero-Knowledge Compliance & Oracle Integrity (Issue #629)
// =============================================================================

/// Status lifecycle of a submitted zero-knowledge proof.
#[derive(Debug, PartialEq, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum ZkProofStatus {
    NotSubmitted,
    Pending,
    Verified,
    Rejected,
    Expired,
}

/// Type of zero-knowledge proof.
///
/// The discriminant is used as the storage key for the per-type Groth16
/// verification key records, so the variant order is part of the storage
/// layout and must not be reordered.
#[derive(Debug, PartialEq, Eq, Clone, Copy, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub enum ZkProofType {
    IdentityVerification,
    ComplianceCheck,
    PropertyOwnership,
    FinancialStanding,
    AgeVerification,
    AccreditedInvestor,
    AddressOwnership,
    IncomeVerification,
    Creditworthiness,
}

/// Zero-knowledge proof payload shared between the compliance contract, the
/// oracle, the AI-valuation engine, and the insurance contract.
///
/// The field order is part of the on-chain storage layout and must not be
/// reordered once deployed.
#[derive(Debug, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct ZkProofData {
    pub proof_type: ZkProofType,
    pub status: ZkProofStatus,
    pub public_inputs: Vec<[u8; 32]>, // Public inputs for the ZK proof
    pub proof_data: Vec<u8>,          // Serialized (compressed) Groth16 proof
    pub created_at: u64,
    pub expires_at: u64,
    pub verifier: AccountId,
    pub metadata: Vec<u8>,            // Additional metadata
}

/// Errors returned when verifying a zero-knowledge proof.
///
/// Used both on-chain (by the compliance contract's `verify_zk_proof_data`
/// message) and across contract boundaries (by the oracle), so it must be
/// SCALE-encodable.
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ZkVerifyError {
    /// The proof payload could not be deserialized.
    InvalidProof,
    /// The stored verification key bytes could not be deserialized.
    InvalidVerificationKey,
    /// No active verification key is registered for this proof type.
    VerificationKeyNotFound,
    /// The Groth16 pairing verification failed.
    VerificationFailed,
    /// The public inputs are malformed (empty, non-canonical, or too many).
    InvalidPublicInputs,
    /// The verifier was built without the `zk` feature; no real verification is possible.
    ZkUnavailable,
}

/// A versioned Groth16 verification key stored on-chain.
///
/// `serialized_vk` holds the compressed `ark_groth16::VerifyingKey<Bn254>`
/// bytes; `vk_hash` is an opaque 32-byte fingerprint supplied by the admin
/// (e.g. SHA-256 of the serialized key) used for off-chain auditability.
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct VerificationKeyRecord {
    pub version: u32,
    pub serialized_vk: Vec<u8>,
    pub vk_hash: [u8; 32],
    pub is_active: bool,
}

/// Errors returned by [`DataMigration`] implementations.
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum MigrationError {
    Unauthorized,
    AlreadyPaused,
    NotPaused,
    InvalidChunk,
    VerificationFailed,
    Other,
}

/// Trait for contract data migration.
///
/// Uses a concrete [`MigrationError`] instead of an associated type because
/// ink! trait definitions do not support associated types.
#[ink::trait_definition]
pub trait DataMigration {
    /// Pause the contract for migration
    #[ink(message)]
    fn pause_for_migration(&mut self) -> Result<(), MigrationError>;

    /// Unpause the contract after migration
    #[ink(message)]
    fn resume_after_migration(&mut self) -> Result<(), MigrationError>;

    /// Extract a chunk of data for migration (generic byte representation)
    #[ink(message)]
    fn extract_data_chunk(
        &self,
        chunk_id: u32,
        start_index: u32,
        count: u32,
    ) -> Result<Vec<u8>, MigrationError>;

    /// Initialize the contract with migrated data
    #[ink(message)]
    fn initialize_with_migrated_data(&mut self, data: Vec<u8>) -> Result<(), MigrationError>;

    /// Verify the migrated data integrity
    #[ink(message)]
    fn verify_migration(&self) -> Result<bool, MigrationError>;
}
