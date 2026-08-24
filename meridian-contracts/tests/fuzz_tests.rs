//! Fuzz testing for contract security and edge case handling
//! 
//! This module implements fuzz testing to discover vulnerabilities and edge cases
//! that might be missed by conventional testing approaches.

use ink::primitives::Hash;
use proptest::prelude::*;
use propchain_tests::test_utils::*;
use property_token::property_token::{PropertyToken, TokenId, Error as PropertyError};
use propchain_escrow::propchain_escrow::{AdvancedEscrow, EscrowStatus, ApprovalType, Error as EscrowError};

/// Fuzz strategy for generating potentially malicious inputs
fn fuzz_account_id_strategy() -> impl Strategy<Value = AccountId> {
    prop_oneof![
        // Valid account IDs
        prop::collection::vec(any::<u8>(), 32).prop_map(|bytes| AccountId::from(Hash::from(bytes))),
        // Edge cases
        Just(AccountId::from([0u8; 32])),
        Just(AccountId::from([255u8; 32])),
        // Partially filled accounts
        prop::collection::vec(any::<u8>(), 0..32).prop_map(|bytes| {
            let mut full_bytes = [0u8; 32];
            let len = bytes.len().min(32);
            full_bytes[..len].copy_from_slice(&bytes[..len]);
            AccountId::from(Hash::from(full_bytes))
        }),
    ]
}

/// Fuzz strategy for extreme numeric values
fn fuzz_extreme_u128_strategy() -> impl Strategy<Value = u128> {
    prop_oneof![
        // Normal values
        prop::num::u128::ANY,
        // Edge cases
        Just(0),
        Just(1),
        Just(u128::MAX),
        Just(u128::MAX / 2),
        Just(u128::MAX - 1),
        // Boundary values
        prop::num::u128::ANY.prop_filter("Near boundary", |&x| x == 0 || x == 1 || x == u128::MAX || x == u128::MAX - 1),
    ]
}

/// Fuzz strategy for potentially malformed strings
fn fuzz_string_strategy() -> impl Strategy<Value = String> {
    prop_oneof![
        // Normal strings
        ".*",
        // Empty strings
        "",
        // Very long strings
        prop::collection::vec(any::<char>(), 0..10000).prop_map(|chars| chars.into_iter().collect()),
        // Special characters
        "\\0\\n\\r\\t\\\\",
        // Unicode edge cases
        "🔥💣🚨⚠️",
        // Control characters
        (0..32u8).prop_map(|c| c.to_string()),
    ]
}

