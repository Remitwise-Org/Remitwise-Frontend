#[cfg(test)]
mod property_token_tests {
    use ink::env::{DefaultEnvironment, test};
    use crate::property_token::{PropertyToken, Error, PropertyMetadata};

    #[ink::test]
    fn test_property_token_creation() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let contract = PropertyToken::new();
        assert_eq!(contract.total_supply(), 0);
        assert_eq!(contract.current_token_id(), 0);
        assert_eq!(contract.admin(), accounts.alice);
    }

    #[ink::test]
    fn test_register_property_with_token() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let result = contract.register_property_with_token(metadata.clone());
        assert!(result.is_ok());
        
        let token_id = result.unwrap();
        assert_eq!(token_id, 1);
        assert_eq!(contract.total_supply(), 1);
        
        // Check ownership
        assert_eq!(contract.owner_of(1), Some(accounts.alice));
        assert_eq!(contract.balance_of(accounts.alice), 1);
    }

    #[ink::test]
    fn test_erc721_transfer() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        
        // Transfer token to bob
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let result = contract.transfer_from(accounts.alice, accounts.bob, token_id);
        assert!(result.is_ok());
        
        // Verify new ownership
        assert_eq!(contract.owner_of(token_id), Some(accounts.bob));
        assert_eq!(contract.balance_of(accounts.alice), 0);
        assert_eq!(contract.balance_of(accounts.bob), 1);
    }

    #[ink::test]
    fn test_approve_and_transfer_from() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        
        // Alice approves Bob to transfer the token
        let result = contract.approve(accounts.bob, token_id);
        assert!(result.is_ok());
        
        // Verify approval
        assert_eq!(contract.get_approved(token_id), Some(accounts.bob));
        
        // Bob transfers the token to Charlie (Bob acts as the caller)
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.transfer_from(accounts.alice, accounts.charlie, token_id);
        assert!(result.is_ok());
        
        // Verify new ownership
        assert_eq!(contract.owner_of(token_id), Some(accounts.charlie));
    }

    #[ink::test]
    fn test_attach_legal_document() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        
        // Attach a legal document
        let doc_hash = ink::Hash::from([1u8; 32]);
        let doc_type = String::from("Deed");
        
        let result = contract.attach_legal_document(token_id, doc_hash, doc_type.clone());
        assert!(result.is_ok());
        
        // Note: We can't directly test the document was stored because
        // legal_documents mapping is private. The test verifies the function executes without error.
    }

    #[ink::test]
    fn test_verify_compliance() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        
        // Verify compliance (admin is alice in this test)
        let result = contract.verify_compliance(token_id, true);
        assert!(result.is_ok());
        
        // Note: We can't directly test the compliance status was updated because
        // compliance_flags mapping is private. The test verifies the function executes without error.
    }

    #[ink::test]
    fn test_erc1155_batch_operations() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        // Register two properties
        let token_id1 = contract.register_property_with_token(metadata.clone()).unwrap();
        let token_id2 = contract.register_property_with_token(metadata).unwrap();
        
        // Test balance_of_batch
        let accounts_vec = vec![accounts.alice, accounts.alice];
        let ids_vec = vec![token_id1, token_id2];
        let balances = contract.balance_of_batch(accounts_vec, ids_vec);
        
        assert_eq!(balances.len(), 2);
        assert_eq!(balances[0], 1);
        assert_eq!(balances[1], 1);
    }

    #[ink::test]
    fn test_uri_function() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        
        let uri_result = contract.uri(token_id);
        assert!(uri_result.is_some());
        
        let uri = uri_result.unwrap();
        assert!(uri.contains(&format!("{}", contract.env().account_id())));
        assert!(uri.contains(&format!("{}", token_id)));
    }

    #[ink::test]
    fn test_bridge_operator_management() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        // Initially, alice should be a bridge operator (as admin)
        assert_eq!(contract.admin(), accounts.alice);
        
        // Add a new bridge operator
        let result = contract.add_bridge_operator(accounts.bob);
        assert!(result.is_ok());
        
        // Note: We can't directly test if bob was added as an operator because
        // bridge_operators vector is private. The test verifies the function executes without error.
    }

    #[ink::test]
    fn test_get_ownership_history() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        
        // Get ownership history
        let history = contract.get_ownership_history(token_id);
        assert!(history.is_some());
        
        // The history should contain at least the initial minting record
        let history_vec = history.unwrap();
        assert!(!history_vec.is_empty());
    }

    #[ink::test]
    fn test_bridge_to_chain() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Main St"),
            size: 1000,
            legal_description: String::from("Sample property"),
            valuation: 500000,
            documents_url: String::from("ipfs://sample-docs"),
        };
        
        let token_id = contract.register_property_with_token(metadata).unwrap();
        
        // First verify the token for compliance
        test::set_caller::<DefaultEnvironment>(accounts.alice); // admin
        let result = contract.verify_compliance(token_id, true);
        assert!(result.is_ok());
        
        // Now bridge the token
        test::set_caller::<DefaultEnvironment>(accounts.alice); // token owner
        let result = contract.bridge_to_chain(2, token_id, accounts.bob); // chain ID 2
        assert!(result.is_ok());
        
        // After bridging, the token should be locked (owned by zero address)
        let zero_address = ink::primitives::AccountId::from([0u8; 32]);
        // Note: This test depends on internal implementation details
    }

    #[ink::test]
    fn test_receive_bridged_token() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        // Add bob as a bridge operator
        let result = contract.add_bridge_operator(accounts.bob);
        assert!(result.is_ok());
        
        // Bob receives a bridged token
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.receive_bridged_token(2, 1, accounts.charlie); // source chain 2, token 1
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_error_conditions() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        
        // Test trying to transfer a non-existent token
        let result = contract.transfer_from(accounts.alice, accounts.bob, 999);
        assert_eq!(result, Err(Error::TokenNotFound));
        
        // Test trying to get owner of non-existent token
        assert_eq!(contract.owner_of(999), None);
        
        // Test trying to approve a non-existent token
        let result = contract.approve(accounts.bob, 999);
        assert_eq!(result, Err(Error::TokenNotFound));
    }
}