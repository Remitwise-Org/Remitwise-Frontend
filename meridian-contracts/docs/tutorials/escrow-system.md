# Escrow System Tutorial

This tutorial demonstrates how to implement and use the PropChain escrow system for secure property transfers.

## Overview

The escrow system provides:
- Secure fund holding during property transfers
- Multi-signature release mechanisms
- Time-locked transactions
- Dispute resolution capabilities

## Contract Implementation

### Escrow Contract Structure

```rust
// escrow.rs
#![cfg_attr(not(feature = "std"), no_std)]

use ink::prelude::*;
use ink::storage::Mapping;

#[ink::contract]
mod escrow {
    use ink::storage::Mapping;

    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct EscrowInfo {
        pub id: u64,
        pub property_id: u64,
        pub seller: AccountId,
        pub buyer: AccountId,
        pub amount: Balance,
        pub status: EscrowStatus,
        pub created_at: Timestamp,
        pub release_time: Option<Timestamp>,
    }

    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum EscrowStatus {
        Created,
        Funded,
        Approved,
        Released,
        Refunded,
        Disputed,
    }

    #[ink(storage)]
    pub struct EscrowContract {
        escrows: Mapping<u64, EscrowInfo>,
        user_escrows: Mapping<AccountId, Vec<u64>>,
        escrow_count: u64,
        reentrancy_guard: bool,
    }

    #[ink(event)]
    pub struct EscrowCreated {
        #[ink(topic)]
        escrow_id: u64,
        property_id: u64,
        amount: Balance,
    }

    #[ink(event)]
    pub struct EscrowReleased {
        #[ink(topic)]
        escrow_id: u64,
        to: AccountId,
        amount: Balance,
    }

    impl EscrowContract {
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                escrows: Mapping::default(),
                user_escrows: Mapping::default(),
                escrow_count: 0,
                reentrancy_guard: false,
            }
        }

        #[ink(message, payable)]
        pub fn create_escrow(
            &mut self,
            property_id: u64,
            seller: AccountId,
            release_time: Option<Timestamp>,
        ) -> Result<u64, Error> {
            self.begin_reentrancy_check()?;

            let buyer = self.env().caller();
            let amount = self.env().transferred_value();
            
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }

            self.escrow_count += 1;
            let escrow_id = self.escrow_count;

            let escrow = EscrowInfo {
                id: escrow_id,
                property_id,
                seller,
                buyer,
                amount,
                status: EscrowStatus::Funded,
                created_at: self.env().block_timestamp(),
                release_time,
            };

            // Store escrow
            self.escrows.insert(&escrow_id, &escrow);

            // Update user escrows
            let mut buyer_escrows = self.user_escrows.get(&buyer).unwrap_or_default();
            buyer_escrows.push(escrow_id);
            self.user_escrows.insert(&buyer, &buyer_escrows);

            let mut seller_escrows = self.user_escrows.get(&seller).unwrap_or_default();
            seller_escrows.push(escrow_id);
            self.user_escrows.insert(&seller, &seller_escrows);

            // Emit event
            self.env().emit_event(EscrowCreated {
                escrow_id,
                property_id,
                amount,
            });

            self.end_reentrancy_check();
            Ok(escrow_id)
        }

        #[ink(message)]
        pub fn approve_escrow(&mut self, escrow_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();
            let mut escrow = self.escrows.get(&escrow_id)
                .ok_or(Error::EscrowNotFound)?;

            // Only buyer can approve
            if caller != escrow.buyer {
                return Err(Error::Unauthorized);
            }

            if escrow.status != EscrowStatus::Funded {
                return Err(Error::InvalidStatus);
            }

            escrow.status = EscrowStatus::Approved;
            self.escrows.insert(&escrow_id, &escrow);

            Ok(())
        }

        #[ink(message)]
        pub fn release_escrow(&mut self, escrow_id: u64) -> Result<(), Error> {
            self.begin_reentrancy_check()?;

            let caller = self.env().caller();
            let mut escrow = self.escrows.get(&escrow_id)
                .ok_or(Error::EscrowNotFound)?;

            // Check authorization (seller or approved buyer)
            if caller != escrow.seller && escrow.status != EscrowStatus::Approved {
                return Err(Error::Unauthorized);
            }

            // Check time lock
            if let Some(release_time) = escrow.release_time {
                if self.env().block_timestamp() < release_time {
                    return Err(Error::TimeLockNotExpired);
                }
            }

            if escrow.status != EscrowStatus::Funded && escrow.status != EscrowStatus::Approved {
                return Err(Error::InvalidStatus);
            }

            // Release funds to seller
            if self.env().transfer(escrow.seller, escrow.amount).is_err() {
                return Err(Error::TransferFailed);
            }

            escrow.status = EscrowStatus::Released;
            self.escrows.insert(&escrow_id, &escrow);

            // Emit event
            self.env().emit_event(EscrowReleased {
                escrow_id,
                to: escrow.seller,
                amount: escrow.amount,
            });

            self.end_reentrancy_check();
            Ok(())
        }

        #[ink(message)]
        pub fn refund_escrow(&mut self, escrow_id: u64) -> Result<(), Error> {
            self.begin_reentrancy_check()?;

            let caller = self.env().caller();
            let mut escrow = self.escrows.get(&escrow_id)
                .ok_or(Error::EscrowNotFound)?;

            // Only seller can refund
            if caller != escrow.seller {
                return Err(Error::Unauthorized);
            }

            if escrow.status != EscrowStatus::Funded {
                return Err(Error::InvalidStatus);
            }

            // Refund to buyer
            if self.env().transfer(escrow.buyer, escrow.amount).is_err() {
                return Err(Error::TransferFailed);
            }

            escrow.status = EscrowStatus::Refunded;
            self.escrows.insert(&escrow_id, &escrow);

            self.end_reentrancy_check();
            Ok(())
        }

        #[ink(message)]
        pub fn get_escrow(&self, escrow_id: u64) -> Option<EscrowInfo> {
            self.escrows.get(&escrow_id)
        }

        #[ink(message)]
        pub fn get_user_escrows(&self, user: AccountId) -> Vec<u64> {
            self.user_escrows.get(&user).unwrap_or_default()
        }

        // Reentrancy protection
        fn begin_reentrancy_check(&mut self) -> Result<(), Error> {
            if self.reentrancy_guard {
                return Err(Error::ReentrantCall);
            }
            self.reentrancy_guard = true;
            Ok(())
        }

        fn end_reentrancy_check(&mut self) {
            self.reentrancy_guard = false;
        }
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        EscrowNotFound,
        Unauthorized,
        InvalidAmount,
        InvalidStatus,
        TransferFailed,
        ReentrantCall,
        TimeLockNotExpired,
    }
}
```

