#!/usr/bin/env bash

# PropChain Local Development Setup
# Sets up local Substrate node for contract testing

set -euo pipefail

NODE_PORT=${NODE_PORT:-9944}
NODE_WS_PORT=${NODE_WS_PORT:-9945}
RPC_PORT=${RPC_PORT:-9933}
DATA_DIR=${DATA_DIR:-"/tmp/propchain-dev"}

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

start_local_node() {
    log_info "Starting local Substrate node..."
    
    # Create data directory if it doesn't exist
    mkdir -p "$DATA_DIR"
    
    # Start node in development mode
    substrate-node-template \
        --dev \
        --tmp \
        --ws-port "$NODE_WS_PORT" \
        --rpc-port "$RPC_PORT" \
        --rpc-cors all \
        --alice \
        --unsafe-ws-external \
        --unsafe-rpc-external
}

stop_local_node() {
    log_info "Stopping local node..."
    pkill -f substrate-node-template || true
    log_success "Local node stopped"
}

case "${1:-start}" in
    start)
        start_local_node
        ;;
    stop)
        stop_local_node
        ;;
    restart)
        stop_local_node
        sleep 2
        start_local_node
        ;;
    *)
        echo "Usage: $0 {start|stop|restart}"
        exit 1
        ;;
esac
