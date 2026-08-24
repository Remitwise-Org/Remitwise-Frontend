# Tutorial: Cross-Chain Property Bridging

This tutorial explains how to move property tokens between supported blockchain networks using the PropChain multi-signature bridge.

## Prerequisites

- Property token owned on the source chain.
- Sufficient gas for the operation (estimate using `estimate_bridge_gas`).
- Knowledge of the destination chain ID.

## 1. Estimating Gas Costs

Before initiating a bridge, it is recommended to estimate the gas costs on the destination chain.

```rust
let gas_estimate = bridge.estimate_bridge_gas(token_id, destination_chain_id)?;
println!("Estimated destination gas: {} units", gas_estimate);
```

## 2. Initiating the Bridge Request

The bridging process starts with a multisig request. You specify the token, destination, recipient, and the required number of operator signatures.

```rust
let request_id = bridge.initiate_bridge_multisig(
    token_id,
    destination_chain_id,
    recipient_account,
    2, // Require 2 operator signatures
    Some(100), // Timeout after 100 blocks
    metadata   // Property metadata (for recursive minting)
)?;
```

The property token will be **locked** on the source chain during this process.

## 3. Signature Collection

Bridge operators (monitored by off-chain services) will verify the request and provide signatures.

```rust
// This is typically done by authorized operators
bridge.sign_bridge_request(request_id, true)?;
```

## 4. Executing the Bridge

Once the signature threshold is reached, the bridge can be executed to finalize the transfer.

```rust
bridge.execute_bridge(request_id)?;
```

Upon execution, the token will be minted on the destination chain with the preserved metadata.

## 5. Monitoring Status

You can track the progress of your bridge operation.

```rust
let info = bridge.monitor_bridge_status(request_id).unwrap();
match info.status {
    BridgeOperationStatus::Completed => println!("Bridge successful!"),
    BridgeOperationStatus::Pending => println!("Needs {} more signatures", info.signatures_required - info.signatures_collected),
    BridgeOperationStatus::Failed => println!("Bridge failed: {}", info.error_message.unwrap_or_default()),
    _ => println!("Bridge in transit..."),
}
```

## 6. Recovery from Failure

If a bridge request expires or fails, the token can be recovered on the source chain.

```rust
bridge.recover_failed_bridge(request_id, RecoveryAction::UnlockToken)?;
```

## Best Practices

- Always check `is_bridge_operator` if you are implementing an operator service.
- Set reasonable `timeout_blocks` to prevent forever-locked tokens in case of network issues.
- Use `get_bridge_history` to provide users with a history of their cross-chain transfers.