## Usage Examples

### Creating an Escrow

```javascript
// create-escrow.js
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');

async function createEscrow() {
    const api = await ApiPromise.create({
        provider: new WsProvider('ws://localhost:9944')
    });

    const abi = require('./target/ink/escrow.json');
    const contractAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const contract = new ContractPromise(api, abi, contractAddress);

    const buyer = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'; // Alice
    const seller = '4fL7p...'; // Bob
    const propertyId = 1;
    const amount = '500000000000000000'; // 0.5 UNIT

    // Create escrow with funds
    const tx = contract.tx.createEscrow(
        {
            gasLimit: -1,
            value: amount
        },
        propertyId,
        seller,
        null // No time lock
    );

    const hash = await tx.signAndSend(buyer);
    console.log('Escrow created:', hash);

    // Get escrow details
    const { result, output } = await contract.query.getEscrow(
        buyer,
        { gasLimit: -1 },
        1 // escrow_id
    );

    if (result.isOk) {
        console.log('Escrow info:', output.toHuman());
    }
}

createEscrow().catch(console.error);
```

### Property Transfer Flow

```javascript
// property-transfer-flow.js
async function completePropertyTransfer() {
    const api = await ApiPromise.create({
        provider: new WsProvider('ws://localhost:9944')
    });

    const escrowContract = new ContractPromise(api, escrowABI, escrowAddress);
    const propertyContract = new ContractPromise(api, propertyABI, propertyAddress);

    const buyer = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
    const seller = '4fL7p...';
    const propertyId = 1;

    try {
        // Step 1: Create escrow
        console.log('Creating escrow...');
        const createTx = escrowContract.tx.createEscrow(
            { gasLimit: -1, value: '500000000000000000' },
            propertyId,
            seller,
            null
        );
        await createTx.signAndSend(buyer);
        console.log('Escrow created successfully');

        // Step 2: Buyer approves escrow (optional, for additional security)
        console.log('Approving escrow...');
        const approveTx = escrowContract.tx.approveEscrow(
            { gasLimit: -1 },
            1 // escrow_id
        );
        await approveTx.signAndSend(buyer);
        console.log('Escrow approved');

        // Step 3: Seller releases funds
        console.log('Releasing escrow...');
        const releaseTx = escrowContract.tx.releaseEscrow(
            { gasLimit: -1 },
            1 // escrow_id
        );
        await releaseTx.signAndSend(seller);
        console.log('Escrow released');

        // Step 4: Transfer property ownership
        console.log('Transferring property...');
        const transferTx = propertyContract.tx.transferProperty(
            { gasLimit: -1 },
            propertyId,
            buyer
        );
        await transferTx.signAndSend(seller);
        console.log('Property transferred successfully');

    } catch (error) {
        console.error('Transfer failed:', error);
    }
}

completePropertyTransfer();
```

