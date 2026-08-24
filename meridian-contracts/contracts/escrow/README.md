# Property Escrow System - Advanced Escrow Contract

## Overview

The Property Escrow System is a comprehensive smart contract solution for secure property transactions on the Substrate/Polkadot ecosystem. It provides advanced features including multi-signature validation, document custody, condition-based releases, and dispute resolution mechanisms.

## Features

### 🔐 Multi-Signature Security
- **Configurable Signature Requirements**: Set custom thresholds for approvals
- **Multiple Signers**: Support for multiple participants in escrow transactions
- **Approval Types**: Separate signature tracking for Release, Refund, and Emergency Override
- **Signature Verification**: Prevents double-signing and ensures threshold compliance

### 📄 Document Custody System
- **Document Hash Storage**: Store cryptographic hashes of legal documents on-chain
- **Document Verification**: Multi-party verification of uploaded documents
- **Document Metadata**: Track uploader, upload time, and verification status
- **Document Types**: Categorize documents (e.g., Title Deed, Inspection Report)

### ✅ Condition Validation Framework
- **Custom Conditions**: Add specific conditions that must be met before release
- **Condition Tracking**: Monitor which conditions are fulfilled
- **Multi-Party Verification**: Participants can verify condition completion
- **Flexible Requirements**: Support for any number of conditions per escrow

### ⚖️ Dispute Resolution
- **Dispute Raising**: Buyers or sellers can raise disputes
- **Admin Resolution**: Designated admin can resolve disputes
- **Status Tracking**: Disputes block fund release until resolved
- **Resolution History**: Complete audit trail of dispute resolution

### ⏰ Time-Lock Mechanism
- **Delayed Release**: Set minimum time before funds can be released
- **Timestamp Validation**: Automatic enforcement of time-lock periods
- **Flexible Configuration**: Optional time-locks per escrow

### 🔍 Complete Audit Trail
- **Action Logging**: Every action is logged with timestamp and actor
- **Immutable History**: Audit logs cannot be modified
- **Detailed Information**: Logs include action type and relevant details
- **Query Support**: Retrieve complete audit history for any escrow

### 🚨 Emergency Override
- **Admin Control**: Designated admin can override in emergencies
- **Audit Logged**: All emergency actions are fully audited
- **Flexible Direction**: Can release to either seller or buyer

## Usage Examples

### Creating an Advanced Escrow

```rust
let participants = vec![buyer, seller, inspector, lawyer];
let escrow_id = contract.create_escrow_advanced(
    property_id,
    1_000_000_000_000,  // 1 token
    buyer,
    seller,
    participants,
    3,  // Require 3 signatures
    Some(timestamp + 7_days),  // 7-day time lock
)?;
```

### Multi-Signature Approval

```rust
// Each participant signs
contract.sign_approval(escrow_id, ApprovalType::Release)?;
```

### Releasing Funds

```rust
// Once all conditions met and signatures collected
contract.release_funds(escrow_id)?;
```

## Testing

```bash
# Run all escrow contract tests
cargo test --package propchain-escrow
```

## Building

```bash
# Development build
cargo build --package propchain-escrow

# Contract build (WASM)
cargo contract build --manifest-path contracts/escrow/Cargo.toml
```

## License

MIT License
