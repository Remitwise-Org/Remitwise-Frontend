# Basic Property Registration Example

This example demonstrates how to register a property on the PropChain blockchain using the PropertyRegistry contract.

## Prerequisites

- Rust and cargo-contract installed
- Local Substrate node running
- Basic understanding of ink! contracts

## Step 1: Contract Setup

```rust
// lib.rs
#![cfg_attr(not(feature = "std"), no_std)]

use ink::prelude::*;
use ink::contract_ref;

#[ink::contract]
mod property_registry {
    use ink::storage::Mapping;

    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct PropertyMetadata {
        pub location: String,
        pub size: u64,
        pub legal_description: String,
        pub valuation: Balance,
    }

    #[ink(storage)]
    pub struct PropertyRegistry {
        properties: Mapping<AccountId, PropertyMetadata>,
        property_count: u64,
    }

    #[ink(event)]
    pub struct PropertyRegistered {
        #[ink(topic)]
        owner: AccountId,
        property_id: u64,
    }

    impl PropertyRegistry {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                properties: Mapping::default(),
                property_count: 0,
            }
        }

        #[ink(message)]
        pub fn register_property(
            &mut self,
            metadata: PropertyMetadata,
        ) -> Result<u64, Error> {
            let caller = self.env().caller();
            
            // Store property
            self.properties.insert(&caller, &metadata);
            self.property_count += 1;

            // Emit event
            self.env().emit_event(PropertyRegistered {
                owner: caller,
                property_id: self.property_count,
            });

            Ok(self.property_count)
        }

        #[ink(message)]
        pub fn get_property(&self, owner: AccountId) -> Option<PropertyMetadata> {
            self.properties.get(&owner)
        }
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        PropertyNotFound,
        Unauthorized,
    }
}
```

## Step 2: Build and Deploy

```bash
# Build the contract
cargo contract build

# Start local node (in separate terminal)
substrate-node-template --dev

# Deploy contract
cargo contract instantiate \
  --constructor new \
  --args "" \
  --suri //Alice \
  --salt $(date +%s)
```

## Step 3: Interact with Contract

```bash
# Register a property
cargo contract call \
  --contract <CONTRACT_ADDRESS> \
  --message register_property \
  --args '{"location":"123 Main St","size":2000,"legal_description":"Lot 1 Block 2","valuation":500000}' \
  --suri //Alice

# Query property
cargo contract call \
  --contract <CONTRACT_ADDRESS> \
  --message get_property \
  --args //Alice \
  --suri //Alice
```

## Step 4: Test with JavaScript

```javascript
// test-property-registration.js
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');

async function main() {
    // Connect to local node
    const wsProvider = new WsProvider('ws://localhost:9944');
    const api = await ApiPromise.create({ provider: wsProvider });

    // Load contract ABI (from build artifacts)
    const abi = require('./target/ink/property_registry.json');
    
    // Contract address from deployment
    const contractAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    
    const contract = new ContractPromise(api, abi, contractAddress);

    // Account to use
    const alice = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';

    // Property metadata
    const metadata = {
        location: '123 Main St, Anytown, USA',
        size: 2000,
        legal_description: 'Lot 1, Block 2, Riverside Subdivision',
        valuation: 500000
    };

    try {
        // Register property
        const { gasRequired } = await contract.query.registerProperty(
            alice,
            { gasLimit: -1 },
            metadata
        );

        console.log('Gas required:', gasRequired.toString());

        // Send transaction
        const tx = contract.tx.registerProperty(
            { gasLimit: gasRequired },
            metadata
        );

        const hash = await tx.signAndSend(alice);
        console.log('Transaction hash:', hash);

        // Query property
        const { result, output } = await contract.query.getProperty(
            alice,
            { gasLimit: -1 },
            alice
        );

        if (result.isOk) {
            console.log('Property registered:', output.toHuman());
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error);
```

## Step 5: Run the Test

```bash
# Install dependencies
npm install @polkadot/api @polkadot/api-contract

# Run the test
node test-property-registration.js
```

## Expected Output

```
Gas required: 1234567890
Transaction hash: 0x1234567890abcdef...
Property registered: {
  location: '123 Main St, Anytown, USA',
  size: 2000,
  legal_description: 'Lot 1, Block 2, Riverside Subdivision',
  valuation: 500000
}
```

## Advanced Features

### Property Transfer

```rust
#[ink(message)]
pub fn transfer_property(
    &mut self,
    from: AccountId,
    to: AccountId,
) -> Result<(), Error> {
    let caller = self.env().caller();
    
    // Check authorization
    if caller != from {
        return Err(Error::Unauthorized);
    }

    // Get property
    let property = self.properties.get(&from)
        .ok_or(Error::PropertyNotFound)?;

    // Transfer ownership
    self.properties.remove(&from);
    self.properties.insert(&to, &property);

    // Emit transfer event
    self.env().emit_event(PropertyTransferred {
        from,
        to,
        property_id: self.property_count,
    });

    Ok(())
}
```

### Property Search

```rust
#[ink(message)]
pub fn search_properties_by_location(
    &self,
    location_query: String,
) -> Vec<(AccountId, PropertyMetadata)> {
    // Note: This is a simplified example
    // In production, you'd want more efficient search methods
    let mut results = Vec::new();
    
    // This would require iterating through all properties
    // Consider using indexed storage for production
    
    results
}
```

## Best Practices

1. **Gas Optimization**: Use efficient data structures
2. **Error Handling**: Provide clear error messages
3. **Access Control**: Implement proper authorization
4. **Events**: Emit events for important state changes
5. **Testing**: Write comprehensive tests

## Troubleshooting

### Common Issues

1. **Insufficient Gas**: Increase gas limit
2. **Contract Not Found**: Verify contract address
3. **Invalid Arguments**: Check parameter types
4. **Permission Denied**: Ensure correct caller

### Debug Tips

```rust
// Add debug logging
#[ink(message)]
pub fn debug_register_property(&mut self, metadata: PropertyMetadata) -> Result<u64, Error> {
    let caller = self.env().caller();
    ink::env::debug_println!("Registering property for: {:?}", caller);
    
    // ... rest of implementation
}
```

## Next Steps

- Add property validation logic
- Implement escrow functionality
- Create frontend interface
- Add IPFS integration for documents
- Implement property valuation oracles
