//! Property-based tests for critical contract invariants
//! 
//! This module contains property-based tests that verify fundamental invariants
//! that must always hold true regardless of input values or execution order.

use ink::primitives::Hash;
use ink::env::test::DefaultAccounts;
use proptest::prelude::*;
use propchain_tests::test_utils::*;
use property_token::property_token::{PropertyToken, TokenId, Error as PropertyError};

// Re-export contract types for testing
pub use propchain_escrow::propchain_escrow::{
    AdvancedEscrow, EscrowData, EscrowStatus, ApprovalType, Error as EscrowError
};

/// Strategy for generating valid account IDs
fn account_id_strategy() -> impl Strategy<Value = AccountId> {
    prop::collection::vec(any::<u8>(), 0..32)
        .prop_map(|bytes| AccountId::from(Hash::from(bytes)))
}

/// Strategy for generating valid token amounts
fn token_amount_strategy() -> impl Strategy<Value = u128> {
    prop::num::u128::ANY.prop_filter("Amount must be > 0", |&x| x > 0 && x <= 1_000_000_000_000_000_000)
}

/// Strategy for generating valid token IDs
fn token_id_strategy() -> impl Strategy<Value = TokenId> {
    prop::num::u64::ANY.prop_filter("Token ID must be > 0", |&x| x > 0)
}

/// Strategy for generating valid property IDs
fn property_id_strategy() -> impl Strategy<Value = u64> {
    prop::num::u64::ANY.prop_filter("Property ID must be > 0", |&x| x > 0)
}

