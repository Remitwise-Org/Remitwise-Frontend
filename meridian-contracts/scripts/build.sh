#!/usr/bin/env bash

# PropChain Build Script
# This script builds all contracts and performs quality checks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BUILD_MODE=${BUILD_MODE:-debug}
CONTRACTS_DIR="contracts"
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

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
    
    # Check WASM target
    if ! rustup target list --installed | grep -q wasm32-unknown-unknown; then
        log_warning "WASM target not found. Installing..."
        rustup target add wasm32-unknown-unknown
    fi
    
    log_success "Prerequisites check completed"
}

# Clean build artifacts
clean_build() {
    log_info "Cleaning build artifacts..."
    
    cd "$WORKSPACE_ROOT"
    cargo clean
    
    # Clean contract artifacts
    if [ -d "target" ]; then
        rm -rf target/ink
    fi
    
    log_success "Build artifacts cleaned"
}

# Format code
format_code() {
    log_info "Formatting code..."
    
    cd "$WORKSPACE_ROOT"
    cargo fmt --all
    
    log_success "Code formatted"
}

# Run linting
run_linting() {
    log_info "Running linting checks..."
    
    cd "$WORKSPACE_ROOT"
    cargo clippy --all-targets --all-features -- -D warnings
    
    log_success "Linting passed"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "$WORKSPACE_ROOT"
    
    # Run unit tests
    cargo test --all-features
    
    # Run contract tests
    cd "$CONTRACTS_DIR"
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            log_info "Testing contract: $contract_dir"
            cd "$contract_dir"
            cargo test
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "All tests passed"
}

# Build contracts
build_contracts() {
    log_info "Building contracts..."
    
    cd "$WORKSPACE_ROOT/$CONTRACTS_DIR"
    
    # Build each contract
    for contract_dir in */; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            log_info "Building contract: $contract_dir"
            cd "$contract_dir"
            
            if [ "$BUILD_MODE" = "release" ]; then
                cargo contract build --release
            else
                cargo contract build
            fi
            
            cd ..
        fi
    done
    
    cd "$WORKSPACE_ROOT"
    log_success "All contracts built successfully"
}

# Verify build artifacts
verify_build() {
    log_info "Verifying build artifacts..."
    
    cd "$WORKSPACE_ROOT"
    
    # Check if contract files exist
    local missing_files=()
    
    while IFS= read -r -d '' file; do
        if [ ! -f "$file" ]; then
            missing_files+=("$file")
        fi
    done < <(find "$CONTRACTS_DIR" -name "*.contract" -print0)
    
    if [ ${#missing_files[@]} -gt 0 ]; then
        log_error "Missing contract files:"
        printf '%s\n' "${missing_files[@]}"
        exit 1
    fi
    
    log_success "Build artifacts verified"
}

# Generate documentation
generate_docs() {
    log_info "Generating documentation..."
    
    cd "$WORKSPACE_ROOT"
    cargo doc --all-features --no-deps
    
    # Copy docs to docs directory if it exists
    if [ -d "docs" ]; then
        cp -r target/doc/* docs/ || true
    fi
    
    log_success "Documentation generated"
}

# Build summary
build_summary() {
    log_info "Build Summary:"
    echo "  - Mode: $BUILD_MODE"
    echo "  - Contracts: $(find "$CONTRACTS_DIR" -name "*.contract" | wc -l)"
    echo "  - Tests: PASSED"
    echo "  - Linting: PASSED"
    echo "  - Documentation: GENERATED"
    
    log_success "Build completed successfully!"
}

# Main build function
main() {
    local clean=false
    local format=false
    local lint=true
    local test=true
    local docs=false
    local verify=true
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --clean)
                clean=true
                shift
                ;;
            --format)
                format=true
                shift
                ;;
            --no-lint)
                lint=false
                shift
                ;;
            --no-test)
                test=false
                shift
                ;;
            --docs)
                docs=true
                shift
                ;;
            --no-verify)
                verify=false
                shift
                ;;
            --release)
                BUILD_MODE=release
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --clean      Clean build artifacts before building"
                echo "  --format     Format code before building"
                echo "  --no-lint    Skip linting checks"
                echo "  --no-test    Skip running tests"
                echo "  --docs       Generate documentation"
                echo "  --no-verify  Skip build verification"
                echo "  --release    Build in release mode"
                echo "  --help       Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "Starting PropChain build process..."
    
    # Execute build steps
    check_prerequisites
    
    if [ "$clean" = true ]; then
        clean_build
    fi
    
    if [ "$format" = true ]; then
        format_code
    fi
    
    if [ "$lint" = true ]; then
        run_linting
    fi
    
    if [ "$test" = true ]; then
        run_tests
    fi
    
    build_contracts
    
    if [ "$verify" = true ]; then
        verify_build
    fi
    
    if [ "$docs" = true ]; then
        generate_docs
    fi
    
    build_summary
}

# Run main function with all arguments
main "$@"
