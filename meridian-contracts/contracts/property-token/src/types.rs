    /// Token ID type alias
    pub type TokenId = u64;

    /// Chain ID type alias
    pub type ChainId = u64;

    /// Ownership transfer record
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct OwnershipTransfer {
        pub from: AccountId,
        pub to: AccountId,
        pub timestamp: u64,
        pub transaction_hash: Hash,
    }

    /// Compliance information
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ComplianceInfo {
        pub verified: bool,
        pub verification_date: u64,
        pub verifier: AccountId,
        pub compliance_type: String,
    }

    /// Legal document information
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct DocumentInfo {
        pub document_hash: Hash,
        pub document_type: String,
        pub upload_date: u64,
        pub uploader: AccountId,
    }

    /// Bridged token information
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct BridgedTokenInfo {
        pub original_chain: ChainId,
        pub original_token_id: TokenId,
        pub destination_chain: ChainId,
        pub destination_token_id: TokenId,
        pub bridged_at: u64,
        pub status: BridgingStatus,
    }

    /// Bridging status enum
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum BridgingStatus {
        Locked,
        Pending,
        InTransit,
        Completed,
        Failed,
        Recovering,
        Expired,
    }

    /// Error log entry for monitoring and debugging
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ErrorLogEntry {
        pub log_id: u64,
        pub error_code: String,
        pub message: String,
        pub account: AccountId,
        pub timestamp: u64,
        pub context: Vec<(String, String)>,
        pub prev_error_hash: Hash,
        pub entry_hash: Hash,
    }

    /// Per-account sliding window state for abusive caller detection.
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    #[derive(
        Debug,
        Clone,
        PartialEq,
        Eq,
        scale::Encode,
        scale::Decode,
        ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct ErrorRateState {
        pub count: u64,
        pub window_start: u64,
    }

    /// Aggregated error telemetry exposed by the contract.
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    #[derive(
        Debug,
        Clone,
        PartialEq,
        Eq,
        scale::Encode,
        scale::Decode,
        ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct ErrorStats {
        pub account: AccountId,
        pub total_errors: u64,
        pub window_error_count: u64,
        pub window_start: u64,
        pub error_limit: u64,
        pub window_duration_ms: u64,
        pub remaining_before_block: u64,
        pub is_rate_limited: bool,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Proposal {
        pub id: u64,
        pub token_id: TokenId,
        pub description_hash: Hash,
        pub quorum: u128,
        pub for_votes: u128,
        pub against_votes: u128,
        pub status: ProposalStatus,
        pub created_at: u64,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum ProposalStatus {
        Open,
        Executed,
        Rejected,
        Closed,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct Ask {
        pub token_id: TokenId,
        pub seller: AccountId,
        pub price_per_share: u128,
        pub amount: u128,
        pub created_at: u64,
    }

    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct TaxRecord {
        pub dividends_received: u128,
        pub shares_sold: u128,
        pub proceeds: u128,
    }

    #[derive(
        Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct PendingCodeHash {
        pub code_hash: Hash,
        pub proposed_at: u64,
        pub executable_at: u64,
        pub proposer: AccountId,
    }

    #[derive(
        Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct CodeHashChange {
        pub code_hash: Hash,
        pub proposed_at: u64,
        pub committed_at: u64,
        pub proposer: AccountId,
        pub committer: AccountId,
    }

    // Events for tracking property token operations
    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        pub from: Option<AccountId>,
        #[ink(topic)]
        pub to: Option<AccountId>,
        #[ink(topic)]
        pub id: TokenId,
    }

    #[ink(event)]
    pub struct Approval {
        #[ink(topic)]
        pub owner: AccountId,
        #[ink(topic)]
        pub spender: AccountId,
        #[ink(topic)]
        pub id: TokenId,
    }

    #[ink(event)]
    pub struct ApprovalForAll {
        #[ink(topic)]
        pub owner: AccountId,
        #[ink(topic)]
        pub operator: AccountId,
        pub approved: bool,
    }

    #[ink(event)]
    pub struct PropertyTokenMinted {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub property_id: u64,
        #[ink(topic)]
        pub owner: AccountId,
    }

    #[ink(event)]
    pub struct LegalDocumentAttached {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub document_hash: Hash,
        #[ink(topic)]
        pub document_type: String,
    }

    #[ink(event)]
    pub struct ComplianceVerified {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub verified: bool,
        #[ink(topic)]
        pub verifier: AccountId,
    }

    #[ink(event)]
    pub struct CodeHashProposed {
        #[ink(topic)]
        pub code_hash: Hash,
        pub executable_at: u64,
        #[ink(topic)]
        pub proposer: AccountId,
    }

    #[ink(event)]
    pub struct CodeHashCommitted {
        #[ink(topic)]
        pub code_hash: Hash,
        pub committed_at: u64,
        #[ink(topic)]
        pub committer: AccountId,
    }

    #[ink(event)]
    pub struct TokenBridged {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub destination_chain: ChainId,
        #[ink(topic)]
        pub recipient: AccountId,
        pub bridge_request_id: u64,
    }

    #[ink(event)]
    pub struct BridgeRequestCreated {
        #[ink(topic)]
        pub request_id: u64,
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub source_chain: ChainId,
        #[ink(topic)]
        pub destination_chain: ChainId,
        #[ink(topic)]
        pub requester: AccountId,
    }

    #[ink(event)]
    pub struct BridgeRequestSigned {
        #[ink(topic)]
        pub request_id: u64,
        #[ink(topic)]
        pub signer: AccountId,
        pub signatures_collected: u8,
        pub signatures_required: u8,
    }

    #[ink(event)]
    pub struct BridgeExecuted {
        #[ink(topic)]
        pub request_id: u64,
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub transaction_hash: Hash,
    }

    #[ink(event)]
    pub struct BridgeFailed {
        #[ink(topic)]
        pub request_id: u64,
        #[ink(topic)]
        pub token_id: TokenId,
        pub error: String,
    }

    #[ink(event)]
    pub struct BridgeRecovered {
        #[ink(topic)]
        pub request_id: u64,
        #[ink(topic)]
        pub recovery_action: RecoveryAction,
    }

    #[ink(event)]
    pub struct SharesIssued {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub to: AccountId,
        pub amount: u128,
    }

    #[ink(event)]
    pub struct SharesRedeemed {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub from: AccountId,
        pub amount: u128,
    }

    #[ink(event)]
    pub struct DividendsDeposited {
        #[ink(topic)]
        pub token_id: TokenId,
        pub amount: u128,
        pub per_share: u128,
    }

    #[ink(event)]
    pub struct DividendsWithdrawn {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub account: AccountId,
        pub amount: u128,
    }

    #[ink(event)]
    pub struct ProposalCreated {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub proposal_id: u64,
        pub quorum: u128,
    }

    #[ink(event)]
    pub struct Voted {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub proposal_id: u64,
        #[ink(topic)]
        pub voter: AccountId,
        pub support: bool,
        pub weight: u128,
    }

    #[ink(event)]
    pub struct ProposalExecuted {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub proposal_id: u64,
        pub passed: bool,
    }

    #[ink(event)]
    pub struct AskPlaced {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub seller: AccountId,
        pub price_per_share: u128,
        pub amount: u128,
    }

    #[ink(event)]
    pub struct AskCancelled {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub seller: AccountId,
        pub escrowed_amount: u128,
    }

    #[ink(event)]
    pub struct SharesPurchased {
        #[ink(topic)]
        pub token_id: TokenId,
        #[ink(topic)]
        pub seller: AccountId,
        #[ink(topic)]
        pub buyer: AccountId,
        pub amount: u128,
        pub price_per_share: u128,
    }
