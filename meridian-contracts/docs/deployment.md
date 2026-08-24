# Deployment Guide

This guide covers the deployment process for PropChain smart contracts across different networks and environments.

## Prerequisites

- Rust and cargo-contract installed
- Substrate node (for local deployment)
- Account with sufficient funds (for testnet/mainnet deployment)
- Network-specific configuration

## Build Process

### Development Build

```bash
# Build in debug mode
cargo contract build

# Build with verbose output
cargo contract build --verbose
```

### Production Build

```bash
# Build optimized contract
cargo contract build --release

# Verify build artifacts
ls -la target/ink/
```

## Local Deployment

### Start Local Node

```bash
# Start a local Substrate node
substrate-node-template --dev --tmp

# Or use a pre-configured node
./scripts/start-local-node.sh
```

### Deploy Contract

```bash
# Instantiate contract
cargo contract instantiate \
  --constructor new \
  --args "" \
  --suri //Alice \
  --salt $(date +%s)

# Get contract address
cargo contract info
```

## Testnet Deployment

### Network Configuration

#### Westend Testnet

```bash
# Set environment variables
export NETWORK=westend
export NODE_URL=wss://westend-rpc.polkadot.io
export SURI=your mnemonic phrase
```

#### Rococo Testnet

```bash
export NETWORK=rococo
export NODE_URL=wss://rococo-rpc.polkadot.io
```

### Deployment Steps

```bash
# 1. Build contract
cargo contract build --release

# 2. Upload contract code
cargo contract upload \
  --url $NODE_URL \
  --suri $SURI

# 3. Instantiate contract
cargo contract instantiate \
  --constructor new \
  --args "" \
  --url $NODE_URL \
  --suri $SURI \
  --salt $(date +%s)
```

## Mainnet Deployment

### Pre-deployment Checklist

- [ ] Contract audited by security firm
- [ ] All tests passing
- [ ] Gas optimization completed
- [ ] Documentation updated
- [ ] Emergency procedures documented
- [ ] Funding allocated for deployment costs

### Deployment Process

```bash
# 1. Final build verification
cargo contract build --release
cargo test --release

# 2. Upload to mainnet
cargo contract upload \
  --url wss://rpc.polkadot.io \
  --suri "$MAINNET_SURI" \
  --confirm

# 3. Instantiate with verification
cargo contract instantiate \
  --constructor new \
  --args "" \
  --url wss://rpc.polkadot.io \
  --suri "$MAINNET_SURI" \
  --confirm \
  --salt $(date +%s)
```

## Network-specific Considerations

### Polkadot

- **Gas Costs**: Higher than testnets
- **Finality**: ~24 seconds
- **Security**: Relay chain security
- **Upgradeability**: Proxy pattern recommended

### Kusama

- **Gas Costs**: Lower than Polkadot
- **Finality**: ~12 seconds
- **Experimental**: Faster feature rollout
- **Risk**: Higher network risk

### Parachains

- **Configuration**: Varies by parachain
- **Gas Model**: May differ from relay chain
- **Security**: Depends on parachain
- **Integration**: May require custom adapters

## Contract Verification

### On-chain Verification

```bash
# Verify contract code matches source
cargo contract verify \
  --contract $CONTRACT_ADDRESS \
  --url $NODE_URL
```

### Source Code Verification

```bash
# Generate build info
cargo contract build --release --output-json > build-info.json

# Compare with deployed version
./scripts/verify-deployment.sh $CONTRACT_ADDRESS build-info.json
```

## Monitoring and Maintenance

### Deployment Monitoring

```bash
# Monitor contract events
./scripts/monitor-contract.sh $CONTRACT_ADDRESS

# Check contract health
./scripts/health-check.sh $CONTRACT_ADDRESS
```

### Upgrade Process

