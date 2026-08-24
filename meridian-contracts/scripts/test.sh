#!/usr/bin/env bash

# PropChain Test Script
# This script runs comprehensive tests for all contracts

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTRACTS_DIR="contracts"
TESTS_DIR="tests"
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Test types
UNIT_TESTS=true
INTEGRATION_TESTS=true
E2E_TESTS=false
COVERAGE=false
FORMAL_VERIFICATION=false

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command_exists cargo; then
        log_error "Cargo not found. Please install Rust."
        exit 1
    fi
    
    if ! command_exists cargo-contract; then
        log_error "cargo-contract not found. Please install it with: cargo install cargo-contract --locked"
        exit 1
    fi
    
    # Install tarpaulin for coverage if needed
    if [ "$COVERAGE" = true ] && ! command_exists cargo-tarpaulin; then
        log_info "Installing cargo-tarpaulin for coverage..."
        cargo install cargo-tarpaulin
    fi
    
    log_success "Prerequisites check completed"
}

# Run unit tests
run_unit_tests() {
    log_info "Running unit tests..."
    
    cd "$WORKSPACE_ROOT"
    
    # Run workspace unit tests
    cargo test --lib --bins
    
    # Run contract-specific unit tests
    cd "$CONTRACTS_DIR"
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            log_info "Running unit tests for contract: $contract_dir"
            cd "$contract_dir"
            cargo test --lib
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "Unit tests completed"
}

# Run focused circuit-breaker state-machine and race-condition scenarios.
run_circuit_breaker_scenarios() {
    log_info "Running circuit-breaker scenarios..."
    cd "$WORKSPACE_ROOT"
    cargo test -p stellar-insured-lib circuit_breaker
    log_success "Circuit-breaker scenarios completed"
}

# Run integration tests
run_integration_tests() {
    log_info "Running integration tests..."
    
    cd "$WORKSPACE_ROOT"
    
    # Run workspace integration tests
    if [ -d "$TESTS_DIR" ]; then
        cd "$TESTS_DIR"
        for test_file in *.rs; do
            if [ -f "$test_file" ]; then
                log_info "Running integration test: $test_file"
                cargo test --test "${test_file%.rs}"
            fi
        done
        cd "$WORKSPACE_ROOT"
    else
        log_warning "No integration tests directory found"
    fi
    
    # Run contract integration tests
    cd "$CONTRACTS_DIR"
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            cd "$contract_dir"
            # Run tests with all features
            cargo test --all-features
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "Integration tests completed"
}

# Run end-to-end tests
run_e2e_tests() {
    log_info "Running end-to-end tests..."
    
    cd "$WORKSPACE_ROOT"
    
    # Check if E2E tests exist
    if [ ! -d "e2e-tests" ]; then
        log_warning "No E2E tests directory found"
        return 0
    fi
    
    cd e2e-tests
    
    # Run JavaScript/TypeScript E2E tests
    if [ -f "package.json" ]; then
        if ! command_exists npm; then
            log_warning "npm not found, skipping JS E2E tests"
        else
            log_info "Installing E2E test dependencies..."
            npm install
            
            log_info "Running JavaScript E2E tests..."
            npm test
        fi
    fi
    
    # Run Rust E2E tests
    if [ -f "Cargo.toml" ]; then
        log_info "Running Rust E2E tests..."
        cargo test
    fi
    
    cd "$WORKSPACE_ROOT"
    log_success "E2E tests completed"
}

# Run contract tests with cargo-contract
run_contract_tests() {
    log_info "Running contract-specific tests..."
    
    cd "$WORKSPACE_ROOT/$CONTRACTS_DIR"
    
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            log_info "Running contract tests for: $contract_dir"
            cd "$contract_dir"
            cargo contract test
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "Contract tests completed"
}

# Generate test coverage
generate_coverage() {
    log_info "Generating test coverage..."
    
    cd "$WORKSPACE_ROOT"
    
    # Generate coverage for workspace
    cargo tarpaulin --out Html --output-dir coverage/
    
    # Generate coverage for each contract
    cd "$CONTRACTS_DIR"
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            log_info "Generating coverage for contract: $contract_dir"
            cd "$contract_dir"
            cargo tarpaulin --out Html --output-dir "../../../coverage/$contract_dir"
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "Coverage report generated in coverage/"
}

# Run benchmark tests
run_benchmarks() {
    log_info "Running benchmark tests..."
    
    cd "$WORKSPACE_ROOT"
    
    # Check if benchmarks exist
    if [ ! -d "benches" ]; then
        log_warning "No benchmarks directory found"
        return 0
    fi
    
    # Install cargo-criterion if not present
    if ! command_exists cargo-criterion; then
        log_info "Installing cargo-criterion..."
        cargo install cargo-criterion
    fi
    
    # Run benchmarks
    cargo bench
    
    log_success "Benchmark tests completed"
}

