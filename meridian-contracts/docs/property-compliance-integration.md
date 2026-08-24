# Property Registry - Compliance Integration

## Overview

The PropertyRegistry contract now integrates with the ComplianceRegistry to enforce KYC/AML compliance checks before property transfers and registrations.

## Integration Features

### 1. Compliance Registry Reference
- PropertyRegistry stores an optional reference to the ComplianceRegistry contract
- Can be set during construction or updated by the owner
- If not set, transfers work without compliance checks (backward compatibility)

### 2. Compliance Checks
- **Property Registration**: Checks compliance of the property owner
- **Property Transfer**: **REQUIRES** recipient to be compliant before transfer

### 3. Error Handling
- `NotCompliant`: Recipient account is not compliant
- `ComplianceCheckFailed`: Cross-contract call to compliance registry failed

## Usage

### Deploying with Compliance

```rust
// Deploy ComplianceRegistry first
let compliance_registry = ComplianceRegistry::new()
    .code_hash(compliance_code_hash)
    .endowment(0)
    .salt_bytes(salt)
    .instantiate();

// Deploy PropertyRegistry with compliance
let property_registry = PropertyRegistry::new_with_compliance(compliance_registry)
    .code_hash(property_code_hash)
    .endowment(0)
    .salt_bytes(salt)
    .instantiate();
```

### Setting Compliance Registry After Deployment

```rust
// Owner can set/update compliance registry
property_registry.set_compliance_registry(compliance_registry_address)?;
```

### Property Transfer Flow

```rust
// 1. User must be compliant first
compliance_registry.submit_verification(
    user_account,
    Jurisdiction::US,
    kyc_hash,
    RiskLevel::Low,
    DocumentType::Passport,
    BiometricMethod::FaceRecognition,
    15, // risk score
)?;

// 2. Update AML and sanctions
compliance_registry.update_aml_status(user_account, true, aml_factors)?;
compliance_registry.update_sanctions_status(user_account, true, SanctionsList::OFAC)?;

// 3. User gives consent
compliance_registry.update_consent(user_account, ConsentStatus::Given)?;

// 4. Now property transfer will succeed
property_registry.transfer_property(property_id, user_account)?;
```

## Implementation Details

### Cross-Contract Call

The integration uses ink!'s cross-contract call API:

```rust
fn check_compliance(&self, account: AccountId) -> Result<(), Error> {
    if let Some(compliance_addr) = self.compliance_registry {
        let is_compliant: bool = ink::env::call::build_call::<ink::env::DefaultEnvironment>()
            .call(compliance_addr)
            .exec_input(
                ink::env::call::ExecutionInput::new(
                    ink::env::call::Selector::new(ink::selector_bytes!("is_compliant"))
                ).push_arg(account)
            )
            .returns::<bool>()
            .invoke();

        if is_compliant {
            Ok(())
        } else {
            Err(Error::NotCompliant)
        }
    } else {
        Ok(()) // No compliance registry, allow transfer
    }
}
```

### Compliance Check Points

1. **Property Registration** (`register_property`)
   - Checks if caller is compliant
   - Prevents non-compliant users from registering properties

2. **Property Transfer** (`transfer_property`)
   - **CRITICAL**: Checks if recipient is compliant
   - Transfer fails if recipient is not compliant
   - Ensures only verified users can receive properties

## Security Considerations

### Backward Compatibility
- If no compliance registry is set, transfers work normally
- Allows gradual migration to compliance-enabled system

### Owner Controls
- Only contract owner can set/update compliance registry
- Prevents unauthorized changes to compliance requirements

### Fail-Safe Design
- If compliance registry call fails, transfer is rejected
- Better to reject than allow non-compliant transfers

## Testing

### Test Scenarios

1. **Compliant Transfer**
   ```rust
   // User is compliant → Transfer succeeds
   ```

2. **Non-Compliant Transfer**
   ```rust
   // User is not compliant → Transfer fails with NotCompliant error
   ```

3. **No Compliance Registry**
   ```rust
   // No registry set → Transfer succeeds (backward compatibility)
   ```

4. **Compliance Registry Failure**
   ```rust
   // Registry call fails → Transfer fails with ComplianceCheckFailed
   ```

## Migration Guide

### For Existing Deployments

1. Deploy ComplianceRegistry contract
2. Set compliance registry in PropertyRegistry:
   ```rust
   property_registry.set_compliance_registry(compliance_registry_address)?;
   ```
3. Users must complete KYC/AML verification
4. Property transfers now require compliance

### For New Deployments

1. Deploy both contracts
2. Use `new_with_compliance()` constructor
3. All transfers require compliance from the start

## API Reference

### New Constructors

- `new()` - Creates registry without compliance (backward compatible)
- `new_with_compliance(compliance_registry: AccountId)` - Creates with compliance

### New Messages

- `set_compliance_registry(compliance_registry: AccountId)` - Set compliance registry (owner only)
- `get_compliance_registry()` - Get current compliance registry address

### Modified Messages

- `register_property()` - Now checks caller compliance
- `transfer_property()` - Now checks recipient compliance

### New Errors

- `NotCompliant` - Account is not compliant
- `ComplianceCheckFailed` - Compliance registry call failed

## Best Practices

1. **Always set compliance registry** for production deployments
2. **Verify compliance registry address** before setting
3. **Test compliance checks** in staging environment
4. **Monitor compliance status** of users regularly
5. **Handle compliance expiry** - users may need re-verification

## Example Integration

```typescript
// TypeScript/JavaScript example
async function transferPropertyWithCompliance(
  propertyRegistry: ContractPromise,
  complianceRegistry: ContractPromise,
  propertyId: number,
  recipient: string
) {
  // 1. Check if recipient is compliant
  const { output } = await complianceRegistry.query.isCompliant(
    complianceRegistry.address,
    { gasLimit: -1 },
    recipient
  );
  
  if (!output.toHuman()) {
    throw new Error("Recipient is not compliant");
  }
  
  // 2. Transfer property (will also check compliance on-chain)
  await propertyRegistry.tx.transferProperty(
    { gasLimit: 100000000000 },
    propertyId,
    recipient
  );
}
```

## Summary

The PropertyRegistry now enforces compliance checks, ensuring that:
- ✅ Only compliant users can register properties
- ✅ Only compliant users can receive property transfers
- ✅ System maintains regulatory compliance
- ✅ Backward compatible with existing deployments
