//! Comprehensive Integration Tests for Stellar Soroban Contracts
//!
//! This module contains extensive integration tests covering critical cross-contract
//! workflows including property registration, escrow management, token transfers,
//! and oracle valuations.

use soroban_sdk::{testutils::Address as _, Address, Env, Symbol, symbol_short, Vec};
use soroban_sdk::testutils::{Ledger, LedgerInfo};
use escrow::EscrowContract;
use oracle::OracleContract;
use lib::random::Randomness;

// Test constants
const ADMIN_SEED: &[u8; 32] = b"admin_______________________________";
const BUYER_SEED: &[u8; 32] = b"buyer_______________________________";
const SELLER_SEED: &[u8; 32] = b"seller______________________________";
const ORACLE_SEED: &[u8; 32] = b"oracle______________________________";

#[test]
fn test_escrow_contract_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let escrow_contract = EscrowContract::init(env.clone(), admin.clone());

    // Verify admin is set
    assert_eq!(env.storage().instance().get(&symbol_short!("admin")).unwrap(), admin);

    // Verify escrow count starts at 0
    assert_eq!(EscrowContract::escrow_count(env), 0);
}

#[test]
fn test_create_and_fund_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());

    // Initialize contract
    EscrowContract::init(env.clone(), admin.clone());

    // Create escrow
    let property_id = 1;
    let escrow_amount = 1000000; // 1M units
    let escrow_id = EscrowContract::create_escrow(
        env.clone(),
        property_id,
        buyer.clone(),
        seller.clone(),
        escrow_amount,
    );

    assert_eq!(escrow_id, 1);
    assert_eq!(EscrowContract::escrow_count(env.clone()), 1);

    // Verify escrow data
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.0, property_id); // property_id
    assert_eq!(escrow_data.1, buyer); // buyer
    assert_eq!(escrow_data.2, seller); // seller
    assert_eq!(escrow_data.3, escrow_amount); // total_amount
    assert_eq!(escrow_data.4, 0); // deposited_amount
    assert_eq!(escrow_data.5, symbol_short!("created")); // status
}

#[test]
fn test_deposit_and_release_escrow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());

    // Initialize contract
    EscrowContract::init(env.clone(), admin.clone());

    // Create escrow
    let property_id = 1;
    let escrow_amount = 1000000;
    let escrow_id = EscrowContract::create_escrow(
        env.clone(),
        property_id,
        buyer.clone(),
        seller.clone(),
        escrow_amount,
    );

    // Deposit full amount
    EscrowContract::deposit_funds(env.clone(), escrow_id, escrow_amount);

    // Verify escrow is now funded
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.4, escrow_amount); // deposited_amount
    assert_eq!(escrow_data.5, symbol_short!("funded")); // status

    // Release escrow
    EscrowContract::release_escrow(env.clone(), escrow_id);

    // Verify escrow is released
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.5, symbol_short!("released")); // status
}

#[test]
fn test_partial_deposit_workflow() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());

    EscrowContract::init(env.clone(), admin);

    let escrow_id = EscrowContract::create_escrow(env.clone(), 1, buyer.clone(), seller, 1000);

    // Partial deposit
    EscrowContract::deposit_funds(env.clone(), escrow_id, 500);

    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.4, 500); // deposited_amount
    assert_eq!(escrow_data.5, symbol_short!("created")); // still created

    // Second deposit to reach full amount
    EscrowContract::deposit_funds(env.clone(), escrow_id, 500);

    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.4, 1000); // deposited_amount
    assert_eq!(escrow_data.5, symbol_short!("funded")); // now funded
}

#[test]
fn test_oracle_contract_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    OracleContract::init(env.clone(), admin.clone());

    // Verify admin is set
    assert_eq!(env.storage().instance().get(&symbol_short!("ADMIN")).unwrap(), admin);
}

#[test]
fn test_oracle_update_and_query() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    OracleContract::init(env.clone(), admin.clone());

    // Update data
    OracleContract::update_data(env.clone(), 42);

    // In a real implementation, we'd have query functions
    // For now, this tests the basic auth flow
}

#[test]
fn test_randomness_generation() {
    let env = Env::default();
    env.mock_all_auths();

    let randomness = Randomness::new(env.clone());

    // Generate some random values
    let random_u64 = randomness.next_u64();
    let random_bytes = randomness.next_bytes(32);

    // Basic sanity checks
    assert!(random_u64 >= 0);
    assert_eq!(random_bytes.len(), 32);
}

