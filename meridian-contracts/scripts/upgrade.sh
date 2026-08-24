#!/bin/bash

# Simple upgrade script for PropChain contracts
# Usage: ./upgrade.sh <proxy_address> <new_logic_wasm_path>

PROXY_ADDRESS=$1
NEW_LOGIC_WASM=$2

if [ -z "$PROXY_ADDRESS" ] || [ -z "$NEW_LOGIC_WASM" ]; then
    echo "Usage: ./upgrade.sh <proxy_address> <new_logic_wasm_path>"
    exit 1
fi

echo "Uploading new logic contract..."
UPLOAD_RESULT=$(cargo contract upload --suri //Alice --wasm "$NEW_LOGIC_WASM" --execute)
NEW_CODE_HASH=$(echo "$UPLOAD_RESULT" | grep "Code hash" | awk '{print $NF}')

if [ -z "$NEW_CODE_HASH" ]; then
    echo "Failed to upload new logic contract."
    exit 1
fi

echo "New code hash: $NEW_CODE_HASH"

echo "Upgrading proxy at $PROXY_ADDRESS..."
cargo contract call --contract "$PROXY_ADDRESS" \
    --message upgrade_to \
    --args "$NEW_CODE_HASH" \
    --suri //Alice \
    --execute

echo "Upgrade complete!"