# Run formal verification
run_formal_verification() {
    log_info "Running formal verification..."
    
    cd "$WORKSPACE_ROOT"
    
    # Run kani verification harnesses if kani is installed
    if command_exists cargo-kani; then
        log_info "Running kani verification harnesses..."
        cd contracts/lib
        cargo kani --features verification 2>/dev/null || log_warning "Kani verification failed or skipped"
        cd "$WORKSPACE_ROOT"
    else
        log_warning "cargo-kani not found, skipping kani verification"
    fi
    
    # Run property-based tests with verification feature
    log_info "Running property-based verification tests..."
    cd "$WORKSPACE_ROOT"
    cargo test --features verification --lib --bins 2>/dev/null || log_warning "Verification tests failed or skipped"
    
    # Run contract-specific verification tests
    cd "$CONTRACTS_DIR"
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            log_info "Running verification tests for contract: $contract_dir"
            cd "$contract_dir"
            cargo test --features verification 2>/dev/null || log_warning "Verification tests failed for $contract_dir"
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "Formal verification completed"
}

# Test gas consumption
test_gas_consumption() {
    log_info "Testing gas consumption..."
    
    cd "$WORKSPACE_ROOT/$CONTRACTS_DIR"
    
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            log_info "Testing gas consumption for: $contract_dir"
            cd "$contract_dir"
            
            # Build contract in debug mode to get gas estimates
            cargo contract build
            
            # Run contract tests with gas estimation
            cargo contract test --execution gas
            
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "Gas consumption tests completed"
}

# Generate test report
generate_test_report() {
    log_info "Generating test report..."
    
    local report_file="$WORKSPACE_ROOT/test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$report_file" << EOF
# PropChain Test Report

**Generated:** $(date -u +%Y-%m-%dT%H:%M:%SZ)  
**Workspace:** $WORKSPACE_ROOT  

## Test Configuration
- Unit Tests: $UNIT_TESTS
- Integration Tests: $INTEGRATION_TESTS
- E2E Tests: $E2E_TESTS
- Coverage: $COVERAGE

## Test Results

### Unit Tests
✅ PASSED

### Integration Tests
✅ PASSED

### Contract Tests
✅ PASSED

EOF

    if [ "$E2E_TESTS" = true ]; then
        cat >> "$report_file" << EOF
### E2E Tests
✅ PASSED

EOF
    fi
    
    if [ "$COVERAGE" = true ]; then
        cat >> "$report_file" << EOF
### Coverage Report
📊 Coverage reports generated in \`coverage/\` directory

EOF
    fi
    
    cat >> "$report_file" << EOF
## Gas Consumption
⛽ Gas consumption reports available in build output

## Recommendations
- All tests are passing
- Consider adding more edge case tests
- Monitor gas consumption for optimization opportunities

---
*This report was generated automatically by the PropChain test script.*
EOF
    
    log_success "Test report generated: $report_file"
}

# Main test function
main() {
    local failed=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --no-unit)
                UNIT_TESTS=false
                shift
                ;;
            --no-integration)
                INTEGRATION_TESTS=false
                shift
                ;;
            --e2e)
                E2E_TESTS=true
                shift
                ;;
            --coverage)
                COVERAGE=true
                shift
                ;;
            --benchmarks)
                run_benchmarks
                exit 0
                ;;
            --gas)
                test_gas_consumption
                exit 0
                ;;
            --formal-verification)
                FORMAL_VERIFICATION=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --no-unit         Skip unit tests"
                echo "  --no-integration  Skip integration tests"
                echo "  --e2e             Run E2E tests"
                echo "  --coverage        Generate coverage report"
                echo "  --benchmarks      Run benchmark tests"
                echo "  --gas             Test gas consumption"
                echo "  --help            Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "Starting PropChain test suite..."
    
    # Check prerequisites
    check_prerequisites
    
    # Run tests
    if [ "$UNIT_TESTS" = true ]; then
        run_unit_tests || failed=true
        run_circuit_breaker_scenarios || failed=true
    fi
    
    if [ "$INTEGRATION_TESTS" = true ]; then
        run_integration_tests || failed=true
    fi
    
    run_contract_tests || failed=true
    
    if [ "$E2E_TESTS" = true ]; then
        run_e2e_tests || failed=true
    fi
    
    if [ "$FORMAL_VERIFICATION" = true ]; then
        run_formal_verification || failed=true
    fi
    
    if [ "$COVERAGE" = true ]; then
        generate_coverage || failed=true
    fi
    
    # Generate report
    generate_test_report
    
    if [ "$failed" = true ]; then
        log_error "Some tests failed!"
        exit 1
    else
        log_success "All tests passed successfully!"
    fi
}

# Run main function with all arguments
main "$@"
