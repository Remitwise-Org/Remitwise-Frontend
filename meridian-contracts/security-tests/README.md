# PropChain Security Tests

This package provides comprehensive property-based testing, fuzz testing, and security analysis for PropChain smart contracts to ensure they meet security standards and resist common attacks.

## Overview

This security testing suite addresses the critical security issues identified in #288 and #289:

- **#289 Missing Property-Based Tests**: Implements invariant testing to verify properties like "total supply never changes" or "escrow balance always equals sum of deposits"
- **#288 No Fuzz Testing Implementation**: Implements fuzz testing using proptest to automatically generate random, malformed, or edge-case inputs

## Features

### Property-Based Tests

Property-based tests verify that certain invariants always hold true regardless of input values:

- **Total Supply Conservation**: Ensures token supply remains consistent during minting and transfers
- **Token Ownership Consistency**: Verifies that owner_of matches balance mappings
- **Escrow Balance Invariants**: Ensures total escrow balance equals sum of all deposits
- **Multi-Signature Threshold Compliance**: Verifies that multi-sig operations respect required thresholds
- **No Double-Spending Protection**: Prevents multiple releases of the same escrow
- **Cross-Chain Bridge Integrity**: Ensures bridge operations maintain consistency

### Fuzz Testing

Fuzz testing automatically generates random, malformed, or edge-case inputs to discover bugs:

- **Malformed Input Handling**: Tests contract behavior with invalid account IDs, extreme values, and corrupted data
- **Reentrancy Attack Simulation**: Tests resistance to reentrancy attacks
- **Integer Overflow Protection**: Verifies proper handling of arithmetic operations
- **Access Control Bypass Attempts**: Tests for unauthorized access to protected functions
- **Denial of Service Resistance**: Tests resilience against resource exhaustion attacks

### Security Analysis

Comprehensive security vulnerability scanning and analysis:

- **Vulnerability Detection**: Identifies common security issues like integer overflow, reentrancy, access control bypass
- **Risk Assessment**: Calculates security scores and risk metrics
- **Security Reporting**: Generates detailed security analysis reports
- **Recommendations**: Provides actionable security improvement suggestions

## Installation

Add this package to your project dependencies:

```toml
[dependencies]
propchain-security-tests = { path = "../security-tests" }
```

## Usage

### Property-Based Testing

```rust
use propchain_security_tests::*;

// Run property-based tests
#[test]
fn test_token_invariants() {
    // Tests will automatically verify invariants
    // using proptest-generated inputs
}
```

### Fuzz Testing

```rust
use propchain_security_tests::fuzz_tests::*;

// Run fuzz tests
#[test]
fn test_contract_fuzzing() {
    // Tests will generate random/malformed inputs
    // to discover edge cases and vulnerabilities
}
```

### Security Analysis

```rust
use propchain_security_tests::security_analysis::*;

let mut analyzer = SecurityAnalyzer::new();
let result = analyzer.analyze_contract(contract_code);
let report = analyzer.generate_report(&result);

println!("Security Score: {:.1}/100", result.security_score);
println!("Vulnerabilities Found: {}", result.vulnerabilities.len());
```

## Running Tests

### Property-Based Tests

```bash
# Run all property-based tests
cargo test --bin property_based_tests

# Run specific property test
cargo test --bin property_based_tests property_token_total_supply_invariant
```

### Fuzz Tests

```bash
# Run all fuzz tests
cargo test --bin fuzz_tests

# Run with more test cases for thorough testing
cargo test --bin fuzz_tests --release
```

### Security Analysis

```bash
# Run security analysis
cargo run --bin security_analysis

# Generate security report
cargo run --bin security_analysis -- --report
```

## Test Coverage

### Property-Based Tests Coverage

- ✅ Total supply conservation during transfers
- ✅ Token ownership consistency verification
- ✅ Escrow balance invariants
- ✅ Valid escrow status transitions
- ✅ Multi-signature threshold compliance
- ✅ Double-spending prevention
- ✅ Cross-chain bridge integrity

### Fuzz Tests Coverage