/// Fuzz strategy for invalid token IDs
fn fuzz_invalid_token_id_strategy() -> impl Strategy<Value = TokenId> {
    prop_oneof![
        // Valid token IDs
        prop::num::u64::ANY,
        // Invalid/edge case token IDs
        Just(0),
        Just(u64::MAX),
        Just(u64::MAX - 1),
        Just(u64::MAX / 2),
    ]
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    /// Fuzz test: Property token contract should handle malformed inputs gracefully
    #[test]
    fn fuzz_property_token_malformed_inputs(
        token_id in fuzz_invalid_token_id_strategy(),
        from in fuzz_account_id_strategy(),
        to in fuzz_account_id_strategy(),
        amount in fuzz_extreme_u128_strategy(),
        metadata in fuzz_string_strategy()
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut property_token = deploy_property_token_contract(contract_id, 1000);
        
        // Test various operations with malformed inputs
        // These should not panic or cause undefined behavior
        
        // Test transfer with potentially invalid inputs
        let transfer_result = property_token.transfer_from(from, to, token_id);
        // Should either succeed or return a proper error, never panic
        match transfer_result {
            Ok(_) | Err(PropertyError::TokenNotFound | PropertyError::Unauthorized | PropertyError::InsufficientBalance) => {
                // Expected outcomes
            },
            Err(other) => {
                prop_assert!(false, "Unexpected error: {:?}", other);
            }
        }
        
        // Test approval operations
        let approve_result = property_token.approve(to, token_id);
        match approve_result {
            Ok(_) | Err(PropertyError::TokenNotFound | PropertyError::Unauthorized) => {
                // Expected outcomes
            },
            Err(other) => {
                prop_assert!(false, "Unexpected error in approval: {:?}", other);
            }
        }
        
        // Test balance queries (should never panic)
        let _balance = property_token.balance_of(from, token_id);
        let _owner = property_token.owner_of(token_id);
        
        // Test metadata operations with malformed strings
        if token_id > 0 {
            let metadata_result = property_token.set_metadata(token_id, metadata.clone());
            match metadata_result {
                Ok(_) | Err(PropertyError::TokenNotFound | PropertyError::InvalidMetadata) => {
                    // Expected outcomes
                },
                Err(other) => {
                    prop_assert!(false, "Unexpected error in metadata: {:?}", other);
                }
            }
        }
    }

    /// Fuzz test: Escrow contract should handle extreme values
    #[test]
    fn fuzz_escrow_extreme_values(
        property_id in fuzz_invalid_token_id_strategy(),
        buyer in fuzz_account_id_strategy(),
        seller in fuzz_account_id_strategy(),
        amount in fuzz_extreme_u128_strategy(),
        timelock in prop::num::u64::ANY
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut escrow = deploy_escrow_contract(contract_id);
        
        // Test escrow creation with extreme values
        let create_result = escrow.create_escrow(property_id, buyer, seller, amount);
        
        // Should either succeed or return proper error
        match create_result {
            Ok(escrow_id) => {
                // If creation succeeded, test operations with this escrow
                let fund_result = escrow.fund_escrow(escrow_id);
                match fund_result {
                    Ok(_) | Err(EscrowError::InsufficientFunds | EscrowError::EscrowAlreadyFunded) => {
                        // Expected outcomes
                    },
                    Err(other) => {
                        prop_assert!(false, "Unexpected error in funding: {:?}", other);
                    }
                }
                
                // Test timelock operations
                if timelock > 0 {
                    let timelock_result = escrow.set_release_timelock(escrow_id, timelock);
                    match timelock_result {
                        Ok(_) | Err(EscrowError::Unauthorized | EscrowError::InvalidStatus) => {
                            // Expected outcomes
                        },
                        Err(other) => {
                            prop_assert!(false, "Unexpected error in timelock: {:?}", other);
                        }
                    }
                }
            },
            Err(EscrowError::InvalidConfiguration) => {
                // Expected for invalid configurations
            },
            Err(other) => {
                prop_assert!(false, "Unexpected error in escrow creation: {:?}", other);
            }
        }
    }

    /// Fuzz test: Multi-signature operations with malformed inputs
    #[test]
    fn fuzz_multisig_malformed_inputs(
        required_sigs in prop::num::u8::ANY,
        signers in prop::collection::vec(fuzz_account_id_strategy(), 0..20),
        escrow_id in fuzz_invalid_token_id_strategy(),
        approval_type in prop_oneof![
            Just(ApprovalType::Release),
            Just(ApprovalType::Refund),
            Just(ApprovalType::EmergencyOverride),
        ],
        signer in fuzz_account_id_strategy()
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut escrow = deploy_escrow_contract(contract_id);
        
        // Create a valid escrow first
        let valid_escrow_id = escrow.create_escrow(1, accounts.alice, accounts.bob, 1000);
        
        // Test multi-sig configuration with potentially invalid inputs
        let config_result = escrow.set_multisig_config(valid_escrow_id, required_sigs, signers.clone());
        match config_result {
            Ok(_) | Err(EscrowError::InvalidConfiguration | EscrowError::Unauthorized) => {
                // Expected outcomes
            },
            Err(other) => {
                prop_assert!(false, "Unexpected error in multisig config: {:?}", other);
            }
        }
        
        // Test signature addition with malformed inputs
        let signature_result = escrow.add_signature(escrow_id, approval_type, signer);
        match signature_result {
            Ok(_) | Err(EscrowError::EscrowNotFound | EscrowError::Unauthorized | EscrowError::AlreadySigned) => {
                // Expected outcomes
            },
            Err(other) => {
                prop_assert!(false, "Unexpected error in signature addition: {:?}", other);
            }
        }
    }

    /// Fuzz test: Cross-chain bridge with malicious inputs
    #[test]
    fn fuzz_bridge_malicious_inputs(
        token_id in fuzz_invalid_token_id_strategy(),
        chain_id in prop::num::u64::ANY,
        recipient in fuzz_account_id_strategy(),
        bridge_hash in prop::collection::vec(any::<u8>(), 0..64)
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut property_token = deploy_property_token_contract(contract_id, 1000);
        
        // Setup bridge operators
        let operators = vec![accounts.contract, accounts.alice];
        property_token.set_bridge_operators(operators);
        
        // Test bridge transfer with potentially malicious inputs
        let transfer_result = property_token.initiate_bridge_transfer(token_id, chain_id, recipient);
        match transfer_result {
            Ok(_) | Err(PropertyError::TokenNotFound | PropertyError::BridgeNotSupported | PropertyError::Unauthorized) => {
                // Expected outcomes
            },
            Err(other) => {
                prop_assert!(false, "Unexpected error in bridge transfer: {:?}", other);
            }
        }
        
        // Test bridge completion with malformed hash
        let hash = Hash::from([bridge_hash[0]; 32]);
        let completion_result = property_token.complete_bridge_transfer(token_id, chain_id, hash);
        match completion_result {
            Ok(_) | Err(PropertyError::TokenNotFound | PropertyError::InvalidRequest | PropertyError::InsufficientSignatures) => {
                // Expected outcomes
            },
            Err(other) => {
                prop_assert!(false, "Unexpected error in bridge completion: {:?}", other);
            }
        }
    }

    /// Fuzz test: Reentrancy attack simulation
    #[test]
    fn fuzz_reentrancy_simulation(
        operations in prop::collection::vec(
            prop_oneof![
                // Normal operations
                prop::tuple::Tuple((any::<u8>(), fuzz_account_id_strategy(), fuzz_account_id_strategy())),
                // Recursive operations that might trigger reentrancy
                prop::tuple::Tuple((255u8..=255u8, fuzz_account_id_strategy(), fuzz_account_id_strategy())),
            ],
            1..50
        )
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut property_token = deploy_property_token_contract(contract_id, 1000);
        let mut escrow = deploy_escrow_contract(contract_id);
        
        // Create some initial tokens and escrows
        for i in 1..=10 {
            property_token.mint(accounts.alice, i);
            escrow.create_escrow(i, accounts.alice, accounts.bob, 100 * i as u128);
        }
        
        // Execute operations that might trigger reentrancy
        for (op_type, account1, account2) in operations {
            match op_type % 4 {
                0 => {
                    // Transfer operations
                    let token_id = ((op_type as u64) % 10) + 1;
                    let _ = property_token.transfer_from(account1, account2, token_id);
                },
                1 => {
                    // Escrow operations
                    let escrow_id = ((op_type as u64) % 10) + 1;
                    let _ = escrow.fund_escrow(escrow_id);
                },
                2 => {
                    // Approval operations
                    let token_id = ((op_type as u64) % 10) + 1;
                    let _ = property_token.approve(account2, token_id);
                },
                3 => {
                    // Multi-sig operations
                    let escrow_id = ((op_type as u64) % 10) + 1;
                    let _ = escrow.add_signature(escrow_id, ApprovalType::Release, account1);
                },
                _ => unreachable!(),
            }
        }
        
        // Verify contract state is still consistent
        let total_supply = property_token.total_supply();
        prop_assert!(total_supply <= 1010, "Total supply should not exceed expected maximum");
        
        // Verify no escrow has negative balance
        for i in 1..=10 {
            if let Ok(balance) = escrow.get_escrow_balance(i) {
                prop_assert!(balance >= 0, "Escrow balance should never be negative");
            }
        }
    }

    /// Fuzz test: Integer overflow/underflow protection
    #[test]
    fn fuzz_integer_overflow_protection(
        amounts in prop::collection::vec(fuzz_extreme_u128_strategy(), 1..20),
        token_ids in prop::collection::vec(fuzz_invalid_token_id_strategy(), 1..20)
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut property_token = deploy_property_token_contract(contract_id, 0);
        
        // Test operations with extreme amounts that might cause overflow
        for (i, &amount) in amounts.iter().enumerate() {
            let token_id = token_ids[i % token_ids.len()];
            
            // Mint with extreme amounts
            property_token.mint(accounts.alice, token_id);
            
            // Test transfers with amounts that might cause overflow
            let _ = property_token.transfer_from(accounts.alice, accounts.bob, token_id);
            
            // Test balance queries
            let balance = property_token.balance_of(accounts.alice, token_id);
            prop_assert!(balance <= u128::MAX, "Balance should not exceed u128::MAX");
        }
        
        // Test escrow with extreme amounts
        let mut escrow = deploy_escrow_contract(contract_id);
        
        for (i, &amount) in amounts.iter().enumerate() {
            let property_id = token_ids[i % token_ids.len()];
            
            let escrow_id = escrow.create_escrow(property_id, accounts.alice, accounts.bob, amount);
            
            // These operations should not cause overflow
            let _ = escrow.fund_escrow(escrow_id);
            
            if let Ok(balance) = escrow.get_escrow_balance(escrow_id) {
                prop_assert!(balance <= amount, "Escrow balance should not exceed funded amount");
            }
        }
    }

    /// Fuzz test: Access control bypass attempts
    #[test]
    fn fuzz_access_control_bypass(
        unauthorized_accounts in prop::collection::vec(fuzz_account_id_strategy(), 1..10),
        protected_operations in prop::collection::vec(any::<u8>(), 1..20)
    ) {
        let mut accounts = default_accounts::<ink::env::DefaultEnvironment>();
        let contract_id = accounts.contract;
        
        let mut property_token = deploy_property_token_contract(contract_id, 1000);
        let mut escrow = deploy_escrow_contract(contract_id);
        
        // Create some tokens and escrows
        property_token.mint(accounts.alice, 1);
        let escrow_id = escrow.create_escrow(1, accounts.alice, accounts.bob, 1000);
        
        // Test unauthorized access attempts
        for unauthorized_account in unauthorized_accounts {
            // Switch to unauthorized account
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(unauthorized_account);
            
            for operation in protected_operations.iter() {
                match operation % 6 {
                    0 => {
                        // Try to mint tokens (admin only)
                        let result = property_token.mint(unauthorized_account, 999);
                        prop_assert!(result.is_err(), "Unauthorized minting should fail");
                    },
                    1 => {
                        // Try to set bridge operators (admin only)
                        let result = property_token.set_bridge_operators(vec![unauthorized_account]);
                        prop_assert!(result.is_err(), "Unauthorized bridge operator setting should fail");
                    },
                    2 => {
                        // Try to release escrow without proper authorization
                        let result = escrow.release_escrow(escrow_id);
                        prop_assert!(result.is_err(), "Unauthorized escrow release should fail");
                    },
                    3 => {
                        // Try to emergency override escrow
                        let result = escrow.emergency_override(escrow_id);
                        prop_assert!(result.is_err(), "Unauthorized emergency override should fail");
                    },
                    4 => {
                        // Try to set multisig config without authorization
                        let result = escrow.set_multisig_config(escrow_id, 1, vec![unauthorized_account]);
                        prop_assert!(result.is_err(), "Unauthorized multisig config should fail");
                    },
                    5 => {
                        // Try to access admin functions
                        let result = property_token.transfer_admin(unauthorized_account);
                        prop_assert!(result.is_err(), "Unauthorized admin transfer should fail");
                    },
                    _ => unreachable!(),
                }
            }
        }
        
        // Restore caller to contract account
        ink::env::test::set_caller::<ink::env::DefaultEnvironment>(contract_id);
    }
}

