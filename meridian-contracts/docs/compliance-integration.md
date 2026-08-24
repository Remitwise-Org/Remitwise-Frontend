# Compliance System Integration Guide

This guide explains how to integrate off-chain KYC, AML, and sanctions services with the PropChain Compliance Registry contract.

## Architecture Overview

The compliance system uses a hybrid on-chain/off-chain architecture:

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   User/Client   │────────▶│  Compliance      │────────▶│  Off-chain      │
│                 │         │  Registry        │         │  Services       │
│                 │◀────────│  (Smart Contract)│◀────────│  (KYC/AML/etc) │
└─────────────────┘         └──────────────────┘         └─────────────────┘
```

## Integration Patterns

### 1. Verification Request Flow

Users create verification requests on-chain, which are processed by off-chain services:

```rust
// 1. User creates verification request
let request_id = contract.create_verification_request(
    Jurisdiction::US,
    document_hash,      // Hash of uploaded document
    biometric_hash,     // Hash of biometric data
)?;

// 2. Off-chain service listens for VerificationRequestCreated event
// 3. Service processes verification off-chain
// 4. Service calls process_verification_request with results
contract.process_verification_request(
    request_id,
    kyc_hash,
    risk_level,
    document_type,
    biometric_method,
    risk_score,
)?;
```

### 2. Service Provider Registration

Register your KYC/AML service as a provider:

```rust
// Register as KYC service provider
contract.register_service_provider(
    provider_account_id,
    0, // 0=KYC, 1=AML, 2=Sanctions, 3=All
)?;

// This automatically grants verifier permissions
```

### 3. Batch Processing

For transaction monitoring and bulk operations:

```rust
// Batch AML check for multiple accounts
let accounts = vec![account1, account2, account3];
let risk_factors = vec![
    AMLRiskFactors { /* ... */ },
    AMLRiskFactors { /* ... */ },
    AMLRiskFactors { /* ... */ },
];

let results = contract.batch_aml_check(accounts, risk_factors)?;

// Batch sanctions check
contract.batch_sanctions_check(
    accounts,
    SanctionsList::OFAC,
    vec![true, false, true],
)?;
```

## Event Listening

### Key Events for Integration

1. **VerificationRequestCreated**
   - Emitted when user creates verification request
   - Listen for this to process new KYC requests
   - Contains: `account`, `request_id`, `jurisdiction`, `timestamp`

2. **VerificationUpdated**
   - Emitted when verification status changes
   - Use for status updates and notifications

3. **ComplianceCheckPerformed**
   - Emitted during compliance checks
   - Useful for transaction monitoring

4. **AuditLogCreated**
   - All compliance actions are logged
   - Use for reporting and auditing

## Integration Examples

### JavaScript/TypeScript Integration

```typescript
import { ApiPromise, WsProvider } from '@polkadot/api';
import { ContractPromise } from '@polkadot/api-contract';

// Connect to blockchain
const api = await ApiPromise.create({
  provider: new WsProvider('wss://your-node.com')
});

// Load compliance contract
const contract = new ContractPromise(api, abi, contractAddress);

// Listen for verification requests
api.query.system.events((events) => {
  events.forEach((record) => {
    const { event } = record;
    if (event.section === 'compliance_registry') {
      if (event.method === 'VerificationRequestCreated') {
        const [account, requestId, jurisdiction, timestamp] = event.data;
        handleVerificationRequest(account, requestId, jurisdiction);
      }
    }
  });
});

async function handleVerificationRequest(account, requestId, jurisdiction) {
  // 1. Get request details
  const { output } = await contract.query.getVerificationRequest(
    serviceAccount,
    { gasLimit: -1 },
    requestId
  );
  
  const request = output.toHuman();
  
  // 2. Process verification off-chain
  const verificationResult = await processKYC(
    request.documentHash,
    request.biometricHash,
    jurisdiction
  );
  
  // 3. Submit results to contract
  await contract.tx.processVerificationRequest(
    { gasLimit: 100000000000 },
    requestId,
    verificationResult.kycHash,
    verificationResult.riskLevel,
    verificationResult.documentType,
    verificationResult.biometricMethod,
    verificationResult.riskScore
  ).signAndSend(serviceAccount);
}
```

### Python Integration

```python
from substrateinterface import SubstrateInterface, ContractInstance

# Connect to node
substrate = SubstrateInterface(url="ws://localhost:9944")

# Load contract
contract = ContractInstance.create_from_address(
    contract_address=contract_address,
    metadata_file=metadata_file,
    substrate=substrate
)

