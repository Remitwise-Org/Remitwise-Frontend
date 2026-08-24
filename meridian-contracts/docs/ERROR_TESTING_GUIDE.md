# Error Handling Testing Guide

## Overview

This guide provides comprehensive testing patterns for the strongly-typed error handling refactoring. All test examples follow Soroban testing best practices.

## Test Structure

### Basic Test Template

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env, Address};
    use stellar_insured_lib::{EscrowError, ValidationError};

    #[test]
    fn test_successful_operation() {
        let env = Env::default();
        let contract_id = env.register_contract(None, Contract);
        let client = ContractClient::new(&env, &contract_id);
        
        let result = client.some_operation(&args);
        assert!(result.is_ok());
    }

    #[test]
    fn test_error_condition() {
        let env = Env::default();
        let contract_id = env.register_contract(None, Contract);
        let client = ContractClient::new(&env, &contract_id);
        
        let result = client.some_operation(&invalid_args);
        assert_eq!(result.unwrap_err(), ExpectedError::Variant);
    }
}
```

## Escrow Contract Test Examples

### Test 1: Initialization Errors

```rust
#[test]
fn test_init_already_initialized() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);

    // First initialization succeeds
    let result = client.init(&admin);
    assert!(result.is_ok());

    // Second initialization fails with AlreadyInitialized
    let result = client.init(&admin);
    assert!(result.is_err());
    // Note: Exact error matching depends on your client implementation
}

#[test]
fn test_init_zero_address() {
    let env = Env::default();
    let zero_addr = Address::from_contract_id(&[0u8; 32]);
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);

    let result = client.init(&zero_addr);
    assert!(result.is_err());
    // Should fail with ValidationError::ZeroAddress
}
```

### Test 2: Authorization Errors

```rust
#[test]
fn test_set_pause_unauthorized() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);
    
    client.init(&admin).unwrap();
    
    // Attempt to pause with non-admin address
    env.mock_all_auths();
    let result = client.set_pause(&non_admin, &true);
    assert!(result.is_err());
    // Should return EscrowError::Unauthorized
}
```

### Test 3: Nonce Validation

```rust
#[test]
fn test_create_escrow_invalid_nonce() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);
    
    client.init(&admin).unwrap();
    
    env.mock_all_auths();
    
    let participants = vec![&env, buyer.clone(), seller.clone()];
    
    // Try with wrong nonce (should be 1 for first transaction)
    let result = client.create_escrow_advanced(
        &1, // property_id
        &1000, // amount
        &buyer,
        &seller,
        &participants,
        &2, // required_signatures
        &None, // release_time_lock
        &999, // INVALID NONCE - should be 1
    );
    
    assert!(result.is_err());
    // Should return EscrowError::InvalidNonce
}

