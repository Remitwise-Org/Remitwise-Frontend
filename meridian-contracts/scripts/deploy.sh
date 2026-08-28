#!/usr/bin/env bash

# PropChain Deployment Script
# This script handles deployment of contracts to various networks

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK=${NETWORK:-local}
CONTRACTS_DIR="contracts"
WORKSPACE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Network configurations
declare -A NETWORKS=(
    ["local"]="ws://localhost:9944"
    ["westend"]="wss://westend-rpc.polkadot.io"
    ["rococo"]="wss://rococo-rpc.polkadot.io"
    ["polkadot"]="wss://rpc.polkadot.io"
)

# Default accounts for different networks
declare -A DEFAULT_ACCOUNTS=(
    ["local"]="//Alice"
    ["westend"]=""
    ["rococo"]=""
    ["polkadot"]=""
)

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

# Load environment variables
load_env() {
    local env_file="$WORKSPACE_ROOT/.env.$NETWORK"
    if [ -f "$env_file" ]; then
        log_info "Loading environment from $env_file"
        source "$env_file"
    fi
}

# Validate network
validate_network() {
    if [[ -z "${NETWORKS[$NETWORK]:-}" ]]; then
        log_error "Unknown network: $NETWORK"
        log_info "Available networks: ${!NETWORKS[*]}"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command_exists cargo-contract; then
        log_error "cargo-contract not found. Please install it with: cargo install cargo-contract --locked"
        exit 1
    fi
    
    if [ "$NETWORK" != "local" ] && [ -z "${SURI:-}" ]; then
        log_error "SURI (mnemonic) not set for network: $NETWORK"
        log_info "Set it with: export SURI='your mnemonic phrase'"
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

# Build contracts for deployment
build_contracts() {
    log_info "Building contracts for deployment..."
    
    cd "$WORKSPACE_ROOT"
    ./scripts/build.sh --release --no-test --no-lint
    
    log_success "Contracts built successfully"
}

# Deploy single contract
deploy_contract() {
    local contract_name="$1"
    local contract_dir="$CONTRACTS_DIR/$contract_name"
    
    if [ ! -d "$contract_dir" ]; then
        log_error "Contract directory not found: $contract_dir"
        return 1
    fi
    
    log_info "Deploying contract: $contract_name"
    
    cd "$WORKSPACE_ROOT/$contract_dir"
    
    # Upload contract code
    log_info "Uploading contract code..."
    local upload_result
    upload_result=$(cargo contract upload \
        --url "${NETWORKS[$NETWORK]}" \
        --suri "${SURI:-${DEFAULT_ACCOUNTS[$NETWORK]}}" \
        --output-json)
    
    if [ $? -ne 0 ]; then
        log_error "Failed to upload contract: $contract_name"
        echo "$upload_result"
        return 1
    fi
    
    # Extract code hash from upload result
    local code_hash
    code_hash=$(echo "$upload_result" | jq -r '.codeHash')
    
    if [ -z "$code_hash" ] || [ "$code_hash" = "null" ]; then
        log_error "Failed to extract code hash from upload result"
        echo "$upload_result"
        return 1
    fi
    
    log_info "Contract uploaded with code hash: $code_hash"
    
    # Instantiate contract
    log_info "Instantiating contract..."
    local instantiate_result
    instantiate_result=$(cargo contract instantiate \
        --constructor new \
        --args "" \
        --url "${NETWORKS[$NETWORK]}" \
        --suri "${SURI:-${DEFAULT_ACCOUNTS[$NETWORK]}}" \
        --code-hash "$code_hash" \
        --salt "$(date +%s)" \
        --output-json)
    
    if [ $? -ne 0 ]; then
        log_error "Failed to instantiate contract: $contract_name"
        echo "$instantiate_result"
        return 1
    fi
    
    # Extract contract address from instantiate result
    local contract_address
    contract_address=$(echo "$instantiate_result" | jq -r '.contract')
    
    if [ -z "$contract_address" ] || [ "$contract_address" = "null" ]; then
        log_error "Failed to extract contract address from instantiate result"
        echo "$instantiate_result"
        return 1
    fi
    
    log_success "Contract deployed at address: $contract_address"
    
    # Save deployment info
    local deployment_file="$WORKSPACE_ROOT/deployments/$NETWORK/$contract_name.json"
    mkdir -p "$(dirname "$deployment_file")"
    
    cat > "$deployment_file" << EOF
{
    "network": "$NETWORK",
    "contract": "$contract_name",
    "address": "$contract_address",
    "codeHash": "$code_hash",
    "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "deployedBy": "${SURI:-${DEFAULT_ACCOUNTS[$NETWORK]}}"
}
EOF
    
    log_info "Deployment info saved to: $deployment_file"
    
    echo "$contract_address"
}

# Deploy all contracts
deploy_all_contracts() {
    log_info "Deploying all contracts to $NETWORK..."
    
    local deployed_contracts=()
    
    # Find all contract directories
    for contract_dir in "$WORKSPACE_ROOT/$CONTRACTS_DIR"/*/; do
        if [ -f "$contract_dir/Cargo.toml" ]; then
            local contract_name
            contract_name=$(basename "$contract_dir")
            
            local contract_address
            contract_address=$(deploy_contract "$contract_name")
            
            if [ $? -eq 0 ]; then
                deployed_contracts+=("$contract_name:$contract_address")
            fi
        fi
    done
    
    log_success "Deployment completed!"
    log_info "Deployed contracts:"
    for contract in "${deployed_contracts[@]}"; do
        echo "  - $contract"
    done
}

# Verify deployment
verify_deployment() {
    local contract_name="$1"
    local contract_address="$2"
    
    log_info "Verifying deployment of $contract_name at $contract_address..."
    
    cd "$WORKSPACE_ROOT/$CONTRACTS_DIR/$contract_name"
    
    # Get contract info
    local info_result
    info_result=$(cargo contract info \
        --contract "$contract_address" \
        --url "${NETWORKS[$NETWORK]}" \
        --output-json)
    
    if [ $? -eq 0 ]; then
        log_success "Contract verification successful"
        echo "$info_result" | jq .
    else
        log_error "Contract verification failed"
        echo "$info_result"
        return 1
    fi
}

# List deployments
list_deployments() {
    local deployments_dir="$WORKSPACE_ROOT/deployments/$NETWORK"
    
    if [ ! -d "$deployments_dir" ]; then
        log_info "No deployments found for network: $NETWORK"
        return 0
    fi
    
    log_info "Deployments for network: $NETWORK"
    
    for deployment_file in "$deployments_dir"/*.json; do
        if [ -f "$deployment_file" ]; then
            local contract_name
            contract_name=$(basename "$deployment_file" .json)
            
            local contract_address
            contract_address=$(jq -r '.address' "$deployment_file")
            
            local deployed_at
            deployed_at=$(jq -r '.deployedAt' "$deployment_file")
            
            echo "  - $contract_name: $contract_address (deployed at $deployed_at)"
        fi
    done
}

# Main deployment function
main() {
    local action="deploy"
    local contract_name=""
    local verify=false
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --network)
                NETWORK="$2"
                shift 2
                ;;
            --contract)
                contract_name="$2"
                shift 2
                ;;
            --verify)
                verify=true
                shift
                ;;
            --list)
                action="list"
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --network NETWORK    Target network (local, westend, rococo, polkadot)"
                echo "  --contract NAME      Deploy specific contract"
                echo "  --verify             Verify deployment after deploying"
                echo "  --list               List existing deployments"
                echo "  --help               Show this help message"
                echo ""
                echo "Environment variables:"
                echo "  SURI                 Account mnemonic phrase"
                echo "  NETWORK              Target network (default: local)"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    log_info "Starting PropChain deployment..."
    
    # Load environment variables
    load_env
    
    # Validate network
    validate_network
    
    # Check prerequisites
    check_prerequisites
    
    case $action in
        "deploy")
            # Build contracts
            build_contracts
            
            if [ -n "$contract_name" ]; then
                # Deploy specific contract
                local contract_address
                contract_address=$(deploy_contract "$contract_name")
                
                if [ $? -eq 0 ] && [ "$verify" = true ]; then
                    verify_deployment "$contract_name" "$contract_address"
                fi
            else
                # Deploy all contracts
                deploy_all_contracts
                
                if [ "$verify" = true ]; then
                    # Verify all deployed contracts
                    for deployment_file in "$WORKSPACE_ROOT/deployments/$NETWORK"/*.json; do
                        if [ -f "$deployment_file" ]; then
                            local name
                            name=$(basename "$deployment_file" .json)
                            local address
                            address=$(jq -r '.address' "$deployment_file")
                            verify_deployment "$name" "$address"
                        fi
                    done
                fi
            fi
            ;;
        "list")
            list_deployments
            ;;
    esac
    
    log_success "Deployment process completed!"
}

# Run main function with all arguments
main "$@"
