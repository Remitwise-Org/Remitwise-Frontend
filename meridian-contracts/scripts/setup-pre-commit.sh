#!/usr/bin/env bash

# PropChain Pre-commit Setup Script
# This script sets up pre-commit hooks for the project

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

# Install pre-commit
install_pre_commit() {
    if ! command_exists pre-commit; then
        log_info "Installing pre-commit..."
        
        # Try pip first
        if command_exists pip3; then
            pip3 install pre-commit
        elif command_exists pip; then
            pip install pre-commit
        else
            log_error "pip not found. Please install Python and pip first."
            exit 1
        fi
        
        log_success "pre-commit installed successfully"
    else
        log_info "pre-commit is already installed"
    fi
}

# Install additional dependencies
install_dependencies() {
    log_info "Installing additional dependencies..."
    
    # Install detect-secrets
    if ! command_exists detect-secrets; then
        pip3 install detect-secrets || pip install detect-secrets
    fi
    
    # Install shfmt
    if ! command_exists shfmt; then
        log_info "Installing shfmt..."
        if command_exists brew; then
            brew install shfmt
        elif command_exists cargo; then
            cargo install shfmt
        else
            log_warning "shfmt not installed. Please install it manually."
        fi
    fi
    
    # Install hadolint
    if ! command_exists hadolint; then
        log_info "Installing hadolint..."
        if command_exists brew; then
            brew install hadolint
        elif command_exists cargo; then
            cargo install hadolint
        else
            log_warning "hadolint not installed. Please install it manually."
        fi
    fi
    
    # Install mdformat
    if ! command_exists mdformat; then
        pip3 install mdformat || pip install mdformat
        pip3 install mdformat-gfm mdformat-tables || pip install mdformat-gfm mdformat-tables
    fi
    
    log_success "Dependencies installed"
}

# Setup pre-commit hooks
setup_hooks() {
    log_info "Setting up pre-commit hooks..."
    
    # Install hooks
    pre-commit install
    
    # Install commit-msg hook
    pre-commit install --hook-type commit-msg
    
    # Create initial secrets baseline
    if [ ! -f ".secrets.baseline" ]; then
        log_info "Creating secrets baseline..."
        detect-secrets scan --baseline .secrets.baseline
    fi
    
    log_success "Pre-commit hooks installed"
}

# Test pre-commit hooks
test_hooks() {
    log_info "Testing pre-commit hooks..."
    
    # Run all hooks on current files
    pre-commit run --all-files
    
    log_success "Pre-commit hooks test completed"
}

# Create commit message template
create_commit_template() {
    log_info "Creating commit message template..."
    
    cat > .gitmessage << 'EOF'
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>

# Type should be one of the following:
# * feat (new feature)
# * fix (bug fix)
# * docs (documentation)
# * style (formatting, missing semi colons, etc; no code change)
# * refactor (refactoring production code)
# * test (adding tests, refactoring test; no production code change)
# * chore (updating build tasks, package manager configs, etc; no production code change)
#
# Scope is the scope of the change. Examples:
# * property-registry
# * escrow
# * token
# * ci
# * docs
#
# Subject should use impertivite tone and say what you did.
# The body should go into detail about changes made.
# The footer should contain any JIRA or GitHub issue references.
EOF
    
    # Configure git to use the template
    git config commit.template .gitmessage
    
    log_success "Commit message template created"
}

# Main setup function
main() {
    local test_only=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --test-only)
                test_only=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --test-only    Only test existing hooks"
                echo "  --help         Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "Setting up PropChain pre-commit hooks..."
    
    if [ "$test_only" = false ]; then
        # Install dependencies
        install_pre_commit
        install_dependencies
        
        # Setup hooks
        setup_hooks
        
        # Create commit template
        create_commit_template
    fi
    
    # Test hooks
    test_hooks
    
    log_success "Pre-commit setup completed!"
    echo
    log_info "Next steps:"
    echo "  1. Make changes to your code"
    echo "  2. Try to commit: git commit -m 'feat: add new feature'"
    echo "  3. The hooks will automatically run and format/lint your code"
    echo "  4. If hooks fail, fix the issues and try again"
}

# Run main function with all arguments
main "$@"
