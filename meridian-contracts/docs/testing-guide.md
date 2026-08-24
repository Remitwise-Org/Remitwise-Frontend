# Testing Guide for PropChain Contracts

## Overview

This guide provides comprehensive information about testing practices, coverage goals, and best practices for PropChain smart contracts.

## Test Coverage Goals

### Target Coverage: 95%+

All contract modules should achieve at least 95% test coverage, including:
- All public functions
- All error paths
- Edge cases and boundary conditions
- Integration scenarios

## Test Structure

### Test Organization

```
tests/
├── test_utils.rs              # Shared test utilities and fixtures
├── property_token_edge_cases.rs # Edge case tests
├── property_based_tests.rs    # Property-based tests (proptest)
├── integration_tests.rs       # Cross-contract integration tests
├── performance_tests.rs      # Performance benchmarks
└── lib.rs                     # Test library entry point
```

### Contract Unit Tests

Each contract should have unit tests in `contracts/{contract}/src/tests.rs` covering:
- Constructor tests
- All public message functions
- Error cases
- State transitions

## Test Types

### 1. Unit Tests

Test individual functions in isolation.

**Example:**
```rust
#[ink::test]
fn test_register_property_success() {
    let mut contract = setup_contract();
    let metadata = PropertyMetadataFixtures::standard();
    
    let result = contract.register_property_with_token(metadata);
    assert!(result.is_ok());
    assert_eq!(contract.total_supply(), 1);
}
```

### 2. Edge Case Tests

Test boundary conditions, invalid inputs, and error paths.

**Example:**
```rust
#[ink::test]
fn test_transfer_from_nonexistent_token() {
    let mut contract = setup_contract();
    let result = contract.transfer_from(alice, bob, 999);
    assert_eq!(result, Err(Error::TokenNotFound));
}
```

### 3. Property-Based Tests

Use proptest to generate random inputs and verify properties hold.

**Example:**
```rust
proptest! {
    #[test]
    fn test_register_property_with_random_metadata(
        metadata in property_metadata_strategy()
    ) {
        let mut contract = setup_contract();
        let result = contract.register_property_with_token(metadata);
        prop_assume!(result.is_ok());
        // Verify properties hold
    }
}
```

### 4. Integration Tests

Test interactions between multiple contracts.

**Example:**
```rust
#[ink_e2e::test]
async fn test_property_registry_with_escrow() -> E2EResult<()> {
    // Test cross-contract interactions
}
```

### 5. Performance Tests

Benchmark contract operations and detect regressions.

**Example:**
```rust
#[test]
fn benchmark_register_property() {
    let mut contract = setup_contract();
    let (_, time) = measure_time(|| {
        contract.register_property_with_token(metadata);
    });
    assert!(time < MAX_EXPECTED_TIME);
}
```

## Test Utilities

### Test Fixtures

Use the `PropertyMetadataFixtures` for consistent test data:

```rust
use test_utils::PropertyMetadataFixtures;

let metadata = PropertyMetadataFixtures::standard();
let minimal = PropertyMetadataFixtures::minimal();
let large = PropertyMetadataFixtures::large();
let edge_cases = PropertyMetadataFixtures::edge_cases();
```

### Test Accounts

Use `TestAccounts` for consistent account management:

```rust
use test_utils::TestAccounts;

let accounts = TestAccounts::default();
TestEnv::set_caller(accounts.alice);
```

### Environment Helpers

Use `TestEnv` for environment manipulation:

```rust
use test_utils::TestEnv;

TestEnv::set_caller(account);
TestEnv::set_block_timestamp(1000);
TestEnv::set_transferred_value(1_000_000);
TestEnv::advance_time(3600); // Advance by 1 hour
```

## Best Practices

### 1. Test Naming

Use descriptive test names that explain what is being tested:

```rust
// Good
#[ink::test]
fn test_transfer_from_unauthorized_caller_fails() { }

// Bad
#[ink::test]
fn test_transfer() { }
```

### 2. Arrange-Act-Assert Pattern

Structure tests clearly:

```rust
#[ink::test]
fn test_example() {
    // Arrange: Set up test data
    let mut contract = setup_contract();
    let metadata = PropertyMetadataFixtures::standard();
    
    // Act: Perform the operation
    let result = contract.register_property_with_token(metadata);
    
    // Assert: Verify the result
    assert!(result.is_ok());
    assert_eq!(contract.total_supply(), 1);
}
```

### 3. Test Isolation

Each test should be independent and not rely on other tests:

```rust
#[ink::test]
fn test_independent() {
    TestEnv::reset(); // Reset environment
    // Test implementation
}
```

### 4. Error Testing

Always test error cases:

```rust
#[ink::test]
fn test_error_cases() {
    // Test invalid inputs
    // Test unauthorized access
    // Test state errors
}
```

### 5. Edge Cases

Test boundary conditions:

```rust
#[ink::test]
fn test_edge_cases() {
    // Minimum values
    // Maximum values
    // Zero values
    // Empty strings/vectors
    // Special characters
}
```

## Coverage Measurement

### Using cargo-tarpaulin

```bash
# Install cargo-tarpaulin
cargo install cargo-tarpaulin

# Run coverage
cargo tarpaulin --out Html --output-dir coverage/

# View coverage report
open coverage/tarpaulin-report.html
```

### Coverage Goals by Module

- **PropertyToken**: 95%+
- **PropertyRegistry**: 95%+
- **Escrow**: 95%+
- **Bridge**: 95%+
- **Oracle**: 95%+
- **Insurance**: 95%+

## Running Tests

### Run All Tests

```bash
cargo test --all-features
```

### Run Specific Test Module

```bash
cargo test --test property_token_edge_cases
```

### Run Property-Based Tests

```bash
cargo test --test property_based_tests
```

### Run Integration Tests

```bash
cargo test --test integration_tests --features e2e-tests
```

### Run with Output

```bash
cargo test -- --nocapture
```

## Test Data Management

### Fixtures

Create reusable test data fixtures:

```rust
pub struct PropertyMetadataFixtures;

impl PropertyMetadataFixtures {
    pub fn standard() -> PropertyMetadata { }
    pub fn minimal() -> PropertyMetadata { }
    pub fn large() -> PropertyMetadata { }
    pub fn edge_cases() -> Vec<PropertyMetadata> { }
}
```

### Generators

Use generators for property-based testing:

```rust
fn property_metadata_strategy() -> impl Strategy<Value = PropertyMetadata> {
    // Generate random valid metadata
}
```

## Performance Testing

### Benchmarking

Create benchmarks for critical operations:

```rust
#[test]
fn benchmark_register_property() {
    let mut contract = setup_contract();
    let iterations = 100;
    
    let times = benchmark(iterations, || {
        contract.register_property_with_token(metadata);
    });
    
    let avg_time = times.iter().sum::<u64>() / iterations as u64;
    assert!(avg_time < MAX_EXPECTED_TIME);
}
```

### Regression Testing

Track performance over time and detect regressions.

## Integration Testing

### Cross-Contract Tests

Test interactions between contracts:

```rust
#[ink_e2e::test]
async fn test_property_with_escrow() -> E2EResult<()> {
    // Deploy PropertyRegistry
    // Deploy Escrow
    // Test interaction
}
```

### End-to-End Scenarios

Test complete user workflows:

```rust
#[ink_e2e::test]
async fn test_complete_property_sale() -> E2EResult<()> {
    // 1. Register property
    // 2. Create escrow
    // 3. Transfer property
    // 4. Release escrow
}
```

## Continuous Integration

### CI Test Configuration

Tests run automatically in CI/CD pipeline:

```yaml
- name: Run unit tests
  run: cargo test --all-features

- name: Run integration tests
  run: cargo test --test integration_tests

- name: Check coverage
  run: cargo tarpaulin --out Xml
```

## Troubleshooting

### Common Issues

1. **Test fails intermittently**: Check for non-deterministic behavior
2. **Coverage below target**: Add tests for uncovered paths
3. **Slow tests**: Optimize test setup and use fixtures
4. **Integration test failures**: Check contract deployment order

### Debugging Tests

```rust
#[ink::test]
fn test_with_debug() {
    // Use println! for debugging (only in test mode)
    println!("Debug: {:?}", value);
    
    // Use assertions with messages
    assert!(condition, "Expected condition to be true, got: {:?}", value);
}
```

## Test Documentation

### Documenting Test Intent

```rust
/// Tests that property registration increments the token counter correctly.
/// 
/// This test verifies:
/// - Token IDs are sequential
/// - Total supply increments
/// - Owner is set correctly
#[ink::test]
fn test_register_property_increments_counter() {
    // Test implementation
}
```

## Resources

- [ink! Testing Documentation](https://use.ink/basics/testing)
- [Proptest Documentation](https://docs.rs/proptest/)
- [cargo-tarpaulin Documentation](https://docs.rs/cargo-tarpaulin/)
