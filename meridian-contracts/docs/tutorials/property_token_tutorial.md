# Property Token Standard Tutorial

This tutorial walks you through using the Property Token Standard to tokenize real estate properties with full ERC-721/ERC-1155 compatibility and cross-chain support.

## Prerequisites

Before starting, ensure you have:
- A basic understanding of blockchain concepts
- Familiarity with Rust and ink! smart contracts
- Access to a Substrate-based blockchain environment
- The PropChain development environment set up

## Table of Contents
1. [Setting Up Your Environment](#setting-up-your-environment)
2. [Creating Your First Property Token](#creating-your-first-property-token)
3. [Managing Property Documents](#managing-property-documents)
4. [Handling Compliance Verification](#handling-compliance-verification)
5. [Transferring Property Ownership](#transferring-property-ownership)
6. [Cross-Chain Token Bridging](#cross-chain-token-bridging)
7. [Advanced Features](#advanced-features)

## Setting Up Your Environment

### Installing Dependencies

First, make sure you have the necessary tools installed:

```bash
# Install Rust if you haven't already
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install cargo-contract
cargo install cargo-contract --locked

# Add the WebAssembly target
rustup target add wasm32-unknown-unknown
```

### Building the Contract

Navigate to the property-token directory and build the contract:

```bash
cd contracts/property-token
cargo contract build
```

This will generate the compiled `.wasm` file needed for deployment.

## Creating Your First Property Token

### Basic Property Registration

Here's how to create a simple property token:

```rust
use property_token::{PropertyToken, PropertyMetadata};

// Create a new contract instance
let mut contract = PropertyToken::new();

// Define property metadata
let metadata = PropertyMetadata {
    location: String::from("123 Oak Street, Downtown, Metropolis"),
    size: 2400, // Square feet
    legal_description: String::from("Single-family residential property with garage"),
    valuation: 650000, // USD value
    documents_url: String::from("ipfs://QmPropertyDocs123"),
};

// Register the property and mint a token
match contract.register_property_with_token(metadata) {
    Ok(token_id) => {
        println!("Successfully created property token with ID: {}", token_id);
        println!("Owner: {:?}", contract.owner_of(token_id).unwrap());
        println!("Balance: {}", contract.balance_of(contract.env().caller()));
    }
    Err(e) => {
        println!("Failed to create property token: {:?}", e);
    }
}
```

### Property Metadata Schema

The PropertyMetadata structure supports comprehensive property information:

```rust
pub struct PropertyMetadata {
    pub location: String,        // Physical address
    pub size: u64,              // Size in square units
    pub legal_description: String, // Legal property description
    pub valuation: u128,        // Current market valuation
    pub documents_url: String,  // Link to additional documents
}
```

## Managing Property Documents

### Attaching Legal Documents

Legal documents are crucial for real estate transactions:

```rust
// Assuming you have a token_id from registration
let token_id = 1;

// Document hashes should be IPFS hashes or similar
let deed_hash = Hash::from([
    0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef,
    0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef,
    0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef,
    0x12, 0x34, 0x56, 0x78, 0x90, 0xab, 0xcd, 0xef
]);

let survey_hash = Hash::from([
    // Different hash for survey document
]);

// Attach different types of documents
contract.attach_legal_document(
    token_id, 
    deed_hash, 
    String::from("Deed")
)?;

contract.attach_legal_document(
    token_id, 
    survey_hash, 
    String::from("Survey")
)?;

println!("Documents attached successfully!");
```

### Document Types Supported

Common document types include:
- **Deed**: Property deed or title document
- **Survey**: Land survey and boundary documentation
- **Inspection**: Property inspection reports
- **Insurance**: Insurance policy documents
- **Tax**: Property tax records
- **Permit**: Building permits and zoning approvals

## Handling Compliance Verification

### Compliance Process

Properties must be verified for compliance before certain operations:

```rust
// Only admin or authorized operators can verify compliance
let admin_account = contract.admin();

// Verify that a property meets compliance requirements
let verification_result = contract.verify_compliance(
    token_id, 
    true  // true = compliant, false = non-compliant
);

match verification_result {
    Ok(_) => {
        println!("Property {} verified as compliant", token_id);
        
        // Check compliance status
        if let Some(compliance_info) = contract.compliance_flags.get(&token_id) {
            println!("Verified by: {:?}", compliance_info.verifier);
            println!("Verification date: {}", compliance_info.verification_date);
            println!("Compliance type: {}", compliance_info.compliance_type);
        }
    }
    Err(e) => {
        println!("Compliance verification failed: {:?}", e);
    }
}
```

### Compliance Requirements

Typical compliance checks include:
- **KYC Verification**: Know Your Customer requirements
- **AML Compliance**: Anti-Money Laundering compliance
- **Regulatory Approval**: Local real estate regulations
- **Tax Compliance**: Property tax payment verification
- **Legal Status**: Clear title and no liens

## Transferring Property Ownership

### Direct Transfer

Simple ownership transfer between parties:

```rust
// Transfer from current owner to new owner
let from_account = contract.owner_of(token_id).unwrap();
let to_account = AccountId::from([0x42; 32]); // New owner

// Current owner initiates the transfer
let transfer_result = contract.transfer_from(
    from_account,
    to_account,
    token_id
);

match transfer_result {
    Ok(_) => {
        println!("Property transferred successfully!");
        println!("New owner: {:?}", contract.owner_of(token_id).unwrap());
        
        // Check updated balances
        println!("Previous owner balance: {}", contract.balance_of(from_account));
        println!("New owner balance: {}", contract.balance_of(to_account));
    }
    Err(e) => {
        println!("Transfer failed: {:?}", e);
    }
}
```

### Using Approvals

For third-party transfers, use the approval system:

```rust
// Owner approves an agent to transfer the property
let owner = contract.owner_of(token_id).unwrap();
let agent = AccountId::from([0x77; 32]);

// Owner approves the agent
contract.approve(agent, token_id)?;

// Agent can now transfer the property
contract.env().set_caller(agent);
contract.transfer_from(owner, AccountId::from([0x88; 32]), token_id)?;

// Check that approval was cleared after transfer
assert_eq!(contract.get_approved(token_id), None);
```

### Batch Operations (ERC-1155)

Transfer multiple properties in one transaction:

```rust
// Batch transfer multiple properties
let from = AccountId::from([0x11; 32]);
let to = AccountId::from([0x22; 32]);
let token_ids = vec![1, 2, 3];
let amounts = vec![1, 1, 1]; // Usually 1 for NFTs
let data = vec![]; // Optional data

contract.safe_batch_transfer_from(
    from,
    to,
    token_ids,
    amounts,
    data
)?;
```

## Cross-Chain Token Bridging

### Bridging to Another Chain

Transfer property tokens across different blockchain networks:

```rust
// Before bridging, ensure compliance is verified
contract.verify_compliance(token_id, true)?;

// Initiate bridging to chain ID 2
let destination_chain = 2;
let recipient_on_dest_chain = AccountId::from([0x33; 32]);

let bridge_result = contract.bridge_to_chain(
    destination_chain,
    token_id,
    recipient_on_dest_chain
);

match bridge_result {
    Ok(_) => {
        println!("Token {} bridged to chain {}", token_id, destination_chain);
        println!("Recipient: {:?}", recipient_on_dest_chain);
        
        // Token is now locked on current chain
        let zero_address = AccountId::from([0x00; 32]);
        assert_eq!(contract.owner_of(token_id), Some(zero_address));
    }
    Err(e) => {
        println!("Bridging failed: {:?}", e);
    }
}
```

### Receiving Bridged Tokens

Handle tokens received from other chains:

```rust
// Only authorized bridge operators can receive bridged tokens
let bridge_operator = contract.bridge_operators()[0]; // Get first operator
contract.env().set_caller(bridge_operator);

// Receive a token bridged from chain 1
let source_chain = 1;
let original_token_id = 42;
let recipient = AccountId::from([0x55; 32]);

let receive_result = contract.receive_bridged_token(
    source_chain,
    original_token_id,
    recipient
);

match receive_result {
    Ok(_) => {
        println!("Bridged token received successfully!");
        println!("New token created for recipient: {:?}", recipient);
    }
    Err(e) => {
        println!("Failed to receive bridged token: {:?}", e);
    }
}
```

### Bridge Operator Management

Manage who can operate the cross-chain bridge:

```rust
// Add a new bridge operator (admin only)
let new_operator = AccountId::from([0x66; 32]);
contract.add_bridge_operator(new_operator)?;

// Remove an operator
contract.remove_bridge_operator(new_operator)?;
```

## Advanced Features

### Ownership History Tracking

View the complete ownership history of a property:

```rust
if let Some(history) = contract.get_ownership_history(token_id) {
    println!("Ownership History for Token {}:", token_id);
    for (index, transfer) in history.iter().enumerate() {
        println!("{}. From: {:?} -> To: {:?} at timestamp: {}", 
                 index + 1, 
                 transfer.from, 
                 transfer.to, 
                 transfer.timestamp);
    }
}
```

### Querying Token Information

Get comprehensive information about a property token:

```rust
// Get basic ownership info
let owner = contract.owner_of(token_id).unwrap();
let balance = contract.balance_of(owner);

// Get property details
if let Some(property_info) = contract.token_properties.get(&token_id) {
    println!("Property Location: {}", property_info.metadata.location);
    println!("Property Size: {} sq ft", property_info.metadata.size);
    println!("Valuation: ${}", property_info.metadata.valuation);
    println!("Registered At: {}", property_info.registered_at);
}

// Get URI for metadata (ERC-1155)
if let Some(uri) = contract.uri(token_id) {
    println!("Metadata URI: {}", uri);
}
```

### Batch Queries

Efficiently query multiple tokens at once:

```rust
// Get balances for multiple accounts and tokens
let accounts = vec![
    AccountId::from([0x11; 32]),
    AccountId::from([0x22; 32]),
    AccountId::from([0x33; 32])
];
let token_ids = vec![1, 2, 3];

let balances = contract.balance_of_batch(accounts, token_ids);
for (i, balance) in balances.iter().enumerate() {
    println!("Account {} balance for token {}: {}", i, token_ids[i], balance);
}
```

## Error Handling Best Practices

### Common Error Scenarios

```rust
use property_token::Error;

fn handle_property_operations(contract: &mut PropertyToken) {
    let token_id = 1;
    
    // Handle various error cases
    match contract.transfer_from(AccountId::from([0x11; 32]), AccountId::from([0x22; 32]), token_id) {
        Ok(_) => println!("Transfer successful"),
        Err(Error::TokenNotFound) => println!("Token does not exist"),
        Err(Error::Unauthorized) => println!("Not authorized to transfer this token"),
        Err(Error::PropertyNotFound) => println!("Property record not found"),
        Err(_) => println!("Operation failed"),
    }
}
```

### Validation Before Operations

Always validate before critical operations:

```rust
fn safe_transfer(contract: &mut PropertyToken, token_id: u64, to: AccountId) -> Result<(), Error> {
    // Check if token exists
    if contract.owner_of(token_id).is_none() {
        return Err(Error::TokenNotFound);
    }
    
    // Check compliance for bridging
    let compliance = contract.compliance_flags.get(&token_id)
        .ok_or(Error::ComplianceFailed)?;
    
    if !compliance.verified {
        return Err(Error::ComplianceFailed);
    }
    
    // Proceed with transfer
    let from = contract.owner_of(token_id).unwrap();
    contract.transfer_from(from, to, token_id)
}
```

## Testing Your Implementation

### Unit Testing Example

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use ink::env::{DefaultEnvironment, test};

    #[ink::test]
    fn test_complete_property_lifecycle() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        // 1. Register property
        let metadata = PropertyMetadata {
            location: String::from("Test Property"),
            size: 1000,
            legal_description: String::from("Test Description"),
            valuation: 100000,
            documents_url: String::from("ipfs://test"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        assert_eq!(contract.owner_of(token_id), Some(accounts.alice));
        
        // 2. Attach document
        let doc_hash = Hash::from([1u8; 32]);
        contract.attach_legal_document(token_id, doc_hash, String::from("Deed")).unwrap();
        
        // 3. Verify compliance
        test::set_caller::<DefaultEnvironment>(contract.admin());
        contract.verify_compliance(token_id, true).unwrap();
        
        // 4. Transfer ownership
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.transfer_from(accounts.alice, accounts.bob, token_id).unwrap();
        assert_eq!(contract.owner_of(token_id), Some(accounts.bob));
    }
}
```

## Deployment Checklist

Before deploying to production:

- [ ] All unit tests pass
- [ ] Integration tests completed
- [ ] Security audit performed
- [ ] Gas optimization verified
- [ ] Documentation reviewed
- [ ] Emergency procedures established
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested

## Next Steps

After mastering the basics, explore:

1. **Fractional Ownership**: Implement partial ownership schemes
2. **Rental Income Distribution**: Automatic rent distribution to token holders
3. **Governance Systems**: Community decision-making for property management
4. **Advanced Metadata**: Rich property descriptions with multimedia
5. **Oracle Integration**: Real-time property valuation updates
6. **DeFi Integration**: Property-backed lending and yield farming

## Troubleshooting

### Common Issues

**Issue**: "TokenNotFound" error
**Solution**: Verify the token ID exists and hasn't been burned

**Issue**: "Unauthorized" during transfer
**Solution**: Check that you're the owner or have proper approval

**Issue**: Bridge operations failing
**Solution**: Ensure compliance is verified and you're an authorized bridge operator

**Issue**: High gas costs
**Solution**: Optimize batch operations and consider lazy evaluation patterns

## Resources

- [Official Documentation](../property_token_standard.md)
- [API Reference](../../target/doc/property_token/)
- [Contract Source Code](../../contracts/property-token/src/lib.rs)
- [Test Suite](../../tests/property_token_tests.rs)

---

*This tutorial covers version 1.0.0 of the Property Token Standard. For the latest updates, check the official repository.*