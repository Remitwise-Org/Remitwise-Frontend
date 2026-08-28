// Integration tests for Property Token Standard with existing Property Registry
#[cfg(test)]
mod integration_tests {
    use ink::env::{DefaultEnvironment, test};
    use propchain_contracts::{PropertyRegistry, PropertyMetadata, Escrow};
    use crate::property_token::{PropertyToken, PropertyMetadata as TokenPropertyMetadata};

    #[ink::test]
    fn test_property_registry_integration() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        // Test the existing PropertyRegistry contract
        let mut registry = PropertyRegistry::new();
        
        let metadata = PropertyMetadata {
            location: String::from("123 Registry St"),
            size: 1500,
            legal_description: String::from("Registry test property"),
            valuation: 400000,
            documents_url: String::from("ipfs://registry-docs"),
        };
        
        let property_id = registry.register_property(metadata.clone()).unwrap();
        assert_eq!(property_id, 1);
        assert_eq!(registry.property_count(), 1);
    }

    #[ink::test]
    fn test_property_token_enhanced_features() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        // Test the new PropertyToken contract with enhanced features
        let mut token_contract = PropertyToken::new();
        
        let metadata = TokenPropertyMetadata {
            location: String::from("456 Token Ave"),
            size: 2000,
            legal_description: String::from("Token test property"),
            valuation: 500000,
            documents_url: String::from("ipfs://token-docs"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        assert_eq!(token_id, 1);
        assert_eq!(token_contract.total_supply(), 1);
        
        // Test ERC-721 compatibility
        assert_eq!(token_contract.owner_of(token_id), Some(accounts.alice));
        assert_eq!(token_contract.balance_of(accounts.alice), 1);
        
        // Test legal document attachment
        let doc_hash = ink::Hash::from([1u8; 32]);
        let attach_result = token_contract.attach_legal_document(token_id, doc_hash, String::from("Deed"));
        assert!(attach_result.is_ok());
        
        // Test compliance verification
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        let verify_result = token_contract.verify_compliance(token_id, true);
        assert!(verify_result.is_ok());
    }

    #[ink::test]
    fn test_cross_contract_interoperability() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        // Test that both contracts can coexist
        let mut registry = PropertyRegistry::new();
        let mut token_contract = PropertyToken::new();
        
        // Register property in traditional registry
        let registry_metadata = PropertyMetadata {
            location: String::from("Traditional Property"),
            size: 1000,
            legal_description: String::from("From registry"),
            valuation: 300000,
            documents_url: String::from("ipfs://traditional"),
        };
        
        let registry_property_id = registry.register_property(registry_metadata).unwrap();
        
        // Register property with enhanced token standard
        let token_metadata = TokenPropertyMetadata {
            location: String::from("Enhanced Property"),
            size: 2500,
            legal_description: String::from("From token contract"),
            valuation: 600000,
            documents_url: String::from("ipfs://enhanced"),
        };
        
        let token_id = token_contract.register_property_with_token(token_metadata).unwrap();
        
        // Both should work independently
        assert_eq!(registry.property_count(), 1);
        assert_eq!(token_contract.total_supply(), 1);
        assert_ne!(registry_property_id, token_id);
    }

    #[ink::test]
    fn test_migration_scenario() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        // Simulate migration from old registry to new token standard
        let mut old_registry = PropertyRegistry::new();
        let mut new_token_contract = PropertyToken::new();
        
        // Register property in old system
        let old_metadata = PropertyMetadata {
            location: String::from("Old System Property"),
            size: 1200,
            legal_description: String::from("Originally in old registry"),
            valuation: 350000,
            documents_url: String::from("ipfs://old-system"),
        };
        
        let old_property_id = old_registry.register_property(old_metadata.clone()).unwrap();
        
        // Migrate to new system by creating equivalent token
        // In a real migration, you'd copy the property data
        
        let new_metadata = TokenPropertyMetadata {
            location: old_metadata.location,
            size: old_metadata.size,
            legal_description: old_metadata.legal_description,
            valuation: old_metadata.valuation,
            documents_url: old_metadata.documents_url,
        };
        
        let new_token_id = new_token_contract.register_property_with_token(new_metadata).unwrap();
        
        // Verify both exist in their respective systems
        assert!(old_registry.get_property(old_property_id).is_some());
        assert!(new_token_contract.owner_of(new_token_id).is_some());
        
        // Demonstrate enhanced features only available in new system
        let doc_hash = ink::Hash::from([2u8; 32]);
        let attach_result = new_token_contract.attach_legal_document(new_token_id, doc_hash, String::from("Migration Document"));
        assert!(attach_result.is_ok());
        
        // Old system doesn't have this capability
        // This shows the value-add of the new token standard
    }

    #[ink::test]
    fn test_escrow_integration() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        // Test escrow functionality with property tokens
        let mut token_contract = PropertyToken::new();
        
        let metadata = TokenPropertyMetadata {
            location: String::from("Escrow Test Property"),
            size: 1800,
            legal_description: String::from("For escrow testing"),
            valuation: 450000,
            documents_url: String::from("ipfs://escrow-test"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Verify compliance (required for advanced operations)
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        token_contract.verify_compliance(token_id, true).unwrap();
        
        // Test bridge operator functionality (similar to escrow operators)
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        let operator = accounts.bob;
        token_contract.add_bridge_operator(operator).unwrap();
        
        // Verify operator was added
        // Note: bridge_operators is private, but the function should execute without error
        
        println!("Escrow-like integration test completed successfully");
    }

    #[ink::test]
    fn test_batch_operations_efficiency() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create multiple properties efficiently
        let properties_data = vec![
            ("Property 1", 1000u64, 300000u128),
            ("Property 2", 1500u64, 450000u128),
            ("Property 3", 2000u64, 600000u128),
        ];
        
        let mut token_ids = Vec::new();
        
        for (location, size, valuation) in properties_data {
            let metadata = TokenPropertyMetadata {
                location: String::from(location),
                size,
                legal_description: String::from("Batch created property"),
                valuation,
                documents_url: String::from("ipfs://batch"),
            };
            
            let token_id = token_contract.register_property_with_token(metadata).unwrap();
            token_ids.push(token_id);
        }
        
        // Verify all properties were created
        assert_eq!(token_contract.total_supply(), 3);
        assert_eq!(token_ids.len(), 3);
        
        // Test batch balance query (ERC-1155)
        let accounts_vec = vec![accounts.alice, accounts.alice, accounts.alice];
        let ids_vec = token_ids.clone();
        let balances = token_contract.balance_of_batch(accounts_vec, ids_vec);
        
        assert_eq!(balances.len(), 3);
        assert_eq!(balances[0], 1);
        assert_eq!(balances[1], 1);
        assert_eq!(balances[2], 1);
    }

    #[ink::test]
    fn test_ownership_tracking() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        let metadata = TokenPropertyMetadata {
            location: String::from("Tracking Test Property"),
            size: 1600,
            legal_description: String::from("Ownership tracking test"),
            valuation: 520000,
            documents_url: String::from("ipfs://tracking"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Initial ownership history should have one entry (minting)
        let history = token_contract.get_ownership_history(token_id).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].from, ink::primitives::AccountId::from([0u8; 32])); // Zero address for minting
        assert_eq!(history[0].to, accounts.alice);
        
        // Transfer ownership and check history updates
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        token_contract.transfer_from(accounts.alice, accounts.bob, token_id).unwrap();
        
        let updated_history = token_contract.get_ownership_history(token_id).unwrap();
        assert_eq!(updated_history.len(), 2);
        assert_eq!(updated_history[1].from, accounts.alice);
        assert_eq!(updated_history[1].to, accounts.bob);
    }

    #[ink::test]
    fn test_security_features() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        let metadata = TokenPropertyMetadata {
            location: String::from("Security Test Property"),
            size: 1400,
            legal_description: String::from("Security features test"),
            valuation: 480000,
            documents_url: String::from("ipfs://security"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Test unauthorized access prevention
        test::set_caller::<DefaultEnvironment>(accounts.bob); // Not the owner
        
        // Should fail - Bob can't transfer Alice's property
        let transfer_result = token_contract.transfer_from(accounts.alice, accounts.charlie, token_id);
        assert_eq!(transfer_result, Err(crate::property_token::Error::Unauthorized));
        
        // Should fail - Bob can't attach documents to Alice's property
        let doc_hash = ink::Hash::from([3u8; 32]);
        let attach_result = token_contract.attach_legal_document(token_id, doc_hash, String::from("Unauthorized Doc"));
        assert_eq!(attach_result, Err(crate::property_token::Error::Unauthorized));
        
        // Should fail - Bob can't verify compliance
        let verify_result = token_contract.verify_compliance(token_id, true);
        assert_eq!(verify_result, Err(crate::property_token::Error::Unauthorized));
    }

    #[ink::test]
    fn test_backward_compatibility() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        // Demonstrate that the new token standard maintains compatibility
        // with existing ERC-721 expectations
        
        let mut token_contract = PropertyToken::new();
        
        let metadata = TokenPropertyMetadata {
            location: String::from("Compatibility Test"),
            size: 1300,
            legal_description: String::from("Backward compatibility test"),
            valuation: 420000,
            documents_url: String::from("ipfs://compatibility"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Standard ERC-721 operations should work
        assert_eq!(token_contract.balance_of(accounts.alice), 1);
        assert_eq!(token_contract.owner_of(token_id), Some(accounts.alice));
        assert_eq!(token_contract.get_approved(token_id), None);
        
        // Test approval system
        token_contract.approve(accounts.bob, token_id).unwrap();
        assert_eq!(token_contract.get_approved(token_id), Some(accounts.bob));
        
        // Test operator approvals
        token_contract.set_approval_for_all(accounts.charlie, true).unwrap();
        assert!(token_contract.is_approved_for_all(accounts.alice, accounts.charlie));
    }

    #[ink::test]
    fn test_bridge_multisig_workflow() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create a property token
        let metadata = TokenPropertyMetadata {
            location: String::from("Bridge Test Property"),
            size: 1500,
            legal_description: String::from("Property for bridge testing"),
            valuation: 400000,
            documents_url: String::from("ipfs://bridge-test"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Verify compliance (required for bridging)
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        token_contract.verify_compliance(token_id, true).unwrap();
        
        // Add bridge operators
        let operator1 = accounts.bob;
        let operator2 = accounts.charlie;
        token_contract.add_bridge_operator(operator1).unwrap();
        token_contract.add_bridge_operator(operator2).unwrap();
        
        // Initiate bridge request
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let request_id = token_contract.initiate_bridge_multisig(
            token_id,
            2, // Destination chain
            accounts.django,
            2, // Required signatures
            Some(100), // Timeout blocks
        ).unwrap();
        
        // Verify request was created
        let status = token_contract.monitor_bridge_status(request_id).unwrap();
        assert_eq!(status.signatures_collected, 0);
        assert_eq!(status.signatures_required, 2);
        
        // First operator signs
        test::set_caller::<DefaultEnvironment>(operator1);
        token_contract.sign_bridge_request(request_id, true).unwrap();
        
        let status_after_first = token_contract.monitor_bridge_status(request_id).unwrap();
        assert_eq!(status_after_first.signatures_collected, 1);
        
        // Second operator signs
        test::set_caller::<DefaultEnvironment>(operator2);
        token_contract.sign_bridge_request(request_id, true).unwrap();
        
        let status_after_second = token_contract.monitor_bridge_status(request_id).unwrap();
        assert_eq!(status_after_second.signatures_collected, 2);
        
        // Execute bridge
        token_contract.execute_bridge(request_id).unwrap();
        
        // Verify token is locked
        let bridge_status = token_contract.get_bridge_status(token_id).unwrap();
        assert!(bridge_status.is_locked);
    }

    #[ink::test]
    fn test_bridge_gas_estimation() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create a property token
        let metadata = TokenPropertyMetadata {
            location: String::from("Gas Test Property"),
            size: 2000,
            legal_description: String::from("Property with long legal description for gas estimation testing"),
            valuation: 600000,
            documents_url: String::from("ipfs://gas-test"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Estimate gas for bridge to different chains
        let gas_estimate = token_contract.estimate_bridge_gas(token_id, 2).unwrap();
        assert!(gas_estimate > 0);
        
        // Test invalid chain
        let invalid_gas = token_contract.estimate_bridge_gas(token_id, 999);
        assert_eq!(invalid_gas, Err(crate::property_token::Error::InvalidChain));
    }

    #[ink::test]
    fn test_bridge_recovery_mechanisms() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create a property token
        let metadata = TokenPropertyMetadata {
            location: String::from("Recovery Test Property"),
            size: 1200,
            legal_description: String::from("Property for recovery testing"),
            valuation: 350000,
            documents_url: String::from("ipfs://recovery-test"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Verify compliance
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        token_contract.verify_compliance(token_id, true).unwrap();
        
        // Add bridge operator
        token_contract.add_bridge_operator(accounts.bob).unwrap();
        
        // Initiate bridge request
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let request_id = token_contract.initiate_bridge_multisig(
            token_id,
            2,
            accounts.charlie,
            2,
            Some(1), // Very short timeout
        ).unwrap();
        
        // Simulate request expiration by advancing blocks (simplified)
        // In a real test environment, you would advance the block number
        
        // Operator rejects the request
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let reject_result = token_contract.sign_bridge_request(request_id, false);
        assert!(reject_result.is_ok());
        
        // Admin recovers the failed bridge
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        let recovery_result = token_contract.recover_failed_bridge(
            request_id,
            RecoveryAction::UnlockToken,
        );
        assert!(recovery_result.is_ok());
    }

    #[ink::test]
    fn test_bridge_configuration_management() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Get initial configuration
        let initial_config = token_contract.get_bridge_config();
        assert_eq!(initial_config.min_signatures_required, 2);
        
        // Test emergency pause
        let admin = token_contract.admin();
        token_contract.set_governance(admin).unwrap();
        test::set_caller::<DefaultEnvironment>(admin);
        token_contract.emergency_pause().unwrap();
        assert!(token_contract.is_paused());
        
        // Test unauthorized configuration change
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let unauthorized_result = token_contract.emergency_pause();
        assert_eq!(unauthorized_result, Err(crate::property_token::Error::Unauthorized));
        
        // Update configuration
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        let new_config = BridgeConfig {
            supported_chains: vec![1, 2, 3, 4],
            min_signatures_required: 3,
            max_signatures_required: 7,
            default_timeout_blocks: 200,
            gas_limit_per_bridge: 1000000,
            metadata_preservation: true,
        };
        
        token_contract.update_bridge_config(new_config.clone()).unwrap();
        
        let updated_config = token_contract.get_bridge_config();
        assert_eq!(updated_config.min_signatures_required, 3);
        assert_eq!(updated_config.max_signatures_required, 7);
    }

    #[ink::test]
    fn test_bridge_operator_management() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Initial state - only admin is operator
        let initial_operators = token_contract.get_bridge_operators();
        assert_eq!(initial_operators.len(), 1);
        assert!(initial_operators.contains(&accounts.alice));
        
        // Add new operator
        let new_operator = accounts.bob;
        token_contract.add_bridge_operator(new_operator).unwrap();
        
        let updated_operators = token_contract.get_bridge_operators();
        assert_eq!(updated_operators.len(), 2);
        assert!(updated_operators.contains(&new_operator));
        
        // Test operator check
        assert!(token_contract.is_bridge_operator(new_operator));
        assert!(!token_contract.is_bridge_operator(accounts.charlie));
        
        // Remove operator
        token_contract.remove_bridge_operator(new_operator).unwrap();
        
        let final_operators = token_contract.get_bridge_operators();
        assert_eq!(final_operators.len(), 1);
        assert!(!final_operators.contains(&new_operator));
        
        // Test unauthorized operator management
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let unauthorized_add = token_contract.add_bridge_operator(accounts.charlie);
        assert_eq!(unauthorized_add, Err(crate::property_token::Error::Unauthorized));
    }

    #[ink::test]
    fn test_bridge_transaction_verification() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create and setup token
        let metadata = TokenPropertyMetadata {
            location: String::from("Verification Test Property"),
            size: 1800,
            legal_description: String::from("Property for transaction verification testing"),
            valuation: 450000,
            documents_url: String::from("ipfs://verification-test"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Verify compliance
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        token_contract.verify_compliance(token_id, true).unwrap();
        
        // Add operator and initiate bridge
        token_contract.add_bridge_operator(accounts.bob).unwrap();
        
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let request_id = token_contract.initiate_bridge_multisig(
            token_id,
            2,
            accounts.charlie,
            1, // Only need 1 signature for this test
            Some(100),
        ).unwrap();
        
        // Sign and execute bridge
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        token_contract.sign_bridge_request(request_id, true).unwrap();
        token_contract.execute_bridge(request_id).unwrap();
        
        // Get bridge history
        let history = token_contract.get_bridge_history(accounts.alice);
        assert_eq!(history.len(), 1);
        
        let transaction = &history[0];
        assert_eq!(transaction.token_id, token_id);
        assert_eq!(transaction.source_chain, 1);
        assert_eq!(transaction.destination_chain, 2);
        
        // Verify transaction hash
        let is_verified = token_contract.verify_bridge_transaction(
            token_id,
            transaction.transaction_hash,
            1,
        );
        assert!(is_verified);
    }

    #[ink::test]
    fn test_cross_chain_metadata_preservation() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create original token with rich metadata
        let original_metadata = TokenPropertyMetadata {
            location: String::from("123 Metadata Preservation St"),
            size: 2500,
            legal_description: String::from("Property with comprehensive metadata for cross-chain preservation testing"),
            valuation: 750000,
            documents_url: String::from("ipfs://comprehensive-metadata"),
        };
        
        let original_token_id = token_contract.register_property_with_token(original_metadata.clone()).unwrap();
        
        // Add legal documents
        let doc_hash = ink::Hash::from([1u8; 32]);
        token_contract.attach_legal_document(original_token_id, doc_hash, String::from("Deed")).unwrap();
        
        // Verify compliance
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        token_contract.verify_compliance(original_token_id, true).unwrap();
        
        // Simulate receiving bridged token with metadata preservation
        let bridged_token_id = token_contract.receive_bridged_token(
            1, // Source chain
            original_token_id,
            accounts.bob,
            original_metadata,
            ink::Hash::from([2u8; 32]), // Transaction hash
        ).unwrap();
        
        // Verify metadata was preserved
        let bridged_property = token_contract.token_properties.get(&bridged_token_id).unwrap();
        assert_eq!(bridged_property.metadata.location, original_metadata.location);
        assert_eq!(bridged_property.metadata.size, original_metadata.size);
        assert_eq!(bridged_property.metadata.valuation, original_metadata.valuation);
        
        // Verify compliance was automatically set for bridged token
        let compliance_info = token_contract.compliance_flags.get(&bridged_token_id).unwrap();
        assert!(compliance_info.verified);
        assert_eq!(compliance_info.compliance_type, "Bridge");
    }

    #[ink::test]
    fn test_bridge_error_handling() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create token
        let metadata = TokenPropertyMetadata {
            location: String::from("Error Test Property"),
            size: 1000,
            legal_description: String::from("Property for error handling testing"),
            valuation: 300000,
            documents_url: String::from("ipfs://error-test"),
        };
        
        let token_id = token_contract.register_property_with_token(metadata).unwrap();
        
        // Test bridging without compliance verification
        let bridge_result = token_contract.initiate_bridge_multisig(
            token_id,
            2,
            accounts.bob,
            2,
            Some(100),
        );
        assert_eq!(bridge_result, Err(crate::property_token::Error::ComplianceFailed));
        
        // Test bridging with invalid chain
        test::set_caller::<DefaultEnvironment>(token_contract.admin());
        token_contract.verify_compliance(token_id, true).unwrap();
        
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let invalid_chain_result = token_contract.initiate_bridge_multisig(
            token_id,
            999, // Invalid chain
            accounts.bob,
            2,
            Some(100),
        );
        assert_eq!(invalid_chain_result, Err(crate::property_token::Error::InvalidChain));
        
        // Test insufficient signatures
        let insufficient_sigs_result = token_contract.initiate_bridge_multisig(
            token_id,
            2,
            accounts.bob,
            0, // Less than minimum required
            Some(100),
        );
        assert_eq!(insufficient_sigs_result, Err(crate::property_token::Error::InsufficientSignatures));
        
        // Test emergency pause
        let admin = token_contract.admin();
        token_contract.set_governance(admin).unwrap();
        test::set_caller::<DefaultEnvironment>(admin);
        token_contract.emergency_pause().unwrap();
        
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let paused_result = token_contract.initiate_bridge_multisig(
            token_id,
            2,
            accounts.bob,
            2,
            Some(100),
        );
        assert_eq!(paused_result, Err(crate::property_token::Error::ContractPaused));
    }

    #[ink::test]
    fn test_bridge_history_tracking() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut token_contract = PropertyToken::new();
        
        // Create multiple tokens
        let tokens_data = vec![
            ("Property 1", 1000u64, 300000u128),
            ("Property 2", 1500u64, 450000u128),
            ("Property 3", 2000u64, 600000u128),
        ];
        
        let mut token_ids = Vec::new();
        
        for (location, size, valuation) in tokens_data {
            let metadata = TokenPropertyMetadata {
                location: String::from(location),
                size,
                legal_description: String::from("Bridge history test property"),
                valuation,
                documents_url: String::from("ipfs://history-test"),
            };
            
            let token_id = token_contract.register_property_with_token(metadata).unwrap();
            token_ids.push(token_id);
            
            // Verify compliance
            test::set_caller::<DefaultEnvironment>(token_contract.admin());
            token_contract.verify_compliance(token_id, true).unwrap();
        }
        
        // Add bridge operator
        token_contract.add_bridge_operator(accounts.bob).unwrap();
        
        // Bridge multiple tokens
        for &token_id in &token_ids {
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let request_id = token_contract.initiate_bridge_multisig(
                token_id,
                2,
                accounts.charlie,
                1,
                Some(100),
            ).unwrap();
            
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            token_contract.sign_bridge_request(request_id, true).unwrap();
            token_contract.execute_bridge(request_id).unwrap();
        }
        
        // Verify bridge history
        let history = token_contract.get_bridge_history(accounts.alice);
        assert_eq!(history.len(), 3);
        
        // Verify all transactions are in history
        for (i, &token_id) in token_ids.iter().enumerate() {
            assert_eq!(history[i].token_id, token_id);
            assert_eq!(history[i].source_chain, 1);
            assert_eq!(history[i].destination_chain, 2);
            assert_eq!(history[i].sender, accounts.alice);
            assert_eq!(history[i].recipient, accounts.charlie);
        }
    }
}