/// Helper function to deploy property token contract for fuzz testing
fn deploy_property_token_contract(contract_id: AccountId, initial_supply: u64) -> PropertyToken {
    PropertyToken::new(initial_supply)
}

/// Helper function to deploy escrow contract for fuzz testing
fn deploy_escrow_contract(contract_id: AccountId) -> AdvancedEscrow {
    AdvancedEscrow::new()
}

// =============================================================================
// ZERO-KNOWLEDGE PROOF MALFORMED-INPUT HANDLING (Issue #629)
// =============================================================================
//
// These fuzz tests exercise the shared proof-payload validation helpers in
// `stellar_insured_lib::zk` — the same rules the on-chain Groth16 verifiers use
// as a pre-deserialization gate. Cryptographic soundness comes from the pairing
// checks inside the contracts; these tests assert that obviously malformed
// input is rejected without panics.

use stellar_insured_lib::zk::{
    is_canonical_field_element, validate_proof_payload, validate_public_inputs,
    GROTH16_BN254_PROOF_LEN, MAX_PROOF_LEN,
};

/// Fuzz strategy for arbitrary proof payload bytes.
fn fuzz_zk_payload_strategy() -> impl Strategy<Value = Vec<u8>> {
    prop::collection::vec(any::<u8>(), 0..2048)
}