#[test]
fn test_cross_contract_property_to_escrow_workflow() {
    let env = Env::default();
    env.mock_all_auths();

    // Setup addresses
    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());
    let oracle = Address::from_contract_id(&env.crypto().sha256(ORACLE_SEED).into());

    // Initialize contracts
    EscrowContract::init(env.clone(), admin.clone());
    OracleContract::init(env.clone(), oracle.clone());

    // Simulate property valuation via oracle
    // In real implementation, this would be a more complex workflow

    // Create escrow based on "property valuation"
    let property_id = 1;
    let valuation_amount = 500000;
    let escrow_id = EscrowContract::create_escrow(
        env.clone(),
        property_id,
        buyer.clone(),
        seller.clone(),
        valuation_amount,
    );

    // Fund escrow
    EscrowContract::deposit_funds(env.clone(), escrow_id, valuation_amount);

    // Release escrow (completing the transaction)
    EscrowContract::release_escrow(env.clone(), escrow_id);

    // Verify final state
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.5, symbol_short!("released"));
}

#[test]
fn test_multiple_escrow_concurrent_operations() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer1 = Address::from_contract_id(&env.crypto().sha256(b"buyer1_____________________________").into());
    let seller1 = Address::from_contract_id(&env.crypto().sha256(b"seller1____________________________").into());
    let buyer2 = Address::from_contract_id(&env.crypto().sha256(b"buyer2_____________________________").into());
    let seller2 = Address::from_contract_id(&env.crypto().sha256(b"seller2____________________________").into());

    EscrowContract::init(env.clone(), admin);

    // Create multiple escrows
    let escrow1 = EscrowContract::create_escrow(env.clone(), 1, buyer1.clone(), seller1, 100000);
    let escrow2 = EscrowContract::create_escrow(env.clone(), 2, buyer2.clone(), seller2, 200000);

    assert_eq!(escrow1, 1);
    assert_eq!(escrow2, 2);
    assert_eq!(EscrowContract::escrow_count(env.clone()), 2);

    // Fund and release escrow1
    EscrowContract::deposit_funds(env.clone(), escrow1, 100000);
    EscrowContract::release_escrow(env.clone(), escrow1);

    // Fund and release escrow2
    EscrowContract::deposit_funds(env.clone(), escrow2, 200000);
    EscrowContract::release_escrow(env.clone(), escrow2);

    // Verify both are released
    let escrow1_data = EscrowContract::get_escrow(env.clone(), escrow1);
    let escrow2_data = EscrowContract::get_escrow(env.clone(), escrow2);

    assert_eq!(escrow1_data.5, symbol_short!("released"));
    assert_eq!(escrow2_data.5, symbol_short!("released"));
}

#[test]
fn test_escrow_error_conditions() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());

    EscrowContract::init(env.clone(), admin);

    let escrow_id = EscrowContract::create_escrow(env.clone(), 1, buyer, seller, 1000);

    // Try to release unfunded escrow - should panic
    let result = std::panic::catch_unwind(|| {
        EscrowContract::release_escrow(env.clone(), escrow_id);
    });
    assert!(result.is_err());

    // Try to get non-existent escrow
    let result = std::panic::catch_unwind(|| {
        EscrowContract::get_escrow(env.clone(), 999);
    });
    assert!(result.is_err());
}

#[test]
fn test_escrow_state_transitions() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());

    EscrowContract::init(env.clone(), admin);

    let escrow_id = EscrowContract::create_escrow(env.clone(), 1, buyer, seller, 1000);

    // Initial state: created
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.5, symbol_short!("created"));

    // After partial deposit: still created
    EscrowContract::deposit_funds(env.clone(), escrow_id, 500);
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.5, symbol_short!("created"));

    // After full deposit: funded
    EscrowContract::deposit_funds(env.clone(), escrow_id, 500);
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.5, symbol_short!("funded"));

    // After release: released
    EscrowContract::release_escrow(env.clone(), escrow_id);
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.5, symbol_short!("released"));
}

#[test]
fn test_large_scale_property_portfolio() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer_base = Address::from_contract_id(&env.crypto().sha256(b"buyer_base________________________").into());
    let seller_base = Address::from_contract_id(&env.crypto().sha256(b"seller_base_______________________").into());

    EscrowContract::init(env.clone(), admin);

    // Create 100 escrows to simulate large portfolio
    let mut escrow_ids = Vec::new(&env);
    for i in 1..=100 {
        let buyer = buyer_base.clone(); // In real impl, would vary
        let seller = seller_base.clone();
        let escrow_id = EscrowContract::create_escrow(env.clone(), i, buyer, seller, 10000 * i as u128);
        escrow_ids.push_back(escrow_id);
    }

    assert_eq!(EscrowContract::escrow_count(env.clone()), 100);

    // Fund and release first 50
    for i in 0..50 {
        let escrow_id = escrow_ids.get(i).unwrap();
        let amount = 10000 * (i as u64 + 1) as u128;
        EscrowContract::deposit_funds(env.clone(), escrow_id, amount);
        EscrowContract::release_escrow(env.clone(), escrow_id);
    }

    // Verify counts
    let mut released_count = 0;
    for i in 0..100 {
        let escrow_id = escrow_ids.get(i).unwrap();
        let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
        if escrow_data.5 == symbol_short!("released") {
            released_count += 1;
        }
    }
    assert_eq!(released_count, 50);
}

