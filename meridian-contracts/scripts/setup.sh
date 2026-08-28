#!/usr/bin/env bash

# PropChain Development Setup Script
# This script sets up the complete development environment for PropChain smart contracts

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Install Rust if not present
install_rust() {
    if ! command_exists rustc; then
        log_info "Installing Rust..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
        log_success "Rust installed successfully"
    else
        log_info "Rust is already installed"
    fi
}

# Install cargo-contract
install_cargo_contract() {
    if ! command_exists cargo-contract; then
        log_info "Installing cargo-contract..."
        cargo install cargo-contract --locked --force
        log_success "cargo-contract installed successfully"
    else
        log_info "cargo-contract is already installed"
    fi
}

# Add WASM target
add_wasm_target() {
    log_info "Adding WASM target..."
    rustup target add wasm32-unknown-unknown
    log_success "WASM target added"
}

# Install pre-commit hooks
install_pre_commit() {
    if ! command_exists pre-commit; then
        log_info "Installing pre-commit..."
        pip install pre-commit
        log_success "pre-commit installed successfully"
    else
        log_info "pre-commit is already installed"
    fi
}

# Setup git hooks
setup_git_hooks() {
    log_info "Setting up git hooks..."
    pre-commit install
    pre-commit install --hook-type commit-msg
    log_success "Git hooks installed"
}

# Build contracts
build_contracts() {
    log_info "Building contracts..."
    cargo contract build
    log_success "Contracts built successfully"
}

# Run tests
run_tests() {
    log_info "Running tests..."
    cargo test
    log_success "All tests passed"
}

# Main setup function
main() {
    log_info "Starting PropChain development environment setup..."
    
    # Install dependencies
    install_rust
    install_cargo_contract
    add_wasm_target
    install_pre_commit
    
    # Setup development environment
    setup_git_hooks
    build_contracts
    run_tests
    
    log_success "PropChain development environment setup completed!"
    echo
    log_info "Next steps:"
    echo "  1. Start developing: cd contracts/lib"
    echo "  2. Run tests: cargo test"
    echo "  3. Build contracts: cargo contract build"
    echo "  4. Deploy locally: cargo contract instantiate"
}

# Run main function
main "$@"