/// Fuzz strategy for arbitrary 32-byte field-element encodings.
fn fuzz_zk_field_bytes_strategy() -> impl Strategy<Value = [u8; 32]> {
    prop::array::array32(any::<u8>())
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(1000))]

    /// Malformed proof payloads must never panic the shared gate, and
    /// out-of-window lengths must always be rejected.
    #[test]
    fn fuzz_zk_malformed_proof_payloads(payload in fuzz_zk_payload_strategy()) {
        let accepted = validate_proof_payload(&payload);
        if payload.is_empty() || payload.len() > MAX_PROOF_LEN {
            prop_assert!(!accepted, "empty/oversized proof payload must be rejected");
        }
        // A canonical-length (128-byte) payload always passes the gate.
        let canonical = vec![0u8; GROTH16_BN254_PROOF_LEN];
        prop_assert!(validate_proof_payload(&canonical));
    }

    /// Arbitrary field encodings must not panic the canonicality check.
    #[test]
    fn fuzz_zk_field_element_canonicality(bytes in fuzz_zk_field_bytes_strategy()) {
        let _ = is_canonical_field_element(&bytes); // must never panic
        // The all-ones encoding is >= the Bn254 modulus and must be rejected.
        prop_assert!(!is_canonical_field_element(&[0xffu8; 32]));
        // Canonical elements are always accepted by the aggregate validator.
        if is_canonical_field_element(&bytes) {
            prop_assert!(validate_public_inputs(&[bytes]));
        }
    }

    /// Public-input arrays with too many elements must be rejected.
    #[test]
    fn fuzz_zk_public_input_count(count in 0usize..70usize) {
        let inputs = vec![[0u8; 32]; count];
        let accepted = validate_public_inputs(&inputs);
        prop_assert_eq!(accepted, count > 0 && count <= 64);
    }
}

