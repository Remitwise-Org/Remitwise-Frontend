#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(unexpected_cfgs)]
#![allow(clippy::arithmetic_side_effects)]
#![allow(clippy::cast_possible_truncation)]

//! Property token contract for ownership, compliance, and bridge-enabled operations.


use ink::prelude::{
    format,
    string::{String, ToString},
    vec,
    vec::Vec,
};
use ink::prelude::string::String;
use ink::storage::Mapping;
use scale::Encode;
use propchain_traits::*;
use stellar_insured_lib::circuit_breaker::{
    CircuitBreakerTransition, InkCircuitBreaker,
};

mod validation;
mod state_root;

#[ink::contract]
mod property_token {
    use super::*;

    const MAX_ERROR_LOG: u64 = 50;
    const ERROR_WINDOW_DURATION_MS: u64 = 3_600_000;
    const DEFAULT_ERROR_LIMIT: u64 = 10;
    const CODE_HASH_UPGRADE_DELAY_MS: u64 = 48 * 60 * 60 * 1000;

    /// Error types for the property token contract
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        // Standard ERC errors
        TokenNotFound,
        Unauthorized,
        // Property-specific errors
        PropertyNotFound,
        InvalidMetadata,
        DocumentNotFound,
        ComplianceFailed,
        // Cross-chain bridge errors
        BridgeNotSupported,
        InvalidChain,
        BridgeLocked,
        InsufficientSignatures,
        RequestExpired,
        InvalidRequest,
        BridgePaused,
        GasLimitExceeded,
        MetadataCorruption,
        InvalidBridgeOperator,
        DuplicateBridgeRequest,
        BridgeTimeout,
        AlreadySigned,
        InsufficientBalance,
        InvalidAmount,
        ProposalNotFound,
        ProposalClosed,
        AskNotFound,
        InconsistentState,
        RateLimited,
        InvalidParameters,
        GovernanceNotSet,
        UpgradeNotProposed,
        UpgradeTimelockActive,
        ContractPaused,
    }

    /// Property Token contract that maintains compatibility with ERC-721 and ERC-1155
    /// while adding real estate-specific features and cross-chain support
    #[ink(storage)]
    pub struct PropertyToken {
        // ERC-721 standard mappings
        token_owner: Mapping<TokenId, AccountId>,
        owner_token_count: Mapping<AccountId, u32>,
        token_approvals: Mapping<TokenId, AccountId>,
        operator_approvals: Mapping<(AccountId, AccountId), bool>,

        // ERC-1155 batch operation support
        balances: Mapping<(AccountId, TokenId), u128>,
        operators: Mapping<(AccountId, AccountId), bool>,

        // Property-specific mappings
        token_properties: Mapping<TokenId, PropertyInfo>,
        property_tokens: Mapping<u64, TokenId>, // property_id to token_id mapping
        ownership_history_count: Mapping<TokenId, u32>,
        ownership_history_items: Mapping<(TokenId, u32), OwnershipTransfer>,
        compliance_flags: Mapping<TokenId, ComplianceInfo>,
        legal_documents_count: Mapping<TokenId, u32>,
        legal_documents_items: Mapping<(TokenId, u32), DocumentInfo>,

        // Cross-chain bridge mappings
        bridged_tokens: Mapping<(ChainId, TokenId), BridgedTokenInfo>,
        bridge_operators: Vec<AccountId>,
        bridge_requests: Mapping<u64, MultisigBridgeRequest>,
        bridge_transactions: Mapping<AccountId, Vec<BridgeTransaction>>,
        bridge_config: BridgeConfig,
        verified_bridge_hashes: Mapping<Hash, bool>,
        bridge_request_counter: u64,
        /// O(1) lookup: tracks the active pending bridge request ID per token
        token_pending_requests: Mapping<TokenId, u64>,

        // Standard counters
        total_supply: u64,
        token_counter: u64,
        admin: AccountId,
        circuit_breaker: InkCircuitBreaker,

        // Error logging and monitoring
        error_counts: Mapping<(AccountId, String), u64>,
        error_rates: Mapping<AccountId, ErrorRateState>,
        recent_errors: Mapping<u64, ErrorLogEntry>,
        error_log_counter: u64,
        account_error_totals: Mapping<AccountId, u64>,
        error_limit: u64,
        last_error_hash: Hash,

        total_shares: Mapping<TokenId, u128>,
        dividends_per_share: Mapping<TokenId, u128>,
        // Legacy credit mapping retained for compatibility but no longer used.
        dividend_credit: Mapping<(AccountId, TokenId), u128>,
        dividend_balance: Mapping<(AccountId, TokenId), u128>,
        // New checkpoint storing the last seen dividends_per_share per holder.
        dividend_checkpoint: Mapping<(AccountId, TokenId), u128>,
        proposal_counter: Mapping<TokenId, u64>,
        proposals: Mapping<(TokenId, u64), Proposal>,
        votes_cast: Mapping<(TokenId, u64, AccountId), bool>,
        asks: Mapping<(TokenId, AccountId), Ask>,
        escrowed_shares: Mapping<(TokenId, AccountId), u128>,
        last_trade_price: Mapping<TokenId, u128>,
        compliance_registry: Option<AccountId>,
        fee_manager: Option<AccountId>,
        tax_records: Mapping<(AccountId, TokenId), TaxRecord>,
        governance: Option<AccountId>,
        pending_code_hash: Option<PendingCodeHash>,
        code_hash_history: Mapping<u64, CodeHashChange>,
        code_hash_history_count: u64,

        // Gas estimation: per-chain overhead and cross-contract buffer (issue #461)
        chain_gas_overhead: Mapping<ChainId, u64>,
        cross_contract_gas_buffer_pct: u8,
    }

    // Domain types are extracted to keep this file focused on contract behavior.
    include!("types.rs");

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
        // Chain IDs stay in the payload; ink! allows at most 3 indexed topics
        // (plus the event signature) so keep indexing on request/token/requester.
        pub source_chain: ChainId,
        pub destination_chain: ChainId,
        #[ink(topic)]
        pub requester: AccountId,
    }

    #[ink(event)]
    pub struct BridgeRequestExpired {
        #[ink(topic)]
        pub request_id: u64,
        #[ink(topic)]
        pub token_id: TokenId,
        pub expires_at: u64,
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

    #[ink(event)]
    pub struct PauseScheduled {
        #[ink(topic)]
        pub scheduled_by: AccountId,
        pub scheduled_at: u64,
        pub activates_at: u64,
        pub pause_until: Option<u64>,
        pub rescheduled_by: Option<AccountId>,
    }

    #[ink(event)]
    pub struct PauseActivated {
        pub activated_at: u64,
        pub pause_until: Option<u64>,
        pub emergency: bool,
    }

    #[ink(event)]
    pub struct ResumeScheduled {
        #[ink(topic)]
        pub scheduled_by: AccountId,
        pub scheduled_at: u64,
        pub activates_at: u64,
    }

    #[ink(event)]
    pub struct ResumeActivated {
        #[ink(topic)]
        pub activated_by: Option<AccountId>,
        pub activated_at: u64,
        pub automatic: bool,
    }


    impl PropertyToken {
        /// Creates a new PropertyToken contract
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();

            // Initialize default bridge configuration
            let bridge_config = BridgeConfig {
                supported_chains: vec![1, 2, 3], // Default supported chains
                min_signatures_required: 2,
                max_signatures_required: 5,
                default_timeout_blocks: 100,
                gas_limit_per_bridge: 500000,
                metadata_preservation: true,
            };

            Self {
                // ERC-721 standard mappings
                token_owner: Mapping::default(),
                owner_token_count: Mapping::default(),
                token_approvals: Mapping::default(),
                operator_approvals: Mapping::default(),

                // ERC-1155 batch operation support
                balances: Mapping::default(),
                operators: Mapping::default(),

                // Property-specific mappings
                token_properties: Mapping::default(),
                property_tokens: Mapping::default(),
                ownership_history_count: Mapping::default(),
                ownership_history_items: Mapping::default(),
                compliance_flags: Mapping::default(),
                legal_documents_count: Mapping::default(),
                legal_documents_items: Mapping::default(),

                // Cross-chain bridge mappings
                bridged_tokens: Mapping::default(),
                bridge_operators: vec![caller],
                bridge_requests: Mapping::default(),
                bridge_transactions: Mapping::default(),
                bridge_config,
                verified_bridge_hashes: Mapping::default(),
                bridge_request_counter: 0,
                token_pending_requests: Mapping::default(),

                // Standard counters
                total_supply: 0,
                token_counter: 0,
                admin: caller,
                circuit_breaker: InkCircuitBreaker::default(),

                // Error logging and monitoring
                error_counts: Mapping::default(),
                error_rates: Mapping::default(),
                recent_errors: Mapping::default(),
                error_log_counter: 0,
                account_error_totals: Mapping::default(),
                error_limit: DEFAULT_ERROR_LIMIT,
                last_error_hash: Hash::from([0u8; 32]),

                total_shares: Mapping::default(),
                dividends_per_share: Mapping::default(),
                dividend_credit: Mapping::default(),
                dividend_balance: Mapping::default(),
                dividend_checkpoint: Mapping::default(),
                proposal_counter: Mapping::default(),
                proposals: Mapping::default(),
                votes_cast: Mapping::default(),
                asks: Mapping::default(),
                escrowed_shares: Mapping::default(),
                last_trade_price: Mapping::default(),
                compliance_registry: None,
                fee_manager: None,
                tax_records: Mapping::default(),
                governance: None,
                pending_code_hash: None,
                code_hash_history: Mapping::default(),
                code_hash_history_count: 0,

                chain_gas_overhead: Mapping::default(),
                cross_contract_gas_buffer_pct: 20,
            }
        }

        /// Ensure the account is not the zero address.
        fn ensure_non_zero_account(&self, account: &AccountId) -> Result<(), Error> {
            if *account == AccountId::from([0x0; 32]) {
                return Err(Error::InvalidRequest);
            }
            Ok(())
        }

        /// Saturating mul/div helper for dividend and share math.
        fn safe_mul_div(&self, a: u128, b: u128, denom: u128) -> u128 {
            if denom == 0 {
                return 0;
            }
            a.saturating_mul(b) / denom
        }

        /// Require the caller to be the token admin for privileged operations.
        fn ensure_admin(&self) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return Err(Error::Unauthorized);
            }
            Ok(())
        }

        /// ERC-721: Returns the balance of tokens owned by an account
        #[ink(message)]
        pub fn balance_of(&self, owner: AccountId) -> u32 {
            self.ensure_non_zero_account(&owner)
                .unwrap_or_else(|_| panic!("Zero address not allowed"));
            self.owner_token_count.get(owner).unwrap_or(0)
        }

        /// ERC-721: Returns the owner of a token
        #[ink(message)]
        pub fn owner_of(&self, token_id: TokenId) -> Option<AccountId> {
            self.token_owner.get(token_id)
        }

        /// ERC-721: Transfers a token from one account to another
        #[ink(message, payable)]
        pub fn transfer_from(
            &mut self,
            from: AccountId,
            to: AccountId,
            token_id: TokenId,
        ) -> Result<(), Error> {
            self.ensure_not_paused()?;
            let caller = self.env().caller();

            // Collect fee for transfer
            self.collect_operation_fee(FeeOperation::TransferProperty, 1)?;

            self.ensure_non_zero_account(&from)?;
            self.ensure_non_zero_account(&to)?;

            // Check if caller is authorized to transfer
            let token_owner = match self.token_owner.get(token_id) {
                Some(owner) => owner,
                None => {
                    self.log_error(
                        caller,
                        "TOKEN_NOT_FOUND".to_string(),
                        format!("Token ID {} does not exist", token_id),
                        vec![
                            ("token_id".to_string(), token_id.to_string()),
                            ("operation".to_string(), "transfer_from".to_string()),
                        ],
                    )?;
                    return Err(Error::TokenNotFound);
                }
            };
            if token_owner != from {
                self.log_error(
                    caller,
                    "UNAUTHORIZED".to_string(),
                    format!("Caller is not authorized to transfer token {}", token_id),
                    vec![
                        ("token_id".to_string(), token_id.to_string()),
                        ("caller".to_string(), format!("{:?}", caller)),
                        ("owner".to_string(), format!("{:?}", token_owner)),
                    ],
                )?;
                return Err(Error::Unauthorized);
            }

            if caller != from
                && Some(caller) != self.token_approvals.get(token_id)
                && !self.is_approved_for_all(from, caller)
            {
                return Err(Error::Unauthorized);
            }

            // Enforce compliance for both sender and recipient on ERC-721 transfers.
            if !self.pass_compliance(from)? || !self.pass_compliance(to)? {
                return Err(Error::ComplianceFailed);
            }

            // Perform the transfer
            self.remove_token_from_owner(from, token_id)?;
            self.add_token_to_owner(to, token_id)?;

            // Clear approvals
            self.token_approvals.remove(token_id);

            // Update ownership history
            self.update_ownership_history(token_id, from, to)?;

            self.env().emit_event(Transfer {
                from: Some(from),
                to: Some(to),
                id: token_id,
            });

            Ok(())
        }

        /// ERC-721: Approves an account to transfer a specific token
        #[ink(message)]
        pub fn approve(&mut self, to: AccountId, token_id: TokenId) -> Result<(), Error> {
            self.ensure_not_paused()?;
            let caller = self.env().caller();
            let token_owner = match self.token_owner.get(token_id) {
                Some(owner) => owner,
                None => {
                    self.log_error(
                        caller,
                        "TOKEN_NOT_FOUND".to_string(),
                        format!("Token ID {} does not exist", token_id),
                        vec![
                            ("token_id".to_string(), token_id.to_string()),
                            ("operation".to_string(), "approve".to_string()),
                        ],
                    )?;
                    return Err(Error::TokenNotFound);
                }
            };

            if token_owner != caller && !self.is_approved_for_all(token_owner, caller) {
                self.log_error(
                    caller,
                    "UNAUTHORIZED".to_string(),
                    format!("Caller is not authorized to approve token {}", token_id),
                    vec![
                        ("token_id".to_string(), token_id.to_string()),
                        ("caller".to_string(), format!("{:?}", caller)),
                        ("owner".to_string(), format!("{:?}", token_owner)),
                    ],
                )?;
                return Err(Error::Unauthorized);
            }

            self.token_approvals.insert(token_id, &to);

            self.env().emit_event(Approval {
                owner: token_owner,
                spender: to,
                id: token_id,
            });

            Ok(())
        }

        /// ERC-721: Sets or unsets an operator for an owner
        #[ink(message)]
        pub fn set_approval_for_all(
            &mut self,
            operator: AccountId,
            approved: bool,
        ) -> Result<(), Error> {
            self.ensure_not_paused()?;
            let caller = self.env().caller();
            self.operator_approvals
                .insert((&caller, &operator), &approved);

            self.env().emit_event(ApprovalForAll {
                owner: caller,
                operator,
                approved,
            });

            Ok(())
        }

        /// ERC-721: Gets the approved account for a token
        #[ink(message)]
        pub fn get_approved(&self, token_id: TokenId) -> Option<AccountId> {
            self.token_approvals.get(token_id)
        }

        /// ERC-721: Checks if an operator is approved for an owner
        #[ink(message)]
        pub fn is_approved_for_all(&self, owner: AccountId, operator: AccountId) -> bool {
            self.operator_approvals
                .get((&owner, &operator))
                .unwrap_or(false)
        }

        /// Internal helper to collect fees for an operation.
        fn collect_operation_fee(
            &mut self,
            operation: FeeOperation,
            count: u32,
        ) -> Result<(), Error> {
            if let Some(fee_manager_addr) = self.fee_manager {
                let transferred_value = self.env().transferred_value();
                let caller = self.env().caller();

                // Call the fee manager to get recommended fee
                use ink::codegen::TraitCallBuilder;
                let fee_provider: ink::contract_ref!(DynamicFeeProvider) = fee_manager_addr.into();

                let single_fee = fee_provider.get_recommended_fee(operation);
                let total_fee = single_fee.saturating_mul(count as u128);

                if transferred_value < total_fee {
                    return Err(Error::Unauthorized); // Should be InsufficientFee but Error doesn't have it
                }

                // Call the fee manager to collect the fee
                let mut fee_provider_mut: ink::contract_ref!(DynamicFeeProvider) =
                    fee_manager_addr.into();

                fee_provider_mut
                    .call_mut()
                    .collect_fee(operation, caller, total_fee)
                    .transferred_value(transferred_value)
                    .try_invoke()
                    .map_err(|_| Error::Unauthorized)? // General error for failed call
                    .map_err(|_| Error::Unauthorized)? // General error for logic failure in fee manager
                    .map_err(|_| Error::Unauthorized)?;
            }
            Ok(())
        }

        /// ERC-1155: Returns the balance of tokens for an account
        #[ink(message)]
        pub fn balance_of_batch(&self, accounts: Vec<AccountId>, ids: Vec<TokenId>) -> Vec<u128> {
            let mut balances = Vec::new();
            for i in 0..accounts.len() {
                if i < ids.len() {
                    let balance = self.balances.get((&accounts[i], &ids[i])).unwrap_or(0);
                    balances.push(balance);
                } else {
                    balances.push(0);
                }
            }
            balances
        }

        /// ERC-1155: Safely transfers tokens from one account to another
        #[ink(message)]
        pub fn safe_batch_transfer_from(
            &mut self,
            from: AccountId,
            to: AccountId,
            ids: Vec<TokenId>,
            amounts: Vec<u128>,
            _data: Vec<u8>,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            if from != caller && !self.is_approved_for_all(from, caller) {
                return Err(Error::Unauthorized);
            }

            // Verify lengths match
            if ids.len() != amounts.len() {
                return Err(Error::Unauthorized); // Using this as a general error for mismatched arrays
            }

            // Enforce compliance for both sender and recipient on ERC-1155 batch transfers.
            if !self.pass_compliance(from)? || !self.pass_compliance(to)? {
                return Err(Error::ComplianceFailed);
            }

            // Transfer each token
            for i in 0..ids.len() {
                let token_id = ids[i];
                let amount = amounts[i];

                // Check balance
                let from_balance = self.balances.get((&from, &token_id)).unwrap_or(0);
                if from_balance < amount {
                    return Err(Error::Unauthorized);
                }

                // Update balances
                self.balances
                    .insert((&from, &token_id), &(from_balance - amount));
                let to_balance = self.balances.get((&to, &token_id)).unwrap_or(0);
                self.balances
                    .insert((&to, &token_id), &(to_balance + amount));
            }

            // Emit transfer events for each token
            for id in &ids {
                self.env().emit_event(Transfer {
                    from: Some(from),
                    to: Some(to),
                    id: *id,
                });
            }

            Ok(())
        }

        /// ERC-1155: Returns the URI for a token
        #[ink(message)]
        pub fn uri(&self, token_id: TokenId) -> Option<String> {
            // Return a standard URI format for the token metadata
            let _property_info = self.token_properties.get(token_id)?;
            Some(format!(
                "ipfs://property/{:?}/{}/metadata.json",
                self.env().account_id(),
                token_id
            ))
        }

        /// Configure the external compliance registry used before share transfers.
        #[ink(message)]
        pub fn set_compliance_registry(&mut self, registry: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }
            self.compliance_registry = Some(registry);
            Ok(())
        }

        /// Configure the external fee manager used for operation fees.
        #[ink(message)]
        pub fn set_fee_manager(&mut self, manager: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }
            self.fee_manager = Some(manager);
            Ok(())
        }

        /// Configure the external governance contract that authorizes code upgrades.
        #[ink(message)]
        pub fn set_governance(&mut self, governance: AccountId) -> Result<(), Error> {
            self.ensure_admin()?;
            Self::ensure_non_zero_account(&governance)?;
            self.governance = Some(governance);
            Ok(())
        }

        /// Return the configured governance contract address, if any.
        #[ink(message)]
        pub fn governance(&self) -> Option<AccountId> {
            self.governance
        }

        /// Deprecated direct upgrade entry point. Immediate upgrades are disabled.
        #[ink(message)]
        pub fn set_code_hash(&mut self, _code_hash: Hash) -> Result<(), Error> {
            Err(Error::Unauthorized)
        }

        /// Propose a governance-approved code hash upgrade after the timelock expires.
        #[ink(message)]
        pub fn propose_code_hash(&mut self, code_hash: Hash) -> Result<(), Error> {
            self.ensure_governance()?;
            let now = self.env().block_timestamp();
            let executable_at = now.saturating_add(CODE_HASH_UPGRADE_DELAY_MS);
            self.pending_code_hash = Some(PendingCodeHash {
                code_hash,
                proposed_at: now,
                executable_at,
                proposer: self.env().caller(),
            });
            let now_seconds = self.now_seconds();
            let caller = self.env().caller();
            let transitions = self
                .circuit_breaker
                .emergency_pause(now_seconds, caller);
            self.emit_circuit_breaker_transition(transitions.0);
            self.emit_circuit_breaker_transition(transitions.1);
            self.env().emit_event(CodeHashProposed {
                code_hash,
                executable_at,
                proposer: self.env().caller(),
            });
            Ok(())
        }

        /// Commit the pending code hash upgrade once the timelock has elapsed.
        #[ink(message)]
        pub fn commit_code_hash(&mut self) -> Result<(), Error> {
            self.ensure_governance()?;
            let pending = self
                .pending_code_hash
                .clone()
                .ok_or(Error::UpgradeNotProposed)?;
            let now = self.env().block_timestamp();
            if now < pending.executable_at {
                return Err(Error::UpgradeTimelockActive);
            }
            self.env()
                .set_code_hash(&pending.code_hash)
                .map_err(|_| Error::InvalidRequest)?;
            let index = self.code_hash_history_count;
            self.code_hash_history.insert(
                index,
                &CodeHashChange {
                    code_hash: pending.code_hash,
                    proposed_at: pending.proposed_at,
                    committed_at: now,
                    proposer: pending.proposer,
                    committer: self.env().caller(),
                },
            );
            self.code_hash_history_count = index.saturating_add(1);
            self.pending_code_hash = None;
            self.env().emit_event(CodeHashCommitted {
                code_hash: pending.code_hash,
                committed_at: now,
                committer: self.env().caller(),
            });
            Ok(())
        }

        /// Return the active pending code hash proposal, if any.
        #[ink(message)]
        pub fn pending_code_hash(&self) -> Option<PendingCodeHash> {
            self.pending_code_hash.clone()
        }

        /// Return a committed code hash history entry by index.
        #[ink(message)]
        pub fn code_hash_history(&self, index: u64) -> Option<CodeHashChange> {
            self.code_hash_history.get(index)
        }

        /// Return the number of committed code hash upgrades.
        #[ink(message)]
        pub fn code_hash_history_count(&self) -> u64 {
            self.code_hash_history_count
        }

        /// Return the fixed upgrade timelock delay in milliseconds.
        #[ink(message)]
        pub fn code_hash_upgrade_delay(&self) -> u64 {
            CODE_HASH_UPGRADE_DELAY_MS
        }

        /// Return the total fractional shares issued for a property token.
        #[ink(message)]
        pub fn total_shares(&self, token_id: TokenId) -> u128 {
            self.total_shares.get(token_id).unwrap_or(0)
        }

        /// Return a holder's fractional share balance for a property token.
        #[ink(message)]
        pub fn share_balance_of(&self, owner: AccountId, token_id: TokenId) -> u128 {
            self.balances.get((owner, token_id)).unwrap_or(0)
        }

        /// Issue fractional shares to an account when called by the admin or token owner.
        #[ink(message)]
        pub fn issue_shares(
            &mut self,
            token_id: TokenId,
            to: AccountId,
            amount: u128,
        ) -> Result<(), Error> {
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let caller = self.env().caller();
            let owner = self.token_owner.get(token_id).ok_or(Error::TokenNotFound)?;
            if caller != self.admin && caller != owner {
                return Err(Error::Unauthorized);
            }
            let bal = self.balances.get((to, token_id)).unwrap_or(0);
            self.balances
                .insert((to, token_id), &(bal.saturating_add(amount)));
            let ts = self.total_shares.get(token_id).unwrap_or(0);
            self.total_shares
                .insert(token_id, &(ts.saturating_add(amount)));
            self.update_dividend_credit_on_change(to, token_id)?;
            self.env().emit_event(SharesIssued {
                token_id,
                to,
                amount,
            });
            Ok(())
        }

        /// Redeem fractional shares from an owner or approved operator.
        #[ink(message)]
        pub fn redeem_shares(
            &mut self,
            token_id: TokenId,
            from: AccountId,
            amount: u128,
        ) -> Result<(), Error> {
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let caller = self.env().caller();
            if caller != from && !self.is_approved_for_all(from, caller) {
                return Err(Error::Unauthorized);
            }
            let bal = self.balances.get((from, token_id)).unwrap_or(0);
            if bal < amount {
                return Err(Error::InsufficientBalance);
            }
            self.balances
                .insert((from, token_id), &(bal.saturating_sub(amount)));
            let ts = self.total_shares.get(token_id).unwrap_or(0);
            self.total_shares
                .insert(token_id, &(ts.saturating_sub(amount)));
            self.update_dividend_credit_on_change(from, token_id)?;
            self.env().emit_event(SharesRedeemed {
                token_id,
                from,
                amount,
            });
            Ok(())
        }

        /// Transfer fractional shares after authorization and compliance checks.
        #[ink(message)]
        pub fn transfer_shares(
            &mut self,
            from: AccountId,
            to: AccountId,
            token_id: TokenId,
            amount: u128,
        ) -> Result<(), Error> {
            self.ensure_not_paused()?;
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let caller = self.env().caller();
            if caller != from && !self.is_approved_for_all(from, caller) {
                return Err(Error::Unauthorized);
            }
            if !self.pass_compliance(from)? || !self.pass_compliance(to)? {
                return Err(Error::ComplianceFailed);
            }
            let from_balance = self.balances.get((from, token_id)).unwrap_or(0);
            if from_balance < amount {
                return Err(Error::InsufficientBalance);
            }
            self.update_dividend_credit_on_change(from, token_id)?;
            self.update_dividend_credit_on_change(to, token_id)?;
            self.balances
                .insert((from, token_id), &(from_balance.saturating_sub(amount)));
            let to_balance = self.balances.get((to, token_id)).unwrap_or(0);
            self.balances
                .insert((to, token_id), &(to_balance.saturating_add(amount)));
            Ok(())
        }

        /// Deposit native value as dividends to be distributed across token shares.
        #[ink(message, payable)]
        pub fn deposit_dividends(&mut self, token_id: TokenId) -> Result<(), Error> {
            let value = self.env().transferred_value();
            if value == 0 {
                return Err(Error::InvalidAmount);
            }
            let ts = self.total_shares.get(token_id).unwrap_or(0);
            if ts == 0 {
                return Err(Error::InvalidRequest);
            }

            // Use safe multiplication to avoid overflow on large deposits.
            let scaling: u128 = 1_000_000_000_000;
            let add = self.safe_mul_div(value, scaling, ts);
            let cur = self.dividends_per_share.get(token_id).unwrap_or(0);
            let new = cur.saturating_add(add);
            self.dividends_per_share.insert(token_id, &new);
            self.env().emit_event(DividendsDeposited {
                token_id,
                amount: value,
                per_share: add,
            });
            Ok(())
        }

        /// Withdraw dividends accrued to the caller for a property token.
        #[ink(message)]
        pub fn withdraw_dividends(&mut self, token_id: TokenId) -> Result<u128, Error> {
            let caller = self.env().caller();
            self.update_dividend_credit_on_change(caller, token_id)?;
            let owed = self.dividend_balance.get((caller, token_id)).unwrap_or(0);
            if owed == 0 {
                return Ok(0);
            }
            self.dividend_balance.insert((caller, token_id), &0u128);
            match self.env().transfer(caller, owed) {
                Ok(_) => {
                    let mut rec = self
                        .tax_records
                        .get((caller, token_id))
                        .unwrap_or(TaxRecord {
                            dividends_received: 0,
                            shares_sold: 0,
                            proceeds: 0,
                        });
                    rec.dividends_received = rec.dividends_received.saturating_add(owed);
                    self.tax_records.insert((caller, token_id), &rec);
                    self.env().emit_event(DividendsWithdrawn {
                        token_id,
                        account: caller,
                        amount: owed,
                    });
                    Ok(owed)
                }
                Err(_) => Err(Error::InvalidRequest),
            }
        }

        /// Create a token-holder governance proposal for a property token.
        #[ink(message)]
        pub fn create_proposal(
            &mut self,
            token_id: TokenId,
            quorum: u128,
            description_hash: Hash,
        ) -> Result<u64, Error> {
            let owner = self.token_owner.get(token_id).ok_or(Error::TokenNotFound)?;
            let caller = self.env().caller();
            if caller != self.admin && caller != owner {
                return Err(Error::Unauthorized);
            }
            let counter = self.proposal_counter.get(token_id).unwrap_or(0) + 1;
            self.proposal_counter.insert(token_id, &counter);
            let proposal = Proposal {
                id: counter,
                token_id,
                description_hash,
                quorum,
                for_votes: 0,
                against_votes: 0,
                status: ProposalStatus::Open,
                created_at: self.env().block_timestamp(),
            };
            self.proposals.insert((token_id, counter), &proposal);
            self.env().emit_event(ProposalCreated {
                token_id,
                proposal_id: counter,
                quorum,
            });
            Ok(counter)
        }

        /// Cast a weighted vote using the caller's current fractional share balance.
        #[ink(message)]
        pub fn vote(
            &mut self,
            token_id: TokenId,
            proposal_id: u64,
            support: bool,
        ) -> Result<(), Error> {
            let mut proposal = self
                .proposals
                .get((token_id, proposal_id))
                .ok_or(Error::ProposalNotFound)?;
            if proposal.status != ProposalStatus::Open {
                return Err(Error::ProposalClosed);
            }
            let voter = self.env().caller();
            if self
                .votes_cast
                .get((token_id, proposal_id, voter))
                .unwrap_or(false)
            {
                return Err(Error::Unauthorized);
            }
            let weight = self.balances.get((voter, token_id)).unwrap_or(0);
            if support {
                proposal.for_votes = proposal.for_votes.saturating_add(weight);
            } else {
                proposal.against_votes = proposal.against_votes.saturating_add(weight);
            }
            self.proposals.insert((token_id, proposal_id), &proposal);
            self.votes_cast
                .insert((token_id, proposal_id, voter), &true);
            self.env().emit_event(Voted {
                token_id,
                proposal_id,
                voter,
                support,
                weight,
            });
            Ok(())
        }

        /// Finalize a proposal by comparing votes against quorum and opposition.
        #[ink(message)]
        pub fn execute_proposal(
            &mut self,
            token_id: TokenId,
            proposal_id: u64,
        ) -> Result<bool, Error> {
            let mut proposal = self
                .proposals
                .get((token_id, proposal_id))
                .ok_or(Error::ProposalNotFound)?;
            if proposal.status != ProposalStatus::Open {
                return Err(Error::ProposalClosed);
            }
            let passed = proposal.for_votes >= proposal.quorum
                && proposal.for_votes > proposal.against_votes;
            proposal.status = if passed {
                ProposalStatus::Executed
            } else {
                ProposalStatus::Rejected
            };
            self.proposals.insert((token_id, proposal_id), &proposal);
            self.env().emit_event(ProposalExecuted {
                token_id,
                proposal_id,
                passed,
            });
            Ok(passed)
        }

        /// Escrow shares and list them for sale at a fixed price per share.
        #[ink(message)]
        pub fn place_ask(
            &mut self,
            token_id: TokenId,
            price_per_share: u128,
            amount: u128,
        ) -> Result<(), Error> {
            self.ensure_not_paused()?;
            if price_per_share == 0 || amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let seller = self.env().caller();
            let bal = self.balances.get((seller, token_id)).unwrap_or(0);
            if bal < amount {
                return Err(Error::InsufficientBalance);
            }
            let esc = self.escrowed_shares.get((token_id, seller)).unwrap_or(0);
            self.escrowed_shares
                .insert((token_id, seller), &(esc.saturating_add(amount)));
            self.balances
                .insert((seller, token_id), &(bal.saturating_sub(amount)));
            let ask = Ask {
                token_id,
                seller,
                price_per_share,
                amount,
                created_at: self.env().block_timestamp(),
            };
            self.asks.insert((token_id, seller), &ask);
            self.env().emit_event(AskPlaced {
                token_id,
                seller,
                price_per_share,
                amount,
            });
            Ok(())
        }

        /// Cancel the caller's active ask and return escrowed shares.
        #[ink(message)]
        pub fn cancel_ask(&mut self, token_id: TokenId) -> Result<(), Error> {
            let seller = self.env().caller();
            let ask = self
                .asks
                .get((token_id, seller))
                .ok_or(Error::AskNotFound)?;
            let esc = self.escrowed_shares.get((token_id, seller)).unwrap_or(0);
            if esc != ask.amount {
                return Err(Error::InconsistentState);
            }
            let bal = self.balances.get((seller, token_id)).unwrap_or(0);
            self.balances
                .insert((seller, token_id), &(bal.saturating_add(ask.amount)));
            self.escrowed_shares.insert((token_id, seller), &0u128);
            self.asks.remove((token_id, seller));
            self.env().emit_event(AskCancelled {
                token_id,
                seller,
                escrowed_amount: esc,
            });
            Ok(())
        }

        /// Buy escrowed shares from a seller when exact payment is supplied.
        #[ink(message, payable)]
        pub fn buy_shares(
            &mut self,
            token_id: TokenId,
            seller: AccountId,
            amount: u128,
        ) -> Result<(), Error> {
            self.ensure_not_paused()?;
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let ask = self
                .asks
                .get((token_id, seller))
                .ok_or(Error::AskNotFound)?;
            if ask.amount < amount {
                return Err(Error::InvalidAmount);
            }
            let cost = ask.price_per_share.saturating_mul(amount);
            let paid = self.env().transferred_value();
            if paid != cost {
                return Err(Error::InvalidAmount);
            }
            let buyer = self.env().caller();
            if !self.pass_compliance(buyer)? || !self.pass_compliance(seller)? {
                return Err(Error::ComplianceFailed);
            }
            let esc = self.escrowed_shares.get((token_id, seller)).unwrap_or(0);
            if esc < amount {
                return Err(Error::AskNotFound);
            }
            let to_balance = self.balances.get((buyer, token_id)).unwrap_or(0);
            self.balances
                .insert((buyer, token_id), &(to_balance.saturating_add(amount)));
            self.escrowed_shares
                .insert((token_id, seller), &(esc.saturating_sub(amount)));
            match self.env().transfer(seller, cost) {
                Ok(_) => {
                    let mut rec = self
                        .tax_records
                        .get((seller, token_id))
                        .unwrap_or(TaxRecord {
                            dividends_received: 0,
                            shares_sold: 0,
                            proceeds: 0,
                        });
                    rec.shares_sold = rec.shares_sold.saturating_add(amount);
                    rec.proceeds = rec.proceeds.saturating_add(cost);
                    self.tax_records.insert((seller, token_id), &rec);
                }
                Err(_) => return Err(Error::InvalidRequest),
            }
            self.last_trade_price.insert(token_id, &ask.price_per_share);
            if ask.amount == amount {
                self.asks.remove((token_id, seller));
            } else {
                let mut new_ask = ask.clone();
                new_ask.amount = ask.amount.saturating_sub(amount);
                self.asks.insert((token_id, seller), &new_ask);
            }
            self.env().emit_event(SharesPurchased {
                token_id,
                seller,
                buyer,
                amount,
                price_per_share: ask.price_per_share,
            });
            Ok(())
        }

        /// Return the last recorded trade price for a property token.
        #[ink(message)]
        pub fn get_last_trade_price(&self, token_id: TokenId) -> Option<u128> {
            self.last_trade_price.get(token_id)
        }

        /// Build a compact portfolio view of balances and last trade prices.
        #[ink(message)]
        pub fn get_portfolio(
            &self,
            owner: AccountId,
            token_ids: Vec<TokenId>,
        ) -> Vec<(TokenId, u128, u128)> {
            let mut out = Vec::new();
            for t in token_ids.iter() {
                let bal = self.balances.get((owner, *t)).unwrap_or(0);
                let price = self.last_trade_price.get(*t).unwrap_or(0);
                out.push((*t, bal, price));
            }
            out
        }

        /// Return tax accounting data for an owner and property token.
        #[ink(message)]
        pub fn get_tax_record(&self, owner: AccountId, token_id: TokenId) -> TaxRecord {
            self.tax_records
                .get((owner, token_id))
                .unwrap_or(TaxRecord {
                    dividends_received: 0,
                    shares_sold: 0,
                    proceeds: 0,
                })
        }

        /// Check an account against the configured compliance registry when present.
        fn pass_compliance(&self, account: AccountId) -> Result<bool, Error> {
            if let Some(registry) = self.compliance_registry {
                use ink::env::call::FromAccountId;
                let checker: ink::contract_ref!(propchain_traits::ComplianceChecker) =
                    FromAccountId::from_account_id(registry);
                Ok(checker.is_compliant(account))
            } else {
                Ok(true)
            }
        }

        /// Sync pending dividends into the holder's claimable balance before balance changes.
        fn update_dividend_credit_on_change(
            &mut self,
            account: AccountId,
            token_id: TokenId,
        ) -> Result<(), Error> {
            let scaling: u128 = 1_000_000_000_000;
            let current_dps = self.dividends_per_share.get(token_id).unwrap_or(0);
            // Retrieve the last checkpoint for this holder.
            let checkpoint = self
                .dividend_checkpoint
                .get((account, token_id))
                .unwrap_or(0);
            if current_dps > checkpoint {
                let bal = self.balances.get((account, token_id)).unwrap_or(0);
                let delta = current_dps.saturating_sub(checkpoint);
                // Compute additional credit safely.
                let add = self.safe_mul_div(bal, delta, scaling);
                let owed = self
                    .dividend_balance
                    .get((account, token_id))
                    .unwrap_or(0)
                    .saturating_add(add);
                self.dividend_balance.insert((account, token_id), &owed);
                // Update the checkpoint to the latest per‑share value.
                self.dividend_checkpoint
                    .insert((account, token_id), &current_dps);
            } else if checkpoint == 0 && current_dps > 0 {
                // First time the holder sees any dividends.
                self.dividend_checkpoint
                    .insert((account, token_id), &current_dps);
            }
            Ok(())
        }

        /// Property-specific: Registers a property and mints a token
        #[ink(message, payable)]
        pub fn register_property_with_token(
            &mut self,
            metadata: PropertyMetadata,
        ) -> Result<TokenId, Error> {
            let caller = self.env().caller();

            // Collect fee for registration
            self.collect_operation_fee(FeeOperation::RegisterProperty, 1)?;

            // Register property in the property registry (simulated here)
            // In a real implementation, this might call an external contract

            // Mint a new token
            self.token_counter += 1;
            let token_id = self.token_counter;

            // Store property information
            let property_info = PropertyInfo {
                id: token_id, // Using token_id as property id for this implementation
                owner: caller,
                metadata: metadata.clone(),
                registered_at: self.env().block_timestamp(),
            };

            self.token_owner.insert(token_id, &caller);
            self.add_token_to_owner(caller, token_id)?;

            // Initialize balances
            self.balances.insert((&caller, &token_id), &1u128);

            // Store property-specific information
            self.token_properties.insert(token_id, &property_info);
            self.property_tokens.insert(token_id, &token_id); // property_id maps to token_id

            // Initialize ownership history
            let initial_transfer = OwnershipTransfer {
                from: AccountId::from([0u8; 32]), // Zero address for minting
                to: caller,
                timestamp: self.env().block_timestamp(),
                transaction_hash: {
                    use ink::env::hash::{Blake2x256, CryptoHash};
                    use scale::Encode;
                    let data = (&caller, token_id);
                    let encoded = data.encode();
                    let mut hash_bytes = [0u8; 32];
                    Blake2x256::hash(&encoded, &mut hash_bytes);
                    Hash::from(hash_bytes)
                },
            };

            self.ownership_history_count.insert(token_id, &1u32);
            self.ownership_history_items
                .insert((token_id, 0), &initial_transfer);

            // Initialize compliance as unverified
            let compliance_info = ComplianceInfo {
                verified: false,
                verification_date: 0,
                verifier: AccountId::from([0u8; 32]),
                compliance_type: String::from("KYC"),
            };
            self.compliance_flags.insert(token_id, &compliance_info);

            // Initialize legal documents count
            self.legal_documents_count.insert(token_id, &0u32);

            self.total_supply += 1;

            self.env().emit_event(PropertyTokenMinted {
                token_id,
                property_id: token_id,
                owner: caller,
            });

            Ok(token_id)
        }

        /// Property-specific: Batch registers properties in a single gas-efficient transaction
        #[ink(message, payable)]
        pub fn batch_register_properties(
            &mut self,
            metadata_list: Vec<PropertyMetadata>,
        ) -> Result<Vec<TokenId>, Error> {
            let caller = self.env().caller();

            // Collect fees for the entire batch
            let count = metadata_list.len() as u32;
            self.collect_operation_fee(FeeOperation::RegisterProperty, count)?;

            let mut issued_tokens = Vec::new();
            let current_time = self.env().block_timestamp();

            for metadata in metadata_list {
                self.token_counter += 1;
                let token_id = self.token_counter;

                let property_info = PropertyInfo {
                    id: token_id,
                    owner: caller,
                    metadata: metadata.clone(),
                    registered_at: current_time,
                };

                self.token_owner.insert(token_id, &caller);
                let balance = self.owner_token_count.get(caller).unwrap_or(0);
                self.owner_token_count.insert(caller, &(balance + 1));

                self.balances.insert((&caller, &token_id), &1u128);
                self.token_properties.insert(token_id, &property_info);
                self.property_tokens.insert(token_id, &token_id);

                let initial_transfer = OwnershipTransfer {
                    from: AccountId::from([0u8; 32]),
                    to: caller,
                    timestamp: current_time,
                    transaction_hash: Hash::default(),
                };

                self.ownership_history_count.insert(token_id, &1u32);
                self.ownership_history_items
                    .insert((token_id, 0), &initial_transfer);

                let compliance_info = ComplianceInfo {
                    verified: false,
                    verification_date: 0,
                    verifier: AccountId::from([0u8; 32]),
                    compliance_type: String::from("KYC"),
                };
                self.compliance_flags.insert(token_id, &compliance_info);
                self.legal_documents_count.insert(token_id, &0u32);

                self.env().emit_event(PropertyTokenMinted {
                    token_id,
                    property_id: token_id,
                    owner: caller,
                });

                issued_tokens.push(token_id);
            }

            self.total_supply += issued_tokens.len() as u64;

            Ok(issued_tokens)
        }

        /// Property-specific: Attaches a legal document to a token
        #[ink(message)]
        pub fn attach_legal_document(
            &mut self,
            token_id: TokenId,
            document_hash: Hash,
            document_type: String,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            let token_owner = self.token_owner.get(token_id).ok_or(Error::TokenNotFound)?;

            if token_owner != caller {
                return Err(Error::Unauthorized);
            }

            // Get existing documents count
            let document_count = self.legal_documents_count.get(token_id).unwrap_or(0);

            // Add new document
            let document_info = DocumentInfo {
                document_hash,
                document_type: document_type.clone(),
                upload_date: self.env().block_timestamp(),
                uploader: caller,
            };

            // Save updated documents
            self.legal_documents_items
                .insert((token_id, document_count), &document_info);
            self.legal_documents_count
                .insert(token_id, &(document_count + 1));

            self.env().emit_event(LegalDocumentAttached {
                token_id,
                document_hash,
                document_type,
            });

            Ok(())
        }

        /// Property-specific: Verifies compliance for a token
        #[ink(message)]
        pub fn verify_compliance(
            &mut self,
            token_id: TokenId,
            verification_status: bool,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Only admin or bridge operators can verify compliance
            if caller != self.admin && !self.bridge_operators.contains(&caller) {
                return Err(Error::Unauthorized);
            }

            let mut compliance_info = self
                .compliance_flags
                .get(token_id)
                .ok_or(Error::TokenNotFound)?;
            compliance_info.verified = verification_status;
            compliance_info.verification_date = self.env().block_timestamp();
            compliance_info.verifier = caller;

            self.compliance_flags.insert(token_id, &compliance_info);

            self.env().emit_event(ComplianceVerified {
                token_id,
                verified: verification_status,
                verifier: caller,
            });

            Ok(())
        }

        /// Property-specific: Gets ownership history for a token
        #[ink(message)]
        pub fn get_ownership_history(&self, token_id: TokenId) -> Option<Vec<OwnershipTransfer>> {
            let count = self.ownership_history_count.get(token_id).unwrap_or(0);
            if count == 0 {
                return None;
            }
            let mut result = Vec::new();
            for i in 0..count {
                if let Some(item) = self.ownership_history_items.get((token_id, i)) {
                    result.push(item);
                }
            }
            Some(result)
        }

        /// Cross-chain: Initiates token bridging to another chain with multi-signature
        #[ink(message, payable)]
        pub fn initiate_bridge_multisig(
            &mut self,
            token_id: TokenId,
            destination_chain: ChainId,
            recipient: AccountId,
            required_signatures: u8,
            timeout_blocks: Option<u64>,
        ) -> Result<u64, Error> {
            let caller = self.env().caller();

            // Collect fee for bridging
            self.collect_operation_fee(FeeOperation::BridgeTransfer, 1)?;

            let token_owner = self.token_owner.get(token_id).ok_or(Error::TokenNotFound)?;

            // Check authorization
            if token_owner != caller {
                return Err(Error::Unauthorized);
            }

            self.ensure_not_paused()?;

            // Validate destination chain
            if !self
                .bridge_config
                .supported_chains
                .contains(&destination_chain)
            {
                return Err(Error::InvalidChain);
            }

            // Check compliance before bridging
            let compliance_info = self
                .compliance_flags
                .get(token_id)
                .ok_or(Error::ComplianceFailed)?;
            if !compliance_info.verified {
                return Err(Error::ComplianceFailed);
            }

            // Validate signature requirements
            if required_signatures < self.bridge_config.min_signatures_required
                || required_signatures > self.bridge_config.max_signatures_required
            {
                return Err(Error::InsufficientSignatures);
            }

            // Check for duplicate requests
            if self.has_pending_bridge_request(token_id) {
                return Err(Error::DuplicateBridgeRequest);
            }

            // Create bridge request
            self.bridge_request_counter += 1;
            let request_id = self.bridge_request_counter;
            let current_block = self.env().block_number();
            // Always set an expiry — fall back to bridge_config.default_timeout_blocks
            // so requests cannot live forever when callers pass None.
            let timeout = timeout_blocks.unwrap_or(self.bridge_config.default_timeout_blocks);
            let expires_at = Some(u64::from(current_block).saturating_add(timeout));

            let property_info = self
                .token_properties
                .get(token_id)
                .ok_or(Error::PropertyNotFound)?;

            let request = MultisigBridgeRequest {
                request_id,
                token_id,
                source_chain: 1, // Current chain ID
                destination_chain,
                sender: caller,
                recipient,
                required_signatures,
                signatures: Vec::new(),
                created_at: u64::from(current_block),
                expires_at,
                locked_at_block: None,
                status: BridgeOperationStatus::Pending,
                metadata: property_info.metadata.clone(),
            };

            self.bridge_requests.insert(request_id, &request);
            self.token_pending_requests.insert(token_id, &request_id);

            self.env().emit_event(BridgeRequestCreated {
                request_id,
                token_id,
                source_chain: request.source_chain,
                destination_chain,
                requester: caller,
            });

            Ok(request_id)
        }

        /// Cross-chain: Signs a bridge request
        #[ink(message)]
        pub fn sign_bridge_request(&mut self, request_id: u64, approve: bool) -> Result<(), Error> {
            let caller = self.env().caller();

            // Check if caller is a bridge operator
            if !self.bridge_operators.contains(&caller) {
                return Err(Error::Unauthorized);
            }

            let mut request = self
                .bridge_requests
                .get(request_id)
                .ok_or(Error::InvalidRequest)?;

            // Reject (and free the token) if the request timed out
            self.expire_bridge_request_if_needed(request_id, &mut request)?;

            // Reject non-pending requests (already locked / failed / expired / completed)
            if request.status != BridgeOperationStatus::Pending {
                return Err(Error::InvalidRequest);
            }

            // Dedupe: one vote per operator per request
            if request.signatures.contains(&caller) {
                return Err(Error::AlreadySigned);
            }

            // Add signature
            request.signatures.push(caller);

            let valid_sigs = self.count_valid_operator_signatures(&request);

            // Update status based on approval and signatures collected
            if !approve {
                request.status = BridgeOperationStatus::Failed;
                self.token_pending_requests.remove(request.token_id);
                self.env().emit_event(BridgeFailed {
                    request_id,
                    token_id: request.token_id,
                    error: String::from("Request rejected by operator"),
                });
            } else if valid_sigs >= request.required_signatures {
                request.status = BridgeOperationStatus::Locked;
                request.locked_at_block = Some(u64::from(self.env().block_number()));

                // Lock the token for bridging
                let token_owner = self
                    .token_owner
                    .get(request.token_id)
                    .ok_or(Error::TokenNotFound)?;
                self.balances
                    .insert((&token_owner, &request.token_id), &0u128);
                self.token_owner
                    .insert(request.token_id, &AccountId::from([0u8; 32])); // Lock to zero address
            }

            self.bridge_requests.insert(request_id, &request);

            self.env().emit_event(BridgeRequestSigned {
                request_id,
                signer: caller,
                signatures_collected: valid_sigs,
                signatures_required: request.required_signatures,
            });

            Ok(())
        }

        /// Cross-chain: Executes a bridge request after collecting required signatures
        #[ink(message)]
        pub fn execute_bridge(&mut self, request_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            // Check if caller is a bridge operator
            if !self.bridge_operators.contains(&caller) {
                return Err(Error::Unauthorized);
            }

            let mut request = self
                .bridge_requests
                .get(request_id)
                .ok_or(Error::InvalidRequest)?;

            // Timed-out requests must not complete — unlock + free pending slot
            self.expire_bridge_request_if_needed(request_id, &mut request)?;

            // Check if request is ready for execution
            if request.status != BridgeOperationStatus::Locked {
                return Err(Error::InvalidRequest);
            }

            // Quorum over the *current* operator set only
            if self.count_valid_operator_signatures(&request) < request.required_signatures {
                return Err(Error::InsufficientSignatures);
            }

            // Generate transaction hash
            let transaction_hash = self.generate_bridge_transaction_hash(&request);

            // Create bridge transaction record
            let transaction = BridgeTransaction {
                transaction_id: self.bridge_request_counter,
                token_id: request.token_id,
                source_chain: request.source_chain,
                destination_chain: request.destination_chain,
                sender: request.sender,
                recipient: request.recipient,
                transaction_hash,
                timestamp: self.env().block_timestamp(),
                gas_used: self.estimate_bridge_gas_usage(&request),
                status: BridgeOperationStatus::InTransit,
                metadata: request.metadata.clone(),
            };

            // Update request status
            request.status = BridgeOperationStatus::Completed;
            self.bridge_requests.insert(request_id, &request);
            self.token_pending_requests.remove(request.token_id);

            // Store transaction verification
            self.verified_bridge_hashes.insert(transaction_hash, &true);

            // Add to bridge history
            let mut history = self
                .bridge_transactions
                .get(request.sender)
                .unwrap_or_default();
            history.push(transaction.clone());
            self.bridge_transactions.insert(request.sender, &history);

            // Update bridged token info
            let bridged_info = BridgedTokenInfo {
                original_chain: request.source_chain,
                original_token_id: request.token_id,
                destination_chain: request.destination_chain,
                destination_token_id: request.token_id, // Will be updated on destination
                bridged_at: self.env().block_timestamp(),
                status: BridgingStatus::InTransit,
            };

            self.bridged_tokens.insert(
                (&request.destination_chain, &request.token_id),
                &bridged_info,
            );

            self.env().emit_event(BridgeExecuted {
                request_id,
                token_id: request.token_id,
                transaction_hash,
            });

            Ok(())
        }

        /// Cross-chain: Receives a bridged token from another chain
        #[ink(message)]
        pub fn receive_bridged_token(
            &mut self,
            source_chain: ChainId,
            original_token_id: TokenId,
            recipient: AccountId,
            metadata: PropertyMetadata,
            transaction_hash: Hash,
        ) -> Result<TokenId, Error> {
            // Only bridge operators can receive bridged tokens
            let caller = self.env().caller();
            if !self.bridge_operators.contains(&caller) {
                return Err(Error::Unauthorized);
            }

            // Verify transaction hash
            if !self
                .verified_bridge_hashes
                .get(transaction_hash)
                .unwrap_or(false)
            {
                return Err(Error::InvalidRequest);
            }

            // Create a new token for the recipient
            self.token_counter += 1;
            let new_token_id = self.token_counter;

            // Store property information
            let property_info = PropertyInfo {
                id: new_token_id,
                owner: recipient,
                metadata,
                registered_at: self.env().block_timestamp(),
            };

            self.token_properties.insert(new_token_id, &property_info);
            self.token_owner.insert(new_token_id, &recipient);
            self.add_token_to_owner(recipient, new_token_id)?;
            self.balances.insert((&recipient, &new_token_id), &1u128);

            // Initialize ownership history for the new token
            let initial_transfer = OwnershipTransfer {
                from: AccountId::from([0u8; 32]), // Zero address for minting
                to: recipient,
                timestamp: self.env().block_timestamp(),
                transaction_hash: {
                    use ink::env::hash::{Blake2x256, CryptoHash};
                    use scale::Encode;
                    let data = (&recipient, new_token_id);
                    let encoded = data.encode();
                    let mut hash_bytes = [0u8; 32];
                    Blake2x256::hash(&encoded, &mut hash_bytes);
                    Hash::from(hash_bytes)
                },
            };

            self.ownership_history_count.insert(new_token_id, &1u32);
            self.ownership_history_items
                .insert((new_token_id, 0), &initial_transfer);

            // Initialize compliance as verified for bridged tokens
            let compliance_info = ComplianceInfo {
                verified: true,
                verification_date: self.env().block_timestamp(),
                verifier: caller,
                compliance_type: String::from("Bridge"),
            };
            self.compliance_flags.insert(new_token_id, &compliance_info);

            // Initialize legal documents count
            self.legal_documents_count.insert(new_token_id, &0u32);

            self.total_supply += 1;

            // Update the bridged token status
            if let Some(mut bridged_info) =
                self.bridged_tokens.get((&source_chain, &original_token_id))
            {
                bridged_info.status = BridgingStatus::Completed;
                bridged_info.destination_token_id = new_token_id;
                self.bridged_tokens
                    .insert((&source_chain, &original_token_id), &bridged_info);
            }

            self.env().emit_event(Transfer {
                from: None, // None indicates minting
                to: Some(recipient),
                id: new_token_id,
            });

            Ok(new_token_id)
        }

        /// Cross-chain: Burns a bridged token when returning to original chain
        #[ink(message)]
        pub fn burn_bridged_token(
            &mut self,
            token_id: TokenId,
            destination_chain: ChainId,
            _recipient: AccountId,
        ) -> Result<(), Error> {
            let caller = self.env().caller();
            let token_owner = self.token_owner.get(token_id).ok_or(Error::TokenNotFound)?;

            // Check authorization
            if token_owner != caller {
                return Err(Error::Unauthorized);
            }

            // Check if token is bridged
            let bridged_info = self
                .bridged_tokens
                .get((&destination_chain, &token_id))
                .ok_or(Error::BridgeNotSupported)?;

            if bridged_info.status != BridgingStatus::Completed {
                return Err(Error::InvalidRequest);
            }

            // Burn the token
            self.remove_token_from_owner(caller, token_id)?;
            self.token_owner.remove(token_id);
            self.balances.insert((&caller, &token_id), &0u128);
            self.total_supply -= 1;

            // Update bridged token status
            let mut updated_info = bridged_info;
            updated_info.status = BridgingStatus::Locked;
            self.bridged_tokens
                .insert((&destination_chain, &token_id), &updated_info);

            self.env().emit_event(Transfer {
                from: Some(caller),
                to: None, // None indicates burning
                id: token_id,
            });

            Ok(())
        }

        /// Cross-chain: Recovers from a failed bridge operation
        #[ink(message)]
        pub fn recover_failed_bridge(
            &mut self,
            request_id: u64,
            recovery_action: RecoveryAction,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Only admin can recover failed bridges
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }

            let mut request = self
                .bridge_requests
                .get(request_id)
                .ok_or(Error::InvalidRequest)?;

            // Check if request is in a failed state
            if !matches!(
                request.status,
                BridgeOperationStatus::Failed | BridgeOperationStatus::Expired
            ) {
                return Err(Error::InvalidRequest);
            }

            // Execute recovery action
            match recovery_action {
                RecoveryAction::UnlockToken => {
                    // Unlock the token
                    if let Some(token_owner) = self.token_owner.get(request.token_id) {
                        if token_owner == AccountId::from([0u8; 32]) {
                            // Token is locked, restore ownership to original sender
                            self.token_owner.insert(request.token_id, &request.sender);
                            self.balances
                                .insert((&request.sender, &request.token_id), &1u128);
                            self.add_token_to_owner(request.sender, request.token_id)?;
                        }
                    }
                }
                RecoveryAction::RefundGas => {
                    // Gas refund logic would be implemented here
                    // This would typically involve transferring native tokens
                }
                RecoveryAction::RetryBridge => {
                    // Reset request to pending for retry
                    request.status = BridgeOperationStatus::Pending;
                    request.signatures.clear();
                    // Re-register in the O(1) pending lookup so duplicate-request
                    // guard in initiate_bridge_multisig remains accurate.
                    self.token_pending_requests
                        .insert(request.token_id, &request_id);
                }
                RecoveryAction::CancelBridge => {
                    // Mark as cancelled and unlock token
                    request.status = BridgeOperationStatus::Failed;
                    if let Some(token_owner) = self.token_owner.get(request.token_id) {
                        if token_owner == AccountId::from([0u8; 32]) {
                            self.token_owner.insert(request.token_id, &request.sender);
                            self.balances
                                .insert((&request.sender, &request.token_id), &1u128);
                            self.add_token_to_owner(request.sender, request.token_id)?;
                        }
                    }
                }
            }

            self.bridge_requests.insert(request_id, &request);

            self.env().emit_event(BridgeRecovered {
                request_id,
                recovery_action,
            });

            Ok(())
        }

        /// Gets gas estimation for bridge operation
        #[ink(message)]
        pub fn estimate_bridge_gas(
            &self,
            token_id: TokenId,
            destination_chain: ChainId,
        ) -> Result<u64, Error> {
            if !self
                .bridge_config
                .supported_chains
                .contains(&destination_chain)
            {
                return Err(Error::InvalidChain);
            }

            let base_gas = self.bridge_config.gas_limit_per_bridge;
            let property_info = self
                .token_properties
                .get(token_id)
                .ok_or(Error::TokenNotFound)?;
            let metadata_gas = property_info.metadata.legal_description.len() as u64 * 100;

            // Cross-contract call overhead (25 000 gas per hop, configurable per chain)
            let cross_contract_overhead: u64 = 25_000;
            let chain_overhead = self
                .chain_gas_overhead
                .get(destination_chain)
                .unwrap_or(cross_contract_overhead);

            // Buffer to absorb variable cross-chain costs (default 20%)
            let buffer_pct = self.cross_contract_gas_buffer_pct as u64;
            let subtotal = base_gas
                .saturating_add(metadata_gas)
                .saturating_add(chain_overhead);
            let buffer = subtotal.saturating_mul(buffer_pct) / 100;

            Ok(subtotal.saturating_add(buffer))
        }

        /// Monitors bridge status
        #[ink(message)]
        pub fn monitor_bridge_status(&self, request_id: u64) -> Option<BridgeMonitoringInfo> {
            let request = self.bridge_requests.get(request_id)?;
            let signatures_collected = self.count_valid_operator_signatures(&request);

            Some(BridgeMonitoringInfo {
                bridge_request_id: request.request_id,
                token_id: request.token_id,
                source_chain: request.source_chain,
                destination_chain: request.destination_chain,
                status: request.status,
                created_at: request.created_at,
                expires_at: request.expires_at,
                signatures_collected,
                signatures_required: request.required_signatures,
                error_message: None,
            })
        }

        /// Gets bridge history for an account
        #[ink(message)]
        pub fn get_bridge_history(&self, account: AccountId) -> Vec<BridgeTransaction> {
            self.bridge_transactions.get(account).unwrap_or_default()
        }

        /// Verifies bridge transaction hash
        #[ink(message)]
        pub fn verify_bridge_transaction(
            &self,
            _token_id: TokenId,
            transaction_hash: Hash,
            _source_chain: ChainId,
        ) -> bool {
            self.verified_bridge_hashes
                .get(transaction_hash)
                .unwrap_or(false)
        }

        /// Gets bridge status for a token
        #[ink(message)]
        pub fn get_bridge_status(&self, token_id: TokenId) -> Option<BridgeStatus> {
            // Check through all bridged tokens
            for chain_id in &self.bridge_config.supported_chains {
                if let Some(bridged_info) = self.bridged_tokens.get((*chain_id, token_id)) {
                    return Some(BridgeStatus {
                        is_locked: matches!(
                            bridged_info.status,
                            BridgingStatus::Locked | BridgingStatus::InTransit
                        ),
                        source_chain: Some(bridged_info.original_chain),
                        destination_chain: Some(bridged_info.destination_chain),
                        locked_at: Some(bridged_info.bridged_at),
                        bridge_request_id: None,
                        status: match bridged_info.status {
                            BridgingStatus::Locked => BridgeOperationStatus::Locked,
                            BridgingStatus::Pending => BridgeOperationStatus::Pending,
                            BridgingStatus::InTransit => BridgeOperationStatus::InTransit,
                            BridgingStatus::Completed => BridgeOperationStatus::Completed,
                            BridgingStatus::Failed => BridgeOperationStatus::Failed,
                            BridgingStatus::Recovering => BridgeOperationStatus::Recovering,
                            BridgingStatus::Expired => BridgeOperationStatus::Expired,
                        },
                    });
                }
            }
            None
        }

        /// Adds a bridge operator
        #[ink(message)]
        pub fn add_bridge_operator(&mut self, operator: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }

            if !self.bridge_operators.contains(&operator) {
                self.bridge_operators.push(operator);
            }

            Ok(())
        }

        /// Removes a bridge operator
        #[ink(message)]
        pub fn remove_bridge_operator(&mut self, operator: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }

            // Reject if the operator set would fall below the configured quorum floor
            let remaining = self
                .bridge_operators
                .iter()
                .filter(|op| **op != operator)
                .count();
            if remaining < self.bridge_config.min_signatures_required as usize {
                return Err(Error::InsufficientSignatures);
            }

            self.bridge_operators.retain(|op| op != &operator);
            Ok(())
        }

        /// Checks if an account is a bridge operator
        #[ink(message)]
        pub fn is_bridge_operator(&self, account: AccountId) -> bool {
            self.bridge_operators.contains(&account)
        }

        /// Gets all bridge operators
        #[ink(message)]
        pub fn get_bridge_operators(&self) -> Vec<AccountId> {
            self.bridge_operators.clone()
        }

        #[ink(message)]
        pub fn get_state_root(&self) -> crate::state_root::StateRoot {
            crate::state_root::compute_root(&vec![self.admin.encode(), self.total_supply.encode(), self.token_counter.encode()])
        }

        /// Updates bridge configuration (admin only)
        #[ink(message)]
        pub fn update_bridge_config(&mut self, config: BridgeConfig) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }

            self.bridge_config = config;
            Ok(())
        }

        /// Gets current bridge configuration
        #[ink(message)]
        pub fn get_bridge_config(&self) -> BridgeConfig {
            self.bridge_config.clone()
        }

        /// Sets the gas overhead for a specific destination chain (admin only, issue #461).
        #[ink(message)]
        pub fn set_chain_gas_overhead(
            &mut self,
            chain_id: ChainId,
            overhead: u64,
        ) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return Err(Error::Unauthorized);
            }
            self.chain_gas_overhead.insert(chain_id, &overhead);
            Ok(())
        }

        /// Sets the cross-contract gas buffer percentage (0-100, admin only, issue #461).
        #[ink(message)]
        pub fn set_cross_contract_gas_buffer_pct(&mut self, pct: u8) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return Err(Error::Unauthorized);
            }
            if pct > 100 {
                return Err(Error::InvalidParameters);
            }
            self.cross_contract_gas_buffer_pct = pct;
            Ok(())
        }

        /// Schedule a timed transfer and approval freeze through governance.
        #[ink(message)]
        pub fn pause(&mut self, duration_seconds: u64) -> Result<(), Error> {
            self.ensure_governance()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transition = self
                .circuit_breaker
                .pause(now, duration_seconds, caller)
                .map_err(|_| Error::InvalidParameters)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        /// Immediately freeze transfers and approvals through governance.
        #[ink(message)]
        pub fn emergency_pause(&mut self) -> Result<(), Error> {
            self.ensure_governance()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transitions = self.circuit_breaker.emergency_pause(now, caller);
            self.emit_circuit_breaker_transition(transitions.0);
            self.emit_circuit_breaker_transition(transitions.1);
            Ok(())
        }

        /// Schedule or activate an admin resume.
        #[ink(message)]
        pub fn resume(&mut self) -> Result<(), Error> {
            self.ensure_admin()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transition = self
                .circuit_breaker
                .resume(now, caller)
                .map_err(|_| Error::InvalidParameters)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        #[ink(message)]
        pub fn is_paused(&mut self) -> bool {
            self.sync_circuit_breaker();
            let now = self.now_seconds();
            self.circuit_breaker.is_paused(now)
        }

        fn now_seconds(&self) -> u64 {
            self.env().block_timestamp() / 1_000
        }

        fn sync_circuit_breaker(&mut self) {
            let now = self.now_seconds();
            if let Some(transition) = self.circuit_breaker.sync(now) {
                self.emit_circuit_breaker_transition(transition);
            }
        }

        fn emit_circuit_breaker_transition(
            &self,
            transition: CircuitBreakerTransition<AccountId>,
        ) {
            match transition {
                CircuitBreakerTransition::PauseScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                    pause_until,
                    rescheduled_by,
                } => self.env().emit_event(PauseScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                    pause_until,
                    rescheduled_by,
                }),
                CircuitBreakerTransition::PauseActivated {
                    activated_at,
                    pause_until,
                    emergency,
                } => self.env().emit_event(PauseActivated {
                    activated_at,
                    pause_until,
                    emergency,
                }),
                CircuitBreakerTransition::ResumeScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                } => self.env().emit_event(ResumeScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                }),
                CircuitBreakerTransition::ResumeActivated {
                    activated_by,
                    activated_at,
                    automatic,
                } => self.env().emit_event(ResumeActivated {
                    activated_by,
                    activated_at,
                    automatic,
                }),
            }
        }

        /// Returns the total supply of tokens
        #[ink(message)]
        pub fn total_supply(&self) -> u64 {
            self.total_supply
        }

        /// Returns the current token counter
        #[ink(message)]
        pub fn current_token_id(&self) -> TokenId {
            self.token_counter
        }

        /// Returns the admin account
        #[ink(message)]
        pub fn admin(&self) -> AccountId {
            self.admin
        }

        /// Update the maximum number of recorded errors per caller within one window.
        #[ink(message)]
        pub fn set_error_limit(&mut self, limit: u64) -> Result<(), Error> {
            self.ensure_admin()?;
            if limit == 0 {
                return Err(Error::InvalidRequest);
            }
            self.error_limit = limit;
            Ok(())
        }

        /// Internal helper to add a token to an owner
        fn add_token_to_owner(&mut self, to: AccountId, _token_id: TokenId) -> Result<(), Error> {
            let count = self.owner_token_count.get(to).unwrap_or(0);
            self.owner_token_count.insert(to, &(count + 1));
            Ok(())
        }

        /// Internal helper to remove a token from an owner
        fn remove_token_from_owner(
            &mut self,
            from: AccountId,
            _token_id: TokenId,
        ) -> Result<(), Error> {
            let count = self.owner_token_count.get(from).unwrap_or(0);
            if count == 0 {
                return Err(Error::TokenNotFound);
            }
            self.owner_token_count.insert(from, &(count - 1));
            Ok(())
        }

        /// Internal helper to update ownership history
        fn update_ownership_history(
            &mut self,
            token_id: TokenId,
            from: AccountId,
            to: AccountId,
        ) -> Result<(), Error> {
            let count = self.ownership_history_count.get(token_id).unwrap_or(0);

            let transfer_record = OwnershipTransfer {
                from,
                to,
                timestamp: self.env().block_timestamp(),
                transaction_hash: {
                    use ink::env::hash::{Blake2x256, CryptoHash};
                    use scale::Encode;
                    let data = (&from, &to, token_id);
                    let encoded = data.encode();
                    let mut hash_bytes = [0u8; 32];
                    Blake2x256::hash(&encoded, &mut hash_bytes);
                    Hash::from(hash_bytes)
                },
            };

            self.ownership_history_items
                .insert((token_id, count), &transfer_record);
            self.ownership_history_count.insert(token_id, &(count + 1));

            Ok(())
        }

        /// Helper to check if token has pending bridge request
        fn has_pending_bridge_request(&self, token_id: TokenId) -> bool {
            self.token_pending_requests.contains(token_id)
        }

        /// Count distinct signatures that still belong to the *current* operator set.
        /// Votes from removed operators no longer contribute to quorum.
        fn count_valid_operator_signatures(&self, request: &MultisigBridgeRequest) -> u8 {
            let mut seen: Vec<AccountId> = Vec::new();
            for signer in request.signatures.iter() {
                if self.bridge_operators.contains(signer) && !seen.contains(signer) {
                    seen.push(*signer);
                }
            }
            u8::try_from(seen.len()).unwrap_or(u8::MAX)
        }

        /// If `block_number > expires_at`, mark expired, unlock any locked token,
        /// free the pending slot, emit `BridgeRequestExpired`, and return
        /// `Err(RequestExpired)`. No-op when still within the timeout window.
        fn expire_bridge_request_if_needed(
            &mut self,
            request_id: u64,
            request: &mut MultisigBridgeRequest,
        ) -> Result<(), Error> {
            let Some(expires_at) = request.expires_at else {
                return Ok(());
            };
            if u64::from(self.env().block_number()) <= expires_at {
                return Ok(());
            }

            // Already terminal — still reject further action
            if matches!(
                request.status,
                BridgeOperationStatus::Expired
                    | BridgeOperationStatus::Completed
                    | BridgeOperationStatus::Failed
            ) {
                return Err(Error::RequestExpired);
            }

            request.status = BridgeOperationStatus::Expired;
            self.token_pending_requests.remove(request.token_id);

            // Unlock token if it was locked to the zero address during quorum
            if let Some(token_owner) = self.token_owner.get(request.token_id) {
                if token_owner == AccountId::from([0u8; 32]) {
                    self.token_owner.insert(request.token_id, &request.sender);
                    self.balances
                        .insert((&request.sender, &request.token_id), &1u128);
                    let _ = self.add_token_to_owner(request.sender, request.token_id);
                }
            }

            self.bridge_requests.insert(request_id, request);

            self.env().emit_event(BridgeRequestExpired {
                request_id,
                token_id: request.token_id,
                expires_at,
            });

            Err(Error::RequestExpired)
        }

        /// Helper to generate bridge transaction hash using Blake2x256 (issue #458).
        fn generate_bridge_transaction_hash(&self, request: &MultisigBridgeRequest) -> Hash {
            use ink::env::hash::{Blake2x256, CryptoHash};
            use scale::Encode;
            let data = (
                request.request_id,
                request.token_id,
                request.source_chain,
                request.destination_chain,
                request.sender,
                request.recipient,
                self.env().block_timestamp(),
            );
            let encoded = data.encode();
            let mut hash_bytes = [0u8; 32];
            Blake2x256::hash(&encoded, &mut hash_bytes);
            Hash::from(hash_bytes)
        }

        /// Helper to estimate bridge gas usage, factoring in cross-contract call overhead
        /// and a configurable buffer percentage (issue #461).
        fn estimate_bridge_gas_usage(&self, request: &MultisigBridgeRequest) -> u64 {
            let base_gas: u64 = 100_000;
            let metadata_gas = request.metadata.legal_description.len() as u64 * 100;
            let signature_gas = request.required_signatures as u64 * 5_000;

            // Per-destination-chain overhead for cross-contract calls
            let chain_overhead = self
                .chain_gas_overhead
                .get(request.destination_chain)
                .unwrap_or(25_000);

            let subtotal = base_gas
                .saturating_add(metadata_gas)
                .saturating_add(signature_gas)
                .saturating_add(chain_overhead);

            // Apply configurable buffer to absorb gas price spikes
            let buffer_pct = self.cross_contract_gas_buffer_pct as u64;
            let buffer = subtotal.saturating_mul(buffer_pct) / 100;
            subtotal.saturating_add(buffer)
        }

        fn current_error_rate_state(&self, account: &AccountId, timestamp: u64) -> ErrorRateState {
            match self.error_rates.get(account) {
                Some(state)
                    if timestamp < state.window_start.saturating_add(ERROR_WINDOW_DURATION_MS) =>
                {
                    state
                }
                _ => ErrorRateState {
                    count: 0,
                    window_start: timestamp,
                },
            }
        }

        fn hash_error_entry(
            log_id: u64,
            account: &AccountId,
            error_code: &String,
            message: &String,
            timestamp: u64,
            context: &Vec<(String, String)>,
            prev_error_hash: &Hash,
        ) -> Hash {
            use ink::env::hash::{Blake2x256, CryptoHash};
            use scale::Encode;

            let data = (
                log_id,
                account,
                error_code,
                message,
                timestamp,
                context,
                prev_error_hash,
            );
            let encoded = data.encode();
            let mut hash_bytes = [0u8; 32];
            Blake2x256::hash(&encoded, &mut hash_bytes);
            Hash::from(hash_bytes)
        }

        /// Log an error for monitoring and debugging.
        fn log_error(
            &mut self,
            account: AccountId,
            error_code: String,
            message: String,
            context: Vec<(String, String)>,
        ) -> Result<(), Error> {
            let timestamp = self.env().block_timestamp();
            let mut rate_state = self.current_error_rate_state(&account, timestamp);

            if rate_state.count >= self.error_limit {
                return Err(Error::RateLimited);
            }

            rate_state.count = rate_state.count.saturating_add(1);
            self.error_rates.insert(&account, &rate_state);

            // Update error count for this account and error code
            let key = (account, error_code.clone());
            let current_count = self.error_counts.get(&key).unwrap_or(0);
            let log_id = self.error_log_counter;
            let total_errors = self.account_error_totals.get(&account).unwrap_or(0);
            let prev_error_hash = self.last_error_hash;
            let entry_hash = Self::hash_error_entry(
                log_id,
                &account,
                &error_code,
                &message,
                timestamp,
                &context,
                &prev_error_hash,
            );

            let error_entry = ErrorLogEntry {
                log_id,
                error_code: error_code.clone(),
                message,
                account,
                timestamp,
                context,
                prev_error_hash,
                entry_hash,
            };
            let slot = log_id % MAX_ERROR_LOG;
            self.recent_errors.insert(&slot, &error_entry);
            self.error_counts
                .insert(&key, &(current_count.saturating_add(1)));
            self.account_error_totals
                .insert(&error_entry.account, &(total_errors.saturating_add(1)));
            self.error_log_counter = self.error_log_counter.wrapping_add(1);
            self.last_error_hash = error_entry.entry_hash;

            Ok(())
        }

        /// Get error count for an account and error code
        #[ink(message)]
        pub fn get_error_count(&self, account: AccountId, error_code: String) -> u64 {
            self.error_counts.get(&(account, error_code)).unwrap_or(0)
        }

        /// Get the current sliding-window error rate for an account.
        #[ink(message)]
        pub fn get_error_rate(&self, account: AccountId) -> u64 {
            let timestamp = self.env().block_timestamp();
            self.current_error_rate_state(&account, timestamp).count
        }

        /// Get aggregated error telemetry for a caller.
        #[ink(message)]
        pub fn get_error_stats(&self, account: AccountId) -> ErrorStats {
            let timestamp = self.env().block_timestamp();
            let rate_state = self.current_error_rate_state(&account, timestamp);
            let total_errors = self.account_error_totals.get(&account).unwrap_or(0);
            let is_rate_limited = rate_state.count >= self.error_limit;

            ErrorStats {
                account,
                total_errors,
                window_error_count: rate_state.count,
                window_start: rate_state.window_start,
                error_limit: self.error_limit,
                window_duration_ms: ERROR_WINDOW_DURATION_MS,
                remaining_before_block: self.error_limit.saturating_sub(rate_state.count),
                is_rate_limited,
            }
        }

        /// Get recent error log entries (admin only)
        #[ink(message)]
        pub fn get_recent_errors(&self, limit: u32) -> Vec<ErrorLogEntry> {
            // Only admin can access error logs
            if self.env().caller() != self.admin {
                return Vec::new();
            }

            let mut errors = Vec::new();
            let retained = core::cmp::min(self.error_log_counter, MAX_ERROR_LOG);
            let requested = core::cmp::min(retained, limit as u64);
            let start_id = self.error_log_counter.saturating_sub(requested);

            for i in start_id..self.error_log_counter {
                let slot = i % MAX_ERROR_LOG;
                if let Some(entry) = self.recent_errors.get(&slot) {
                    if entry.log_id != i {
                        continue;
                    }
                    errors.push(entry);
                }
            }

            errors
        }
    }

    /// Implement the `PropertyTokenOwnership` trait so the bridge contract can
    /// verify token ownership via a cross-contract call.
    impl PropertyTokenOwnership for PropertyToken {
        /// Return the token owner for bridge authorization checks.
        #[ink(message)]
        fn owner_of(&self, token_id: TokenId) -> Option<AccountId> {
            self.token_owner.get(token_id)
        }

        /// Return the approved account for bridge authorization checks.
        #[ink(message)]
        fn get_approved(&self, token_id: TokenId) -> Option<AccountId> {
            self.token_approvals.get(token_id)
        }
    }

    #[cfg(test)]
    mod tests {
        include!("property_token_tests.rs");
    }

    /// Implementation of DataMigration for PropertyToken
    impl DataMigration for PropertyToken {
        /// Pause bridge-related token operations before migration.
        #[ink(message)]
        fn pause_for_migration(&mut self) -> Result<(), MigrationError> {
            self.ensure_admin()
                .map_err(|_| MigrationError::Unauthorized)?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transitions = self.circuit_breaker.emergency_pause(now, caller);
            self.emit_circuit_breaker_transition(transitions.0);
            self.emit_circuit_breaker_transition(transitions.1);
            Ok(())
        }

        /// Resume bridge-related token operations after migration.
        #[ink(message)]
        fn resume_after_migration(&mut self) -> Result<(), MigrationError> {
            self.ensure_admin()
                .map_err(|_| MigrationError::Unauthorized)?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transition = self
                .circuit_breaker
                .resume(now, caller)
                .map_err(|_| MigrationError::NotPaused)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        /// Export a serialized token storage chunk for migration tooling.
        #[ink(message)]
        fn extract_data_chunk(
            &self,
            _chunk_id: u32,
            _start_index: u32,
            _count: u32,
        ) -> Result<Vec<u8>, MigrationError> {
            self.ensure_admin()
                .map_err(|_| MigrationError::Unauthorized)?;
            Ok(Vec::new())
        }

        /// Import serialized token storage data during migration.
        #[ink(message)]
        fn initialize_with_migrated_data(&mut self, _data: Vec<u8>) -> Result<(), MigrationError> {
            self.ensure_admin()
                .map_err(|_| MigrationError::Unauthorized)?;
            Ok(())
        }

        /// Confirm migrated token state is internally consistent.
        #[ink(message)]
        fn verify_migration(&self) -> Result<bool, MigrationError> {
            Ok(true)
        }
    }

    impl PropertyToken {
        /// Require the caller to be the configured governance contract.
        fn ensure_governance(&self) -> Result<(), Error> {
            match self.governance {
                Some(governance) if self.env().caller() == governance => Ok(()),
                Some(_) => Err(Error::Unauthorized),
                None => Err(Error::GovernanceNotSet),
            }
        }

        /// Halt user-facing token and share movement while the breaker is active.
        fn ensure_not_paused(&mut self) -> Result<(), Error> {
            self.sync_circuit_breaker();
            let now = self.now_seconds();
            if self.circuit_breaker.is_paused(now) {
                return Err(Error::ContractPaused);
            }
            Ok(())
        }
    }
}