#[test]
fn test_create_escrow_valid_nonce() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);
    
    client.init(&admin).unwrap();
    
    env.mock_all_auths();
    
    let participants = vec![&env, buyer.clone(), seller.clone()];
    
    // Use correct nonce = 1
    let result = client.create_escrow_advanced(
        &1,
        &1000,
        &buyer,
        &seller,
        &participants,
        &2,
        &None,
        &1, // CORRECT NONCE
    );
    
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 1); // First escrow ID
}
```

### Test 4: Participant Limits

```rust
#[test]
fn test_create_escrow_too_many_participants() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);
    
    client.init(&admin).unwrap();
    
    env.mock_all_auths();
    
    // Create more than MAX_PARTICIPANTS (10)
    let mut participants = vec![&env];
    for _ in 0..11 {
        participants.push_back(Address::generate(&env));
    }
    
    let result = client.create_escrow_advanced(
        &1,
        &1000,
        &buyer,
        &seller,
        &participants,
        &2,
        &None,
        &1,
    );
    
    assert!(result.is_err());
    // Should return EscrowError::TooManyParticipants
}
```

### Test 5: Deposit Validation

```rust
#[test]
fn test_deposit_exceeds_amount() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);
    
    client.init(&admin).unwrap();
    
    env.mock_all_auths();
    
    let participants = vec![&env, buyer.clone(), seller.clone()];
    let escrow_id = client.create_escrow_advanced(
        &1,
        &1000, // Escrow amount
        &buyer,
        &seller,
        &participants,
        &2,
        &None,
        &1,
    ).unwrap();
    
    // Try to deposit more than escrow amount
    let result = client.deposit_funds(&escrow_id, &1500);
    assert!(result.is_err());
    // Should return EscrowError::DepositExceedsAmount
}
```

### Test 6: Multi-Signature Threshold

```rust
#[test]
fn test_release_funds_threshold_not_met() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let buyer = Address::generate(&env);
    let seller = Address::generate(&env);
    let signer1 = Address::generate(&env);
    
    let contract_id = env.register_contract(None, AdvancedEscrow);
    let client = AdvancedEscrowClient::new(&env, &contract_id);
    
    client.init(&admin).unwrap();
    
    env.mock_all_auths();
    
    let participants = vec![&env, signer1.clone(), buyer.clone()];
    let escrow_id = client.create_escrow_advanced(
        &1,
        &1000,
        &buyer,
        &seller,
        &participants,
        &2, // Require 2 signatures
        &None,
        &1,
    ).unwrap();
    
    // Fully fund the escrow
    client.deposit_funds(&escrow_id, &1000).unwrap();
    
    // Only 1 signature provided
    client.sign_approval(&escrow_id, &ApprovalType::Release, &signer1).unwrap();
    
    // Try to release with insufficient signatures
    let result = client.release_funds(&escrow_id);
    assert!(result.is_err());
    // Should return EscrowError::SignatureThresholdNotMet
}
```

## Risk Pool Contract Test Examples

### Test 7: Initialization

```rust
#[test]
fn test_risk_pool_already_initialized() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    
    let contract_id = env.register_contract(None, RiskPoolContract);
    let client = RiskPoolContractClient::new(&env, &contract_id);
    
    let result = client.initialize(&admin, &token, &100);
    assert!(result.is_ok());
    
    // Try to initialize again
    let result = client.initialize(&admin, &token, &100);
    assert!(result.is_err());
    // Should return RiskPoolError::AlreadyInitialized
}
```

### Test 8: Minimum Stake Validation

```rust
#[test]
fn test_deposit_below_minimum_stake() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let provider = Address::generate(&env);
    
    let contract_id = env.register_contract(None, RiskPoolContract);
    let client = RiskPoolContractClient::new(&env, &contract_id);
    
    client.initialize(&admin, &token, &100).unwrap(); // min_stake = 100
    
    env.mock_all_auths();
    
    // Try to deposit below minimum
    let result = client.deposit_liquidity(&provider, &50);
    assert!(result.is_err());
    // Should return RiskPoolError::BelowMinimumStake
}
```

### Test 9: Insufficient Pool Funds

```rust
#[test]
fn test_payout_insufficient_pool_funds() {
    let env = Env::default();
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    let contract_id = env.register_contract(None, RiskPoolContract);
    let client = RiskPoolContractClient::new(&env, &contract_id);
    
    client.initialize(&admin, &token, &100).unwrap();
    
    env.mock_all_auths();
    
    // Pool has no funds, try to payout
    let result = client.payout_claim(&recipient, &1000);
    assert!(result.is_err());
    // Should return RiskPoolError::InsufficientPoolFunds
}
```

## Governance Contract Test Examples

### Test 10: Voting Period Validation

```rust
#[test]
fn test_vote_after_period_ended() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let slashing = Address::generate(&env);
    let claims = Address::generate(&env);
    let risk_pool = Address::generate(&env);
    let policy = Address::generate(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    
    let contract_id = env.register_contract(None, GovernanceContract);
    let client = GovernanceContractClient::new(&env, &contract_id);
    
    client.initialize(
        &admin,
        &token,
        &slashing,
        &100, // 100 second voting period
        &claims,
        &risk_pool,
        &policy,
    ).unwrap();
    
    let proposal_id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Test Proposal"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "data"),
        &50, // 50% threshold
    ).unwrap();
    
    // Advance time past voting period
    env.ledger().with_mut(|li| {
        li.timestamp = 200; // Past the 100 second window
    });
    
    // Try to vote after period ended
    let result = client.vote(&voter, &proposal_id, &100, &true);
    assert!(result.is_err());
    // Should return GovernanceError::VotingPeriodEnded
}
```

### Test 11: Double Voting Prevention

```rust
#[test]
fn test_already_voted() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let slashing = Address::generate(&env);
    let claims = Address::generate(&env);
    let risk_pool = Address::generate(&env);
    let policy = Address::generate(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    
    let contract_id = env.register_contract(None, GovernanceContract);
    let client = GovernanceContractClient::new(&env, &contract_id);
    
    client.initialize(
        &admin, &token, &slashing, &1000,
        &claims, &risk_pool, &policy,
    ).unwrap();
    
    let proposal_id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "data"),
        &50,
    ).unwrap();
    
    // First vote succeeds
    client.vote(&voter, &proposal_id, &100, &true).unwrap();
    
    // Second vote fails
    let result = client.vote(&voter, &proposal_id, &100, &false);
    assert!(result.is_err());
    // Should return GovernanceError::AlreadyVoted
}
```

### Test 12: Execution Requirements

```rust
#[test]
fn test_execute_must_finalize_first() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let slashing = Address::generate(&env);
    let claims = Address::generate(&env);
    let risk_pool = Address::generate(&env);
    let policy = Address::generate(&env);
    let creator = Address::generate(&env);
    
    let contract_id = env.register_contract(None, GovernanceContract);
    let client = GovernanceContractClient::new(&env, &contract_id);
    
    client.initialize(
        &admin, &token, &slashing, &100,
        &claims, &risk_pool, &policy,
    ).unwrap();
    
    let proposal_id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "data"),
        &50,
    ).unwrap();
    
    // Try to execute without finalizing
    let result = client.execute_proposal(&proposal_id);
    assert!(result.is_err());
    // Should return GovernanceError::MustFinalizeFirst
}