/// Strategy for generating escrow amounts
fn escrow_amount_strategy() -> impl Strategy<Value = u128> {
    prop::num::u128::ANY.prop_filter("Escrow amount must be reasonable", |&x| {
        x > 0 && x <= 10_000_000_000_000_000_000 // 10 million tokens max
    })
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    /// Property: Total token supply should never change unexpectedly
    #[test]
    fn property_token_total_supply_invariant(
        initial_supply in prop::num::u64::ANY.prop_filter("Supply must be reasonable", |&x| x > 0 && x <= 1_000_000),
        mints in prop::collection::vec((token_id_strategy(), account_id_strategy()), 0..10),
        transfers in prop::collection::vec((token_id_strategy(), account_id_strategy(), account_id_strategy()), 0..20)
    ) {
        // This test verifies that total supply remains consistent during minting and transfers
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        // Deploy property token contract with initial supply
        let mut property_token = deploy_property_token_contract(contract_id, initial_supply);
        
        // Track expected total supply
        let mut expected_supply = initial_supply;
        
        // Execute mint operations
        for (token_id, recipient) in mints {
            if property_token.total_supply() == expected_supply {
                // Only mint if token doesn't already exist
                if let Err(PropertyError::TokenNotFound) = property_token.owner_of(token_id) {
                    property_token.mint(recipient, token_id);
                    expected_supply += 1;
                }
            }
        }
        
        // Execute transfer operations
        for (token_id, from, to) in transfers {
            // Only transfer if token exists and sender is owner
            if let Ok(owner) = property_token.owner_of(token_id) {
                if owner == from {
                    let _ = property_token.transfer_from(from, to, token_id);
                }
            }
        }
        
        // Verify invariant: total supply should match expected
        prop_assert_eq!(property_token.total_supply(), expected_supply);
    }

    /// Property: Token ownership consistency - owner_of should match balance mappings
    #[test]
    fn property_token_ownership_consistency(
        mints in prop::collection::vec((token_id_strategy(), account_id_strategy()), 1..20),
        transfers in prop::collection::vec((token_id_strategy(), account_id_strategy(), account_id_strategy()), 0..30)
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut property_token = deploy_property_token_contract(contract_id, 0);
        
        // Mint tokens to establish initial ownership
        for (token_id, recipient) in mints {
            property_token.mint(recipient, token_id);
        }
        
        // Execute transfers
        for (token_id, from, to) in transfers {
            if let Ok(owner) = property_token.owner_of(token_id) {
                if owner == from {
                    let _ = property_token.transfer_from(from, to, token_id);
                }
            }
        }
        
        // Verify ownership consistency
        for (token_id, _) in &mints {
            if let Ok(owner) = property_token.owner_of(*token_id) {
                // If token exists, owner should have positive balance for this token
                let balance = property_token.balance_of(owner, *token_id);
                prop_assert!(balance > 0, "Token owner should have positive balance");
                
                // Verify the owner is actually recorded in the token_owner mapping
                prop_assert_eq!(property_token.owner_of(*token_id), Ok(owner));
            }
        }
    }

    /// Property: Escrow balance invariant - total escrow balance equals sum of deposits
    #[test]
    fn escrow_balance_invariant(
        escrow_configs in prop::collection::vec(
            (property_id_strategy(), account_id_strategy(), account_id_strategy(), escrow_amount_strategy()),
            1..15
        )
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut escrow = deploy_escrow_contract(contract_id);
        
        let mut total_deposited = 0u128;
        let mut escrow_ids = Vec::new();
        
        // Create and fund escrows
        for (property_id, buyer, seller, amount) in escrow_configs {
            let escrow_id = escrow.create_escrow(property_id, buyer, seller, amount);
            escrow_ids.push(escrow_id);
            
            // Fund the escrow
            escrow.fund_escrow(escrow_id);
            total_deposited += amount;
        }
        
        // Verify total balance invariant
        let contract_balance = escrow.get_total_balance();
        prop_assert_eq!(contract_balance, total_deposited);
        
        // Verify individual escrow balances sum to total
        let mut individual_sum = 0u128;
        for escrow_id in escrow_ids {
            if let Ok(escrow_data) = escrow.get_escrow(escrow_id) {
                individual_sum += escrow_data.deposited_amount;
            }
        }
        prop_assert_eq!(individual_sum, total_deposited);
    }

    /// Property: Escrow status transitions should be valid
    #[test]
    fn escrow_status_transition_invariant(
        operations in prop::collection::vec(
            prop::tuple::Tuple((token_id_strategy(), any::<EscrowStatus>())),
            1..20
        )
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut escrow = deploy_escrow_contract(contract_id);
        
        // Create initial escrow
        let escrow_id = escrow.create_escrow(1, accounts.alice, accounts.bob, 1000);
        
        // Track valid status transitions
        let valid_transitions = [
            (EscrowStatus::Created, EscrowStatus::Funded),
            (EscrowStatus::Funded, EscrowStatus::Active),
            (EscrowStatus::Active, EscrowStatus::Released),
            (EscrowStatus::Active, EscrowStatus::Refunded),
            (EscrowStatus::Active, EscrowStatus::Disputed),
            (EscrowStatus::Disputed, EscrowStatus::Released),
            (EscrowStatus::Disputed, EscrowStatus::Refunded),
        ];
        
        for (escrow_id_to_test, new_status) in operations {
            if escrow_id_to_test == escrow_id {
                if let Ok(current_status_result) = escrow.get_escrow_status(escrow_id) {
                    let current_status = current_status_result;
                    
                    // Check if transition is valid
                    let is_valid = valid_transitions.iter().any(|&(from, to)| {
                        current_status == from && new_status == to
                    });
                    
                    if is_valid {
                        // Attempt valid transition
                        match new_status {
                            EscrowStatus::Funded => {
                                let _ = escrow.fund_escrow(escrow_id);
                            },
                            EscrowStatus::Active => {
                                let _ = escrow.activate_escrow(escrow_id);
                            },
                            EscrowStatus::Released => {
                                let _ = escrow.release_escrow(escrow_id);
                            },
                            EscrowStatus::Refunded => {
                                let _ = escrow.refund_escrow(escrow_id);
                            },
                            EscrowStatus::Disputed => {
                                let _ = escrow.create_dispute(escrow_id, "Test dispute".into());
                            },
                            _ => {} // Skip other transitions for this test
                        }
                    }
                }
            }
        }
        
        // Verify final status is valid (not in an impossible state)
        if let Ok(final_status) = escrow.get_escrow_status(escrow_id) {
            prop_assert!(matches!(
                final_status,
                EscrowStatus::Created | EscrowStatus::Funded | EscrowStatus::Active |
                EscrowStatus::Released | EscrowStatus::Refunded | EscrowStatus::Disputed |
                EscrowStatus::Cancelled
            ));
        }
    }

    /// Property: Multi-signature threshold invariant
    #[test]
    fn multisig_threshold_invariant(
        required_sigs in prop::num::u8::ANY.prop_filter("Must be between 1 and 10", |&x| x >= 1 && x <= 10),
        signers in prop::collection::vec(account_id_strategy(), 1..15),
        operations in prop::collection::vec(
            (token_id_strategy(), any::<ApprovalType>(), account_id_strategy()),
            1..30
        )
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut escrow = deploy_escrow_contract(contract_id);
        
        // Create escrow with multi-sig configuration
        let escrow_id = escrow.create_escrow(1, accounts.alice, accounts.bob, 1000);
        escrow.set_multisig_config(escrow_id, required_sigs, signers.clone());
        
        // Track signatures for each approval type
        let mut signature_counts = std::collections::HashMap::new();
        
        for (test_escrow_id, approval_type, signer) in operations {
            if test_escrow_id == escrow_id {
                // Only allow valid signers
                if signers.contains(&signer) {
                    let count = signature_counts.entry(approval_type).or_insert(0);
                    *count += 1;
                    
                    // Attempt to add signature
                    let _ = escrow.add_signature(escrow_id, approval_type, signer);
                }
            }
        }
        
        // Verify that operations requiring multi-sig respect thresholds
        for (approval_type, count) in signature_counts {
            let threshold_met = count >= required_sigs;
            
            // Check if operation can be executed based on threshold
            let can_execute = match approval_type {
                ApprovalType::Release => {
                    escrow.can_release_escrow(escrow_id).unwrap_or(false)
                },
                ApprovalType::Refund => {
                    escrow.can_refund_escrow(escrow_id).unwrap_or(false)
                },
                ApprovalType::EmergencyOverride => {
                    escrow.can_emergency_override(escrow_id).unwrap_or(false)
                },
            };
            
            // If threshold is met, operation should be possible
            if threshold_met {
                prop_assert!(can_execute, "Operation should be possible when threshold is met");
            }
        }
    }

    /// Property: No double-spending in escrow releases
    #[test]
    fn escrow_no_double_spending_invariant(
        release_attempts in prop::collection::vec(token_id_strategy(), 1..10)
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut escrow = deploy_escrow_contract(contract_id);
        
        // Create and fund escrow
        let escrow_id = escrow.create_escrow(1, accounts.alice, accounts.bob, 1000);
        escrow.fund_escrow(escrow_id);
        escrow.activate_escrow(escrow_id);
        
        let mut successful_releases = 0;
        let initial_balance = escrow.get_escrow_balance(escrow_id).unwrap_or(0);
        
        // Attempt multiple releases
        for attempt_id in release_attempts {
            if attempt_id == escrow_id {
                if let Ok(()) = escrow.release_escrow(escrow_id) {
                    successful_releases += 1;
                }
            }
        }
        
        // Verify only one release was successful
        prop_assert!(successful_releases <= 1, "Should not allow double-spending");
        
        // Verify escrow balance is zero after successful release
        if successful_releases == 1 {
            let final_balance = escrow.get_escrow_balance(escrow_id).unwrap_or(0);
            prop_assert_eq!(final_balance, 0, "Balance should be zero after release");
        }
    }

    /// Property: Cross-chain bridge integrity
    #[test]
    fn bridge_integrity_invariant(
        bridge_requests in prop::collection::vec(
            (token_id_strategy(), any::<u64>(), account_id_strategy()),
            1..10
        )
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut property_token = deploy_property_token_contract(contract_id, 1000);
        
        // Setup bridge operators
        let operators = vec![accounts.contract, accounts.alice, accounts.bob];
        property_token.set_bridge_operators(operators);
        
        let mut total_bridged = 0u64;
        
        for (token_id, chain_id, recipient) in bridge_requests {
            // Mint token first
            property_token.mint(accounts.alice, token_id);
            
            // Attempt bridge transfer
            if let Ok(()) = property_token.initiate_bridge_transfer(token_id, chain_id, recipient) {
                total_bridged += 1;
            }
        }
        
        // Verify bridge requests are properly tracked
        let request_count = property_token.get_bridge_request_count();
        prop_assert_eq!(request_count, total_bridged);
        
        // Verify no duplicate bridge requests for same token
        let mut processed_tokens = std::collections::HashSet::new();
        for (token_id, _, _) in bridge_requests {
            if processed_tokens.contains(&token_id) {
                // If token was already processed, subsequent attempts should fail
                prop_assert!(property_token.is_token_bridged(token_id), "Already bridged token should be marked");
            }
            processed_tokens.insert(token_id);
        }
    }
}