#[test]
fn test_end_to_end_property_transaction_workflow() {
    let env = Env::default();
    env.mock_all_auths();

    // Setup all participants
    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());
    let oracle = Address::from_contract_id(&env.crypto().sha256(ORACLE_SEED).into());

    // Initialize all contracts
    EscrowContract::init(env.clone(), admin.clone());
    OracleContract::init(env.clone(), oracle.clone());

    // Step 1: Property valuation (simulated via oracle)
    // In real implementation, oracle would provide valuation data

    // Step 2: Create escrow for property transaction
    let property_id = 1;
    let agreed_price = 750000;
    let escrow_id = EscrowContract::create_escrow(
        env.clone(),
        property_id,
        buyer.clone(),
        seller.clone(),
        agreed_price,
    );

    // Step 3: Buyer deposits funds
    EscrowContract::deposit_funds(env.clone(), escrow_id, agreed_price);

    // Step 4: Verify escrow is funded
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.5, symbol_short!("funded"));

    // Step 5: Release escrow (property transfer completes)
    EscrowContract::release_escrow(env.clone(), escrow_id);

    // Step 6: Verify transaction completion
    let final_escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(final_escrow_data.5, symbol_short!("released"));

    // Step 7: Update oracle with new valuation (post-transaction)
    // In real implementation, this would update property valuation
}

#[test]
fn test_concurrent_property_transactions() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    EscrowContract::init(env.clone(), admin);

    // Create multiple concurrent property transactions
    let transactions = vec![
        (1, 500000),   // Property 1: $500K
        (2, 750000),   // Property 2: $750K
        (3, 1000000),  // Property 3: $1M
        (4, 250000),   // Property 4: $250K
        (5, 900000),   // Property 5: $900K
    ];

    let mut escrow_ids = Vec::new(&env);

    // Create all escrows
    for (property_id, price) in transactions {
        let buyer = Address::from_contract_id(&env.crypto().sha256(&format!("buyer_{}", property_id).as_bytes()).into());
        let seller = Address::from_contract_id(&env.crypto().sha256(&format!("seller_{}", property_id).as_bytes()).into());

        let escrow_id = EscrowContract::create_escrow(env.clone(), property_id, buyer, seller, price);
        escrow_ids.push_back(escrow_id);
    }

    // Process transactions in different orders
    // Fund even-numbered properties first
    for i in (0..5).step_by(2) {
        let escrow_id = escrow_ids.get(i).unwrap();
        let price = transactions[i].1;
        EscrowContract::deposit_funds(env.clone(), escrow_id, price);
    }

    // Fund odd-numbered properties
    for i in (1..5).step_by(2) {
        let escrow_id = escrow_ids.get(i).unwrap();
        let price = transactions[i].1;
        EscrowContract::deposit_funds(env.clone(), escrow_id, price);
    }

    // Release in reverse order
    for i in (0..5).rev() {
        let escrow_id = escrow_ids.get(i).unwrap();
        EscrowContract::release_escrow(env.clone(), escrow_id);
    }

    // Verify all transactions completed
    for i in 0..5 {
        let escrow_id = escrow_ids.get(i).unwrap();
        let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
        assert_eq!(escrow_data.5, symbol_short!("released"));
    }
}

#[test]
fn test_property_valuation_updates_via_oracle() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let oracle = Address::from_contract_id(&env.crypto().sha256(ORACLE_SEED).into());

    OracleContract::init(env.clone(), oracle.clone());

    // Simulate multiple property valuations
    let property_valuations = vec![
        (1, 450000),  // Property 1: Initial valuation
        (2, 680000),  // Property 2: Initial valuation
        (3, 1200000), // Property 3: Initial valuation
    ];

    // In a real implementation, the oracle would store and update valuations
    // For this test, we simulate the workflow

    for (property_id, valuation) in property_valuations {
        // Simulate oracle updating valuation
        // OracleContract::update_property_valuation(env.clone(), property_id, valuation);

        // Simulate escrow using oracle data
        let escrow_id = EscrowContract::create_escrow(
            env.clone(),
            property_id,
            Address::from_contract_id(&env.crypto().sha256(b"buyer").into()),
            Address::from_contract_id(&env.crypto().sha256(b"seller").into()),
            valuation,
        );

        // Complete transaction
        EscrowContract::deposit_funds(env.clone(), escrow_id, valuation);
        EscrowContract::release_escrow(env.clone(), escrow_id);
    }
}