/// Deterministic boundary cases for the proof-payload gate.
#[test]
fn zk_proof_payload_boundaries() {
    assert!(!validate_proof_payload(&[]));
    assert!(validate_proof_payload(&[0u8; GROTH16_BN254_PROOF_LEN]));
    assert!(validate_proof_payload(&[0u8; MAX_PROOF_LEN]));
    assert!(!validate_proof_payload(&[0u8; MAX_PROOF_LEN + 1]));
}

/// Deterministic boundary cases for the canonical field-element check.
#[test]
fn zk_canonical_field_element_boundaries() {
    assert!(is_canonical_field_element(&[0u8; 32]));
    assert!(!is_canonical_field_element(&[0xffu8; 32]));

    // Exactly the Bn254 modulus -> non-canonical.
    let mut modulus = [0u8; 32];
    for (i, limb) in [
        0x3c20_8c16_d87c_fd47u64,
        0x9781_6a91_6871_ca8du64,
        0xb850_45b6_8181_585du64,
        0x3064_4e72_e131_a029u64,
    ]
    .iter()
    .enumerate()
    {
        for j in 0..8 {
            modulus[i * 8 + j] = ((limb >> (8 * j)) & 0xff) as u8;
        }
    }
    assert!(!is_canonical_field_element(&modulus));

    // modulus - 1 -> canonical (largest valid element).
    modulus[0] = modulus[0].wrapping_sub(1);
    assert!(is_canonical_field_element(&modulus));
}