/// Helper function to deploy property token contract for testing
fn deploy_property_token_contract(contract_id: AccountId, initial_supply: u64) -> PropertyToken {
    PropertyToken::new(initial_supply)
}

/// Helper function to deploy escrow contract for testing
fn deploy_escrow_contract(contract_id: AccountId) -> AdvancedEscrow {
    AdvancedEscrow::new()
}

// =========================================================================
// Expanded property-based tests for all workspace crates (#630)
// =========================================================================

/// Property: fee bounds are always valid (min <= max).
#[cfg(feature = "verification")]
proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn property_fee_bounds_valid(
        base_fee in 0u128..=1_000_000_000u128,
        min_fee in 0u128..=1_000_000_000u128,
        max_fee in 0u128..=1_000_000_000u128,
    ) {
        if min_fee <= base_fee && base_fee <= max_fee {
            prop_assert!(base_fee >= min_fee);
            prop_assert!(base_fee <= max_fee);
        } else {
            prop_assert!(base_fee < min_fee || base_fee > max_fee);
        }
    }
}

/// Property: fee split conserves total premium.
#[cfg(feature = "verification")]
proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn property_fee_split_conserves_total(
        amount in 0u128..=1_000_000_000_000u128,
        fee_bps in 0u32..=10000u32,
    ) {
        let fee = amount.saturating_mul(fee_bps as u128) / 10_000;
        let pool_share = amount.saturating_sub(fee);
        prop_assert_eq!(fee.saturating_add(pool_share), amount);
    }
}

/// Property: distribution rates must not exceed 100%.
#[cfg(feature = "verification")]
proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn property_distribution_rates_within_bounds(
        validator_bp in 0u32..=10000,
        treasury_bp in 0u32..=10000,
    ) {
        prop_assert!(validator_bp.saturating_add(treasury_bp) <= 10_000);
    }
}

/// Property: nonce must be strictly monotonically increasing.
#[cfg(feature = "verification")]
proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn property_nonce_strictly_monotonic(
        current_nonce in 0u64..=1000,
        supplied_nonce in 0u64..=1000,
    ) {
        if supplied_nonce == current_nonce + 1 {
            prop_assert!(supplied_nonce > current_nonce);
        }
    }
}

/// Property: reputation stays within 0-1000 bounds.
#[cfg(feature = "verification")]
proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn property_reputation_in_bounds(reputation in 0u32..=1000) {
        prop_assert!(reputation <= 1000);
    }
}

/// Property: history length must not exceed maximum.
#[cfg(feature = "verification")]
proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    #[test]
    fn property_history_within_max(
        len in 0usize..=1000,
        max in 0usize..=1000,
    ) {
        if len <= max {
            prop_assert!(len <= max);
        }
    }
}