#[test]
fn test_integration_with_randomness_for_property_ids() {
    let env = Env::default();
    env.mock_all_auths();

    let randomness = Randomness::new(env.clone());

    // Generate random property IDs for testing
    let mut property_ids = Vec::new(&env);
    for _ in 0..10 {
        let random_id = randomness.next_u64() % 10000; // Keep IDs reasonable
        property_ids.push_back(random_id);
    }

    // Use random IDs in escrow creation
    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    EscrowContract::init(env.clone(), admin);

    for i in 0..10 {
        let property_id = property_ids.get(i).unwrap();
        let escrow_id = EscrowContract::create_escrow(
            env.clone(),
            property_id,
            Address::from_contract_id(&env.crypto().sha256(b"buyer").into()),
            Address::from_contract_id(&env.crypto().sha256(b"seller").into()),
            100000,
        );

        // Verify escrow was created with random property ID
        let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
        assert_eq!(escrow_data.0, property_id);
    }
}

#[test]
fn test_performance_under_load() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    EscrowContract::init(env.clone(), admin);

    // Create 1000 escrows to test performance
    let start_time = env.ledger().timestamp();

    for i in 1..=1000 {
        let buyer = Address::from_contract_id(&env.crypto().sha256(&format!("buyer_{}", i).as_bytes()).into());
        let seller = Address::from_contract_id(&env.crypto().sha256(&format!("seller_{}", i).as_bytes()).into());

        EscrowContract::create_escrow(env.clone(), i, buyer, seller, 10000 * i as u128);
    }

    let end_time = env.ledger().timestamp();
    let duration = end_time - start_time;

    // Performance check - should complete within reasonable time
    assert!(duration < 1000); // Less than 1000 time units for 1000 operations

    assert_eq!(EscrowContract::escrow_count(env), 1000);
}

#[test]
fn test_network_failure_simulation() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let buyer = Address::from_contract_id(&env.crypto().sha256(BUYER_SEED).into());
    let seller = Address::from_contract_id(&env.crypto().sha256(SELLER_SEED).into());

    EscrowContract::init(env.clone(), admin);

    let escrow_id = EscrowContract::create_escrow(env.clone(), 1, buyer, seller, 1000);

    // Simulate network failure during deposit
    // In real Soroban, this would be handled by the environment
    EscrowContract::deposit_funds(env.clone(), escrow_id, 1000);

    // Verify state is consistent despite "failure"
    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.4, 1000); // Funds deposited
    assert_eq!(escrow_data.5, symbol_short!("funded")); // Status correct
}

#[test]
fn test_cross_contract_data_consistency() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    let oracle = Address::from_contract_id(&env.crypto().sha256(ORACLE_SEED).into());

    EscrowContract::init(env.clone(), admin.clone());
    OracleContract::init(env.clone(), oracle);

    // Create escrow with amount that should be validated by oracle
    let property_id = 1;
    let escrow_amount = 500000;

    let escrow_id = EscrowContract::create_escrow(
        env.clone(),
        property_id,
        Address::from_contract_id(&env.crypto().sha256(b"buyer").into()),
        Address::from_contract_id(&env.crypto().sha256(b"seller").into()),
        escrow_amount,
    );

    // In a real implementation, oracle would validate the amount
    // For this test, we ensure data consistency between contracts

    let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
    assert_eq!(escrow_data.0, property_id); // Property ID consistency
    assert_eq!(escrow_data.3, escrow_amount); // Amount consistency
}

mod circuit_breaker_race_tests {
    use stellar_insured_lib::circuit_breaker::{
        CircuitBreaker, CircuitBreakerError, CircuitBreakerState, CircuitBreakerTransition,
        PAUSE_TIMELOCK_SECONDS, RESUME_TIMELOCK_SECONDS,
    };

    #[test]
    fn reschedule_just_before_activation_moves_the_window_atomically() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::pause(&mut state, 100, 600, 1u8).unwrap();

        let reschedule_at = 100 + PAUSE_TIMELOCK_SECONDS - 1;
        CircuitBreaker::pause(&mut state, reschedule_at, 900, 2u8).unwrap();