## Testing the Escrow System

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    use ink::env::{
        test::{self, DefaultAccounts},
        DefaultEnvironment,
    };

    fn setup_contract() -> EscrowContract {
        let accounts = DefaultAccounts::default();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        EscrowContract::new()
    }

    #[test]
    fn test_create_escrow_works() {
        let mut contract = setup_contract();
        let accounts = DefaultAccounts::default();
        
        test::set_value_transferred::<DefaultEnvironment>(1000);
        
        let result = contract.create_escrow(1, accounts.bob, None);
        assert!(result.is_ok());
        
        let escrow_id = result.unwrap();
        let escrow = contract.get_escrow(escrow_id).unwrap();
        
        assert_eq!(escrow.property_id, 1);
        assert_eq!(escrow.seller, accounts.bob);
        assert_eq!(escrow.buyer, accounts.alice);
        assert_eq!(escrow.amount, 1000);
        assert_eq!(escrow.status, EscrowStatus::Funded);
    }

    #[test]
    fn test_release_escrow_works() {
        let mut contract = setup_contract();
        let accounts = DefaultAccounts::default();
        
        test::set_value_transferred::<DefaultEnvironment>(1000);
        let escrow_id = contract.create_escrow(1, accounts.bob, None).unwrap();
        
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.release_escrow(escrow_id);
        assert!(result.is_ok());
        
        let escrow = contract.get_escrow(escrow_id).unwrap();
        assert_eq!(escrow.status, EscrowStatus::Released);
    }

    #[test]
    fn test_refund_escrow_works() {
        let mut contract = setup_contract();
        let accounts = DefaultAccounts::default();
        
        test::set_value_transferred::<DefaultEnvironment>(1000);
        let escrow_id = contract.create_escrow(1, accounts.bob, None).unwrap();
        
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.refund_escrow(escrow_id);
        assert!(result.is_ok());
        
        let escrow = contract.get_escrow(escrow_id).unwrap();
        assert_eq!(escrow.status, EscrowStatus::Refunded);
    }
}
```

### Integration Tests

```javascript
// escrow-integration.test.js
const { expect } = require('chai');
const { ApiPromise, WsProvider } = require('@polkadot/api');
const { ContractPromise } = require('@polkadot/api-contract');