# Listen for events
def handle_event(event):
    if event['event_id'] == 'VerificationRequestCreated':
        account = event['attributes'][0]
        request_id = event['attributes'][1]
        jurisdiction = event['attributes'][2]
        
        # Process verification
        result = process_kyc_verification(account, request_id)
        
        # Submit to contract
        contract.exec('process_verification_request', {
            'request_id': request_id,
            'kyc_hash': result['kyc_hash'],
            'risk_level': result['risk_level'],
            # ... other fields
        }, keypair=service_keypair)

# Subscribe to events
substrate.subscribe_block_headers(handle_event)
```

## Service Provider Setup

### 1. Register Your Service

```rust
// As contract owner
contract.register_service_provider(
    your_service_account,
    0, // Service type: 0=KYC, 1=AML, 2=Sanctions, 3=All
)?;
```

### 2. Implement Event Listener

Your off-chain service should:
- Listen for `VerificationRequestCreated` events
- Fetch request details using `get_verification_request(request_id)`
- Process verification using your KYC/AML APIs
- Submit results using `process_verification_request()`

### 3. Handle Different Service Types

- **KYC Service (type 0)**: Handles identity verification
- **AML Service (type 1)**: Handles anti-money laundering checks
- **Sanctions Service (type 2)**: Handles sanctions list screening
- **Full Service (type 3)**: Handles all compliance checks

## Data Privacy & Encryption

### Encrypted Data Storage

Sensitive data should be encrypted before storing:

```rust
// Store hash of encrypted data location (e.g., IPFS)
contract.store_encrypted_data_hash(
    account,
    encrypted_data_hash, // Hash of encrypted document location
)?;
```

### GDPR Compliance

Users can manage their consent:

```rust
// User gives consent
contract.update_consent(account, ConsentStatus::Given)?;

// User withdraws consent
contract.update_consent(account, ConsentStatus::Withdrawn)?;

// Request data deletion (after retention period)
contract.request_data_deletion(account)?;
```

## Monitoring & Reporting

### Compliance Summary

Get compliance status for multiple accounts:

```rust
let accounts = vec![account1, account2, account3];
let summary = contract.get_compliance_summary(accounts);
// Returns: Vec<(AccountId, bool)> - (account, is_compliant)
```

### Audit Logs

Retrieve audit trail for an account:

```rust
let logs = contract.get_audit_logs(account, limit)?;
// Returns: Vec<AuditLog> with all compliance actions
```

### Re-verification Monitoring

Check if accounts need re-verification:

```rust
let needs_reverify = contract.needs_reverification(
    account,
    30 // days before expiry
)?;
```

## Best Practices

### 1. Error Handling

Always handle contract errors:

```rust
match contract.process_verification_request(...) {
    Ok(_) => println!("Success"),
    Err(Error::NotAuthorized) => println!("Not authorized"),
    Err(Error::NotVerified) => println!("Not verified"),
    Err(e) => println!("Error: {:?}", e),
}
```

### 2. Gas Optimization

- Use batch operations for multiple accounts
- Cache jurisdiction rules
- Minimize on-chain storage operations

### 3. Security

- Verify service provider registration
- Validate all inputs before submitting
- Use encrypted storage for sensitive data
- Implement rate limiting for API calls

### 4. Compliance

- Respect data retention policies
- Handle GDPR consent properly
- Maintain audit logs
- Regular re-verification checks

## Testing Integration

### Local Testing

1. Deploy contract to local node:
```bash
cargo contract build
cargo contract instantiate --constructor new --args "" --suri //Alice
```

2. Run test service:
```bash
# Your service should connect to ws://localhost:9944
# and listen for events
```

### Integration Test Example

```rust
#[ink::test]
fn test_verification_flow() {
    let mut contract = ComplianceRegistry::new();
    let user = AccountId::from([0x01; 32]);
    
    // Create request
    let request_id = contract.create_verification_request(
        Jurisdiction::US,
        [0u8; 32],
        [0u8; 32],
    ).unwrap();
    
    // Process as service
    contract.process_verification_request(
        request_id,
        [0u8; 32],
        RiskLevel::Low,
        DocumentType::Passport,
        BiometricMethod::FaceRecognition,
        15,
    ).unwrap();
    
    assert!(contract.is_compliant(user));
}
```

## API Reference

### Key Functions

- `create_verification_request()` - Create new verification request
- `process_verification_request()` - Process verification (service only)
- `register_service_provider()` - Register service (owner only)
- `batch_aml_check()` - Batch AML processing
- `batch_sanctions_check()` - Batch sanctions check
- `get_compliance_summary()` - Get compliance status
- `get_audit_logs()` - Get audit trail
- `update_consent()` - Manage GDPR consent
- `store_encrypted_data_hash()` - Store encrypted data reference

## Support

For integration support:
- Check contract events for status updates
- Review audit logs for debugging
- Use `get_compliance_data()` to check account status
- Monitor `VerificationRequestCreated` events for new requests