#[test]
fn test_execute_threshold_not_met() {
    let env = Env::default();
    env.mock_all_auths();
    
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let slashing = Address::generate(&env);
    let claims = Address::generate(&env);
    let risk_pool = Address::generate(&env);
    let policy = Address::generate(&env);
    let creator = Address::generate(&env);
    let voter = Address::generate(&env);
    
    let contract_id = env.register_contract(None, GovernanceContract);
    let client = GovernanceContractClient::new(&env, &contract_id);
    
    client.initialize(
        &admin, &token, &slashing, &100,
        &claims, &risk_pool, &policy,
    ).unwrap();
    
    let proposal_id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "data"),
        &75, // 75% threshold required
    ).unwrap();
    
    // Vote 60% yes (below threshold)
    client.vote(&voter, &proposal_id, &60, &true).unwrap();
    
    // Advance time and finalize
    env.ledger().with_mut(|li| li.timestamp = 200);
    client.finalize_proposal(&proposal_id).unwrap();
    
    // Try to execute with insufficient votes
    let result = client.execute_proposal(&proposal_id);
    assert!(result.is_err());
    // Should return GovernanceError::ThresholdNotMet
}
```

## Integration Test Pattern

### Multi-Contract Error Flow

```rust
#[test]
fn test_governance_executes_risk_pool_payout() {
    let env = Env::default();
    env.mock_all_auths();
    
    // Setup risk pool
    let risk_pool_id = env.register_contract(None, RiskPoolContract);
    let risk_pool_client = RiskPoolContractClient::new(&env, &risk_pool_id);
    
    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    risk_pool_client.initialize(&admin, &token, &100).unwrap();
    
    // Setup governance
    let gov_id = env.register_contract(None, GovernanceContract);
    let gov_client = GovernanceContractClient::new(&env, &gov_id);
    
    // ... initialize governance with risk_pool_id ...
    
    // Create fund allocation proposal
    let recipient = Address::generate(&env);
    let creator = Address::generate(&env);
    
    let proposal_id = gov_client.create_fund_allocation_proposal(
        &creator,
        &recipient,
        &1000,
        &50,
    ).unwrap();
    
    // Vote and finalize...
    
    // Execute - should fail if risk pool has insufficient funds
    let result = gov_client.execute_proposal(&proposal_id);
    // Propagates RiskPoolError::InsufficientPoolFunds through governance
}
```

## Test Organization Best Practices

### 1. Group Related Tests

```rust
#[cfg(test)]
mod escrow_tests {
    mod initialization {
        // All init-related tests
    }
    
    mod authorization {
        // All auth-related tests
    }
    
    mod nonce_validation {
        // All nonce-related tests
    }
}
```

### 2. Use Test Fixtures

```rust
struct TestFixture {
    env: Env,
    admin: Address,
    contract_id: Address,
    client: ContractClient,
}

impl TestFixture {
    fn new() -> Self {
        let env = Env::default();
        let admin = Address::generate(&env);
        let contract_id = env.register_contract(None, Contract);
        let client = ContractClient::new(&env, &contract_id);
        
        client.init(&admin).unwrap();
        
        Self { env, admin, contract_id, client }
    }
}

#[test]
fn test_with_fixture() {
    let fixture = TestFixture::new();
    // Test using fixture...
}
```

### 3. Parameterized Tests

```rust
#[rstest::rstest]
#[case(0, EscrowError::NonPositiveAmount)]
#[case(-100, EscrowError::NonPositiveAmount)]
fn test_invalid_amounts(#[case] amount: i128, #[case] expected_error: EscrowError) {
    let env = Env::default();
    // ... setup ...
    
    let result = client.deposit_funds(&escrow_id, &amount);
    assert_eq!(result.unwrap_err(), expected_error);
}
```

## Coverage Goals

Aim for:
- **100% error path coverage**: Every error variant tested
- **95% success path coverage**: All happy paths validated
- **80% edge case coverage**: Boundary conditions tested

## Running Tests

```bash
# Run all tests
cargo test

# Run specific contract tests
cargo test --package escrow

# Run with output
cargo test -- --nocapture

# Run with coverage
cargo tarpaulin --out Html
```

## Continuous Integration

Add to CI pipeline:

```yaml
- name: Run Tests
  run: |
    cargo test --all-features
    cargo test --no-default-features
    
- name: Check Error Handling
  run: |
    # Ensure no panic! remains
    ! grep -r "panic!" src/ --include="*.rs" --exclude="*test*"
```

---

**Document Version**: 1.0.0  
**Last Updated**: 2026-07-17  
**Authors**: PropChain Development Team