describe('Escrow Integration Tests', () => {
    let api, escrowContract, accounts;

    before(async () => {
        api = await ApiPromise.create({
            provider: new WsProvider('ws://localhost:9944')
        });

        const keyring = new Keyring({ type: 'sr25519' });
        accounts = {
            alice: keyring.addFromUri('//Alice'),
            bob: keyring.addFromUri('//Bob'),
            charlie: keyring.addFromUri('//Charlie')
        };

        const abi = require('./target/ink/escrow.json');
        escrowContract = new ContractPromise(api, abi, process.env.ESCROW_ADDRESS);
    });

    it('should create and release escrow successfully', async () => {
        const propertyId = 1;
        const amount = '1000000000000000000'; // 1 UNIT

        // Create escrow
        const createTx = escrowContract.tx.createEscrow(
            { gasLimit: -1, value: amount },
            propertyId,
            accounts.bob.address,
            null
        );

        const createResult = await createTx.signAndSend(accounts.alice);
        expect(createResult).to.not.be.null;

        // Get escrow details
        const { result, output } = await escrowContract.query.getEscrow(
            accounts.alice.address,
            { gasLimit: -1 },
            1
        );

        expect(result.isOk).to.be.true;
        const escrow = output.toHuman();
        expect(escrow.status).to.equal('Funded');

        // Release escrow
        const releaseTx = escrowContract.tx.releaseEscrow(
            { gasLimit: -1 },
            1
        );

        const releaseResult = await releaseTx.signAndSend(accounts.bob);
        expect(releaseResult).to.not.be.null;

        // Verify escrow status
        const { result: finalResult, output: finalOutput } = await escrowContract.query.getEscrow(
            accounts.alice.address,
            { gasLimit: -1 },
            1
        );

        expect(finalResult.isOk).to.be.true;
        const finalEscrow = finalOutput.toHuman();
        expect(finalEscrow.status).to.equal('Released');
    });
});
```

## Advanced Features

### Time-locked Escrows

```rust
#[ink(message)]
pub fn create_time_locked_escrow(
    &mut self,
    property_id: u64,
    seller: AccountId,
    lock_duration: u64, // Duration in seconds
) -> Result<u64, Error> {
    let release_time = self.env().block_timestamp() + lock_duration;
    self.create_escrow(property_id, seller, Some(release_time))
}
```

### Multi-signature Escrows

```rust
#[ink(storage)]
pub struct MultiSigEscrow {
    escrows: Mapping<u64, MultiSigEscrowInfo>,
    required_signatures: u64,
}

#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct MultiSigEscrowInfo {
    pub base_info: EscrowInfo,
    pub signatories: Vec<AccountId>,
    pub signatures: Vec<AccountId>,
    pub required_signatures: u64,
}

impl MultiSigEscrow {
    #[ink(message)]
    pub fn add_signature(&mut self, escrow_id: u64) -> Result<(), Error> {
        let caller = self.env().caller();
        let mut escrow = self.escrows.get(&escrow_id)
            .ok_or(Error::EscrowNotFound)?;

        // Check if caller is a signatory
        if !escrow.signatories.contains(&caller) {
            return Err(Error::Unauthorized);
        }

        // Check if already signed
        if escrow.signatures.contains(&caller) {
            return Err(Error::AlreadySigned);
        }

        escrow.signatures.push(caller);

        // Check if we have enough signatures
        if escrow.signatures.len() as u64 >= escrow.required_signatures {
            // Auto-release escrow
            self.release_escrow_internal(escrow_id)?;
        }

        self.escrows.insert(&escrow_id, &escrow);
        Ok(())
    }
}
```

## Best Practices

1. **Security**: Always use reentrancy guards for payable functions
2. **Gas Optimization**: Minimize storage operations in loops
3. **Error Handling**: Provide clear error messages for debugging
4. **Events**: Emit events for all state changes
5. **Testing**: Write comprehensive tests for all scenarios

## Troubleshooting

### Common Issues

1. **Insufficient Balance**: Ensure account has enough funds
2. **Gas Limit**: Increase gas limit for complex operations
3. **Time Locks**: Check timestamp calculations
4. **Authorization**: Verify caller permissions

### Debug Tools

```rust
// Add debug logging
#[ink(message)]
pub fn debug_escrow(&self, escrow_id: u64) {
    if let Some(escrow) = self.get_escrow(escrow_id) {
        ink::env::debug_println!("Escrow {}: {:?}", escrow_id, escrow);
    }
}
```

This escrow system provides a secure foundation for property transfers on the PropChain platform. The modular design allows for easy extension and customization based on specific requirements.