```bash
# 1. Upload new implementation code
cargo contract upload --new-version

# 2. Upgrade the deployed proxy by code hash
./scripts/upgrade.sh $PROXY_ADDRESS $NEW_LOGIC_WASM

# 3. Verify the proxy is now pointing to the new implementation
cargo contract call --contract $PROXY_ADDRESS --message code_hash --suri "$ADMIN_SURI"
```

> Note: Use the `propchain_traits::Upgradeable` interface and the `contracts/proxy` upgrade proxy to preserve storage while replacing logic.

## Troubleshooting

### Common Issues

#### Insufficient Balance

```bash
# Check account balance
./scripts/check-balance.sh $ACCOUNT_ADDRESS

# Transfer funds if needed
./scripts/transfer-funds.sh $ACCOUNT_ADDRESS $AMOUNT
```

#### Gas Limit Exceeded

```bash
# Estimate gas usage
cargo contract estimate-gas \
  --contract $CONTRACT_ADDRESS \
  --method $METHOD_NAME \
  --args "$ARGS"

# Increase gas limit
cargo contract call \
  --contract $CONTRACT_ADDRESS \
  --method $METHOD_NAME \
  --args "$ARGS" \
  --gas-limit 1000000000000
```

#### Transaction Failed

```bash
# Check transaction status
./scripts/check-tx.sh $TRANSACTION_HASH

# Debug with verbose output
cargo contract call \
  --contract $CONTRACT_ADDRESS \
  --method $METHOD_NAME \
  --args "$ARGS" \
  --verbose
```

## Security Best Practices

### Private Key Management

```bash
# Use secure key storage
export SURI=$(pass show polkadot/mainnet/deployer)

# Never log sensitive data
set +x  # Disable command logging
cargo contract instantiate --suri "$SURI"
set -x
```

### Multi-signature Deployment

```bash
# Deploy with multi-sig
./scripts/deploy-multisig.sh \
  --contract $CONTRACT_ADDRESS \
  --threshold 2 \
  --signers $SIGNER1 $SIGNER2 $SIGNER3
```

### Emergency Procedures

```bash
# Emergency pause
./scripts/emergency-pause.sh $CONTRACT_ADDRESS

# Emergency upgrade
./scripts/emergency-upgrade.sh $CONTRACT_ADDRESS $NEW_CODE_HASH
```

## Automation

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Contract
on:
  push:
    tags: ['v*']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - name: Build Contract
        run: cargo contract build --release
      - name: Deploy to Testnet
        run: ./scripts/deploy-testnet.sh
        env:
          TESTNET_SURI: ${{ secrets.TESTNET_SURI }}
```

### Deployment Scripts

```bash
#!/bin/bash
# scripts/deploy.sh

set -euo pipefail

NETWORK=${1:-testnet}
CONTRACT=${2:-property-registry}

echo "Deploying $CONTRACT to $NETWORK..."

case $NETWORK in
  local)
    NODE_URL="ws://localhost:9944"
    SURI="//Alice"
    ;;
  westend)
    NODE_URL="wss://westend-rpc.polkadot.io"
    SURI="$WESTEND_SURI"
    ;;
  polkadot)
    NODE_URL="wss://rpc.polkadot.io"
    SURI="$POLKADOT_SURI"
    ;;
  *)
    echo "Unknown network: $NETWORK"
    exit 1
    ;;
esac

cargo contract upload \
  --url "$NODE_URL" \
  --suri "$SURI" \
  --confirm

echo "Deployment completed successfully!"
```

## Post-deployment

### Documentation Update

- Update contract addresses in documentation
- Add deployment notes to changelog
- Update API documentation if needed
- Notify stakeholders of deployment

### Community Communication

- Announce deployment on Discord/Telegram
- Post deployment summary on GitHub
- Update project status page
- Send notification to subscribers

### Performance Monitoring

- Set up monitoring dashboards
- Configure alerts for anomalies
- Track gas usage patterns
- Monitor contract interaction metrics