- ✅ Malformed input handling (tokens, escrows, accounts)
- ✅ Extreme value testing (u128::MAX, 0, etc.)
- ✅ Reentrancy attack simulation
- ✅ Integer overflow/underflow protection
- ✅ Access control bypass attempts
- ✅ Cross-chain bridge malicious inputs
- ✅ Denial of service resistance

### Security Analysis Coverage

- ✅ Integer overflow detection
- ✅ Reentrancy vulnerability detection
- ✅ Access control weakness detection
- ✅ Front-running vulnerability detection
- ✅ Denial of service vulnerability detection
- ✅ Logic error detection
- ✅ Gas limit issue detection
- ✅ Unauthorized transfer detection
- ✅ Double spending detection
- ✅ Timestamp dependency detection
- ✅ Randomness weakness detection
- ✅ External call manipulation detection

## Security Metrics

The security analysis provides the following metrics:

- **Security Score**: Overall security rating (0-100 scale)
- **Vulnerability Count**: Total number of security issues found
- **Severity Breakdown**: Critical, High, Medium, Low vulnerability counts
- **Attack Surface**: Measure of potential attack vectors (0-1 scale)
- **Exploitability**: Likelihood of successful exploitation (0-1 scale)
- **Impact Score**: Potential damage from successful attacks (0-1 scale)

## Configuration

### Test Configuration

Property-based and fuzz tests can be configured using proptest settings:

```rust
// Increase test cases for more thorough testing
proptest_config!(ProptestConfig::with_cases(10000));

// Adjust failure persistence for debugging
proptest_config!(ProptestConfig {
    cases: 1000,
    failure_persistence: proptest::test_runner::FileFailurePersistence::Direct("test-results".into()),
});
```

### Security Analysis Configuration

```rust
// Custom vulnerability patterns
analyzer.add_pattern("custom_pattern", "description", Severity::High);

// Exclude certain vulnerability types
analyzer.exclude_vulnerability(VulnerabilityType::TimestampDependency);
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Security Tests
on: [push, pull_request]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Property-Based Tests
        run: cargo test --bin property_based_tests
      - name: Run Fuzz Tests
        run: cargo test --bin fuzz_tests --release
      - name: Security Analysis
        run: cargo run --bin security_analysis
```

### Security Score Thresholds

Set minimum security score requirements:

```yaml
- name: Check Security Score
  run: |
    SCORE=$(cargo run --bin security_analysis --quiet | grep "Security Score" | awk '{print $3}')
    if (( $(echo "$SCORE < 80" | bc -l) )); then
      echo "Security score $SCORE is below threshold 80"
      exit 1
    fi
```

## Troubleshooting

### Common Issues

1. **Linker Error**: Install Visual Studio Build Tools with C++ support
2. **Dependency Conflicts**: Ensure compatible Rust toolchain version
3. **Test Timeouts**: Increase test timeout or reduce test case count
4. **Memory Issues**: Use release mode for memory-intensive fuzz tests

### Performance Optimization

- Use `--release` flag for faster fuzz test execution
- Increase test cases gradually to find optimal balance
- Use parallel test execution for large test suites
- Monitor memory usage during intensive fuzz testing

## Contributing

When adding new security tests:

1. Follow the existing code structure and patterns
2. Add comprehensive documentation for new test cases
3. Include both positive and negative test scenarios
4. Update this README with new test coverage
5. Ensure all tests pass before submitting PR

## Security Best Practices

This testing suite helps implement the following security best practices:

- **Defense in Depth**: Multiple layers of security testing
- **Fail-Safe Defaults**: Safe behavior on unexpected inputs
- **Least Privilege**: Proper access control verification
- **Input Validation**: Comprehensive input sanitization testing
- **Error Handling**: Graceful failure under attack conditions
- **Audit Trail**: Comprehensive logging and monitoring

## License

This security testing suite is licensed under the same MIT license as the main PropChain project.

## Acknowledgments

This security testing implementation addresses the critical security issues identified in:

- #289: Missing Property-Based Tests
- #288: No Fuzz Testing Implementation

Special thanks to the PropChain security team for their guidance and requirements.
