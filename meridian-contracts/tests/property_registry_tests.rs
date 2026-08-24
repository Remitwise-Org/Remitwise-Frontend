#![cfg_attr(not(feature = "std"), no_std)]

use ink::env::{
    test::{self, DefaultAccounts},
    DefaultEnvironment,
};
use propchain_contracts::PropertyRegistry;

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_contract() -> PropertyRegistry<DefaultEnvironment> {
        let accounts = DefaultAccounts::default();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        PropertyRegistry::new()
    }

    #[ink::test]
    fn test_new_works() {
        let contract = setup_contract();
        assert_eq!(contract.property_count(), 0);
    }

    #[ink::test]
    fn test_register_property_works() {
        let mut contract = setup_contract();
        
        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let result = contract.register_property(metadata);
        assert!(result.is_ok());
        
        let property_id = result.unwrap();
        assert_eq!(property_id, 1);
        assert_eq!(contract.property_count(), 1);
    }

    #[ink::test]
    fn test_get_property_works() {
        let mut contract = setup_contract();
        let accounts = DefaultAccounts::default();
        
        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let property_id = contract.register_property(metadata).unwrap();
        let property = contract.get_property(property_id);
        
        assert!(property.is_some());
        let property = property.unwrap();
        assert_eq!(property.owner, accounts.alice);
        assert_eq!(property.metadata.location, "123 Main St");
    }

    #[ink::test]
    fn test_transfer_property_works() {
        let mut contract = setup_contract();
        let accounts = DefaultAccounts::default();
        
        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let property_id = contract.register_property(metadata).unwrap();
        
        // Transfer to Bob
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let result = contract.transfer_property(property_id, accounts.bob);
        assert!(result.is_ok());
        
        // Verify transfer
        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.owner, accounts.bob);
    }

    #[ink::test]
    fn test_unauthorized_transfer_fails() {
        let mut contract = setup_contract();
        let accounts = DefaultAccounts::default();
        
        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let property_id = contract.register_property(metadata).unwrap();
        
        // Try to transfer as Charlie (unauthorized)
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let result = contract.transfer_property(property_id, accounts.bob);
        assert!(result.is_err());
    }
}