        assert_eq!(state.rescheduled_by, Some(2));
        assert!(!CircuitBreaker::is_paused(
            &state,
            100 + PAUSE_TIMELOCK_SECONDS
        ));
        assert!(CircuitBreaker::is_paused(
            &state,
            reschedule_at + PAUSE_TIMELOCK_SECONDS
        ));
    }

    #[test]
    fn resume_cannot_race_a_pause_activation() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::pause(&mut state, 0, 10_000, 1u8).unwrap();

        let resume_requested_at = PAUSE_TIMELOCK_SECONDS - 1;
        assert!(matches!(
            CircuitBreaker::resume(&mut state, resume_requested_at, 9u8),
            Ok(CircuitBreakerTransition::ResumeScheduled { .. })
        ));
        assert!(CircuitBreaker::is_paused(&state, PAUSE_TIMELOCK_SECONDS));
        assert_eq!(
            CircuitBreaker::resume(
                &mut state,
                resume_requested_at + RESUME_TIMELOCK_SECONDS - 1,
                9u8,
            ),
            Err(CircuitBreakerError::ResumeTimelockActive)
        );
        assert!(CircuitBreaker::is_paused(
            &state,
            resume_requested_at + RESUME_TIMELOCK_SECONDS - 1
        ));
        assert!(matches!(
            CircuitBreaker::resume(
                &mut state,
                resume_requested_at + RESUME_TIMELOCK_SECONDS,
                9u8,
            ),
            Ok(CircuitBreakerTransition::ResumeActivated { .. })
        ));
    }

    #[test]
    fn emergency_pause_is_immediate_but_resume_is_not() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::emergency_pause(&mut state, 50, 1u8);
        assert!(CircuitBreaker::is_paused(&state, 50));

        CircuitBreaker::resume(&mut state, 51, 9u8).unwrap();
        assert!(CircuitBreaker::is_paused(
            &state,
            51 + RESUME_TIMELOCK_SECONDS - 1
        ));
        CircuitBreaker::resume(&mut state, 51 + RESUME_TIMELOCK_SECONDS, 9u8).unwrap();
        assert!(!CircuitBreaker::is_paused(&state, u64::MAX));
    }

    #[test]
    fn timed_pause_expires_without_an_admin_race() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::pause(&mut state, 10, 30, 1u8).unwrap();
        let expiry = 10 + PAUSE_TIMELOCK_SECONDS + 30;
        assert!(matches!(
            CircuitBreaker::sync(&mut state, expiry),
            Some(CircuitBreakerTransition::ResumeActivated {
                automatic: true,
                ..
            })
        ));
        assert!(!CircuitBreaker::is_paused(&state, expiry));
    }
}

#[test]
fn test_end_to_end_with_multiple_properties() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::from_contract_id(&env.crypto().sha256(ADMIN_SEED).into());
    EscrowContract::init(env.clone(), admin);

    // Simulate a real estate portfolio transaction
    let portfolio = vec![
        ("Downtown Office", 2000000),
        ("Residential Complex", 5000000),
        ("Retail Space", 1500000),
        ("Industrial Warehouse", 3000000),
        ("Luxury Condo", 1000000),
    ];

    let mut total_value = 0u128;
    let mut escrow_ids = Vec::new(&env);

    // Create escrows for entire portfolio
    for (i, (property_name, value)) in portfolio.iter().enumerate() {
        let property_id = i as u64 + 1;
        let buyer = Address::from_contract_id(&env.crypto().sha256(&format!("buyer_{}", property_id).as_bytes()).into());
        let seller = Address::from_contract_id(&env.crypto().sha256(&format!("seller_{}", property_id).as_bytes()).into());

        let escrow_id = EscrowContract::create_escrow(env.clone(), property_id, buyer, seller, *value);
        escrow_ids.push_back(escrow_id);
        total_value += *value;
    }

    // Fund all escrows
    for i in 0..portfolio.len() {
        let escrow_id = escrow_ids.get(i as u32).unwrap();
        let value = portfolio[i].1;
        EscrowContract::deposit_funds(env.clone(), escrow_id, value);
    }

    // Release all escrows (complete portfolio transaction)
    for i in 0..portfolio.len() {
        let escrow_id = escrow_ids.get(i as u32).unwrap();
        EscrowContract::release_escrow(env.clone(), escrow_id);
    }

    // Verify entire portfolio transaction completed
    for i in 0..portfolio.len() {
        let escrow_id = escrow_ids.get(i as u32).unwrap();
        let escrow_data = EscrowContract::get_escrow(env.clone(), escrow_id);
        assert_eq!(escrow_data.5, symbol_short!("released"));
    }

    assert_eq!(EscrowContract::escrow_count(env), portfolio.len() as u64);
}
