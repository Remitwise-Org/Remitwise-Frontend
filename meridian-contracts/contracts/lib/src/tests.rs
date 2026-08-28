#[cfg(test)]
#[allow(clippy::module_inception)]
mod tests {
    use crate::propchain_contracts::Error;
    use crate::propchain_contracts::PropertyRegistry;
    use ink::primitives::AccountId;
    use propchain_traits::*;

    /// Helper function to get default test accounts
    fn default_accounts() -> ink::env::test::DefaultAccounts<ink::env::DefaultEnvironment> {
        ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
    }

    /// Helper function to set the caller for the next contract call
    fn set_caller(sender: AccountId) {
        ink::env::test::set_caller::<ink::env::DefaultEnvironment>(sender);
    }

    /// Helper function to create a sample property metadata
    fn create_sample_metadata() -> PropertyMetadata {
        PropertyMetadata {
            location: "123 Main St, City, State 12345".to_string(),
            size: 1000,
            legal_description: "Test property legal description".to_string(),
            valuation: 1000000,
            documents_url: "https://example.com/docs".to_string(),
        }
    }

    /// Helper function to create metadata with custom values
    fn create_custom_metadata(
        location: &str,
        size: u64,
        legal_description: &str,
        valuation: u128,
        documents_url: &str,
    ) -> PropertyMetadata {
        PropertyMetadata {
            location: location.to_string(),
            size,
            legal_description: legal_description.to_string(),
            valuation,
            documents_url: documents_url.to_string(),
        }
    }

    // ============================================================================
    // CORE FUNCTIONALITY TESTS
    // ============================================================================

    #[ink::test]
    fn test_constructor_initializes_correctly() {
        let contract = PropertyRegistry::new();
        assert_eq!(contract.property_count(), 0);
    }

    #[ink::test]
    fn test_register_property_success() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        // Set a block timestamp
        ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(1000);

        let mut contract = PropertyRegistry::new();
        let metadata = create_sample_metadata();

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register property");

        assert_eq!(property_id, 1);
        assert_eq!(contract.property_count(), 1);

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.id, property_id);
        assert_eq!(property.owner, accounts.alice);
        assert_eq!(property.metadata, metadata);
        assert_eq!(property.registered_at, 1000);
    }

    #[ink::test]
    fn test_register_property_increments_counter() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        let property_id_1 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property 1");
        assert_eq!(property_id_1, 1);
        assert_eq!(contract.property_count(), 1);

        let property_id_2 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property 2");
        assert_eq!(property_id_2, 2);
        assert_eq!(contract.property_count(), 2);
    }

    #[ink::test]
    fn test_register_property_emits_event() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let metadata = create_sample_metadata();

        let _property_id = contract
            .register_property(metadata)
            .expect("Failed to register property");

        // Verify that events were emitted (ContractInitialized + PropertyRegistered)
        let emitted_events = ink::env::test::recorded_events().collect::<Vec<_>>();
        assert_eq!(
            emitted_events.len(),
            2,
            "ContractInitialized and PropertyRegistered events should be emitted"
        );
    }

    #[ink::test]
    fn test_transfer_property_success() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        // Transfer to bob
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.bob)
            .is_ok());

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.owner, accounts.bob);
        assert_eq!(property.id, property_id);
    }

    #[ink::test]
    fn test_transfer_property_updates_owner_lists() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id_1 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property 1");
        let property_id_2 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property 2");

        // Verify alice owns both properties
        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert_eq!(alice_properties.len(), 2);
        assert!(alice_properties.contains(&property_id_1));
        assert!(alice_properties.contains(&property_id_2));

        // Transfer property 1 to bob
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id_1, accounts.bob)
            .is_ok());

        // Verify alice now only owns property 2
        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert_eq!(alice_properties.len(), 1);
        assert_eq!(alice_properties[0], property_id_2);

        // Verify bob now owns property 1
        let bob_properties = contract.get_owner_properties(accounts.bob);
        assert_eq!(bob_properties.len(), 1);
        assert_eq!(bob_properties[0], property_id_1);
    }

    #[ink::test]
    fn test_transfer_property_emits_event() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.bob)
            .is_ok());

        // Verify that a transfer event was emitted
        let emitted_events = ink::env::test::recorded_events().collect::<Vec<_>>();
        assert!(
            !emitted_events.is_empty(),
            "PropertyTransferred event should be emitted"
        );
    }

    #[ink::test]
    fn test_get_property_returns_correct_info() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let metadata = create_custom_metadata(
            "456 Oak Ave",
            2000,
            "Custom legal description",
            2000000,
            "https://ipfs.io/custom",
        );

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register property");

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.id, property_id);
        assert_eq!(property.owner, accounts.alice);
        assert_eq!(property.metadata.location, "456 Oak Ave");
        assert_eq!(property.metadata.size, 2000);
        assert_eq!(
            property.metadata.legal_description,
            "Custom legal description"
        );
        assert_eq!(property.metadata.valuation, 2000000);
        assert_eq!(property.metadata.documents_url, "https://ipfs.io/custom");
    }

    #[ink::test]
    fn test_get_owner_properties_returns_correct_list() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let property_id_1 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property 1");
        let property_id_2 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property 2");
        let property_id_3 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property 3");

        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert_eq!(alice_properties.len(), 3);
        assert!(alice_properties.contains(&property_id_1));
        assert!(alice_properties.contains(&property_id_2));
        assert!(alice_properties.contains(&property_id_3));
    }

    #[ink::test]
    fn test_get_owner_properties_empty_for_new_owner() {
        let accounts = default_accounts();
        let contract = PropertyRegistry::new();

        let bob_properties = contract.get_owner_properties(accounts.bob);
        assert_eq!(bob_properties.len(), 0);
    }

    #[ink::test]
    fn test_property_count_returns_correct_value() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        assert_eq!(contract.property_count(), 0);

        contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        assert_eq!(contract.property_count(), 1);

        contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        assert_eq!(contract.property_count(), 2);
    }

    #[ink::test]
    fn test_ownership_verification_after_multiple_transfers() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        // Transfer alice -> bob
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.bob)
            .is_ok());
        assert_eq!(
            contract.get_property(property_id).unwrap().owner,
            accounts.bob
        );

        // Transfer bob -> charlie
        set_caller(accounts.bob);
        assert!(contract
            .transfer_property(property_id, accounts.charlie)
            .is_ok());
        assert_eq!(
            contract.get_property(property_id).unwrap().owner,
            accounts.charlie
        );
    }

    #[ink::test]
    fn test_metadata_preserved_after_transfer() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let original_metadata = create_custom_metadata(
            "789 Pine St",
            3000,
            "Original legal description",
            3000000,
            "https://ipfs.io/original",
        );

        let property_id = contract
            .register_property(original_metadata.clone())
            .expect("Failed to register property");

        // Transfer to bob
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.bob)
            .is_ok());

        // Verify metadata is unchanged
        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.metadata, original_metadata);
    }

    // ============================================================================
    // EDGE CASES
    // ============================================================================

    #[ink::test]
    fn test_register_property_with_max_size() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let metadata = create_custom_metadata(
            "Max size property",
            u64::MAX,
            "Maximum size property",
            u128::MAX,
            "https://ipfs.io/max",
        );

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register property with max size");

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.metadata.size, u64::MAX);
        assert_eq!(property.metadata.valuation, u128::MAX);
    }

    #[ink::test]
    fn test_register_property_with_zero_values() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let metadata = create_custom_metadata(
            "Zero value property",
            0,
            "Zero size property",
            0,
            "https://ipfs.io/zero",
        );

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register property with zero values");

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.metadata.size, 0);
        assert_eq!(property.metadata.valuation, 0);
    }

    #[ink::test]
    fn test_register_property_with_empty_strings() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let metadata = create_custom_metadata("", 1000, "", 1000000, "");

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register property with empty strings");

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.metadata.location, "");
        assert_eq!(property.metadata.legal_description, "");
        assert_eq!(property.metadata.documents_url, "");
    }

    #[ink::test]
    fn test_get_nonexistent_property_returns_none() {
        let contract = PropertyRegistry::new();
        assert_eq!(contract.get_property(0), None);
        assert_eq!(contract.get_property(1), None);
        assert_eq!(contract.get_property(999), None);
        assert_eq!(contract.get_property(u64::MAX), None);
    }

    #[ink::test]
    fn test_transfer_nonexistent_property_fails() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        assert_eq!(
            contract.transfer_property(999, accounts.bob),
            Err(Error::PropertyNotFound)
        );
    }

    #[ink::test]
    fn test_transfer_property_to_self() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        // Transfer to self
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.alice)
            .is_ok());

        // Property should still be owned by alice
        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.owner, accounts.alice);

        // Alice should still have the property in her list
        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert!(alice_properties.contains(&property_id));
    }

    #[ink::test]
    fn test_property_id_sequence() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        // Register properties and verify sequential IDs
        for i in 1..=10 {
            let property_id = contract
                .register_property(create_sample_metadata())
                .expect("Failed to register property");
            assert_eq!(property_id, i);
            assert_eq!(contract.property_count(), i);
        }
    }

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================

    #[ink::test]
    fn test_transfer_property_unauthorized_fails() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        // Try to transfer as charlie (not owner)
        set_caller(accounts.charlie);
        assert_eq!(
            contract.transfer_property(property_id, accounts.bob),
            Err(Error::Unauthorized)
        );

        // Verify ownership unchanged
        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.owner, accounts.alice);
    }

    #[ink::test]
    fn test_transfer_property_after_already_transferred() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        // Transfer to bob
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.bob)
            .is_ok());

        // Try to transfer again as alice (no longer owner)
        set_caller(accounts.alice);
        assert_eq!(
            contract.transfer_property(property_id, accounts.charlie),
            Err(Error::Unauthorized)
        );

        // Verify bob still owns it
        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.owner, accounts.bob);
    }

    #[ink::test]
    fn test_transfer_property_invalid_id() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        // Try to transfer non-existent property
        assert_eq!(
            contract.transfer_property(0, accounts.bob),
            Err(Error::PropertyNotFound)
        );
        assert_eq!(
            contract.transfer_property(1, accounts.bob),
            Err(Error::PropertyNotFound)
        );
        assert_eq!(
            contract.transfer_property(u64::MAX, accounts.bob),
            Err(Error::PropertyNotFound)
        );
    }

    #[ink::test]
    fn test_register_property_with_special_characters() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let metadata = create_custom_metadata(
            "123 Main St, Apt #4-B, City, ST 12345-6789",
            1000,
            "Legal description with \"quotes\" and 'apostrophes'",
            1000000,
            "https://example.com/docs?param=value&other=test",
        );

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register property with special characters");

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(
            property.metadata.location,
            "123 Main St, Apt #4-B, City, ST 12345-6789"
        );
        assert_eq!(
            property.metadata.legal_description,
            "Legal description with \"quotes\" and 'apostrophes'"
        );
        assert_eq!(
            property.metadata.documents_url,
            "https://example.com/docs?param=value&other=test"
        );
    }

    #[ink::test]
    fn test_register_property_with_unicode_characters() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let metadata = create_custom_metadata(
            "123 Main St, 城市, 州 12345",
            1000,
            "Legal description with émojis 🏠 and unicode 中文",
            1000000,
            "https://example.com/docs",
        );

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register property with unicode");

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.metadata.location, "123 Main St, 城市, 州 12345");
        assert_eq!(
            property.metadata.legal_description,
            "Legal description with émojis 🏠 and unicode 中文"
        );
    }

    // ============================================================================
    // PERFORMANCE TESTS
    // ============================================================================

    #[ink::test]
    fn test_bulk_property_registration() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let count = 50;

        // Register multiple properties in bulk
        for i in 1..=count {
            let property_id = contract
                .register_property(create_sample_metadata())
                .expect("Failed to register property");
            assert_eq!(property_id, i);
        }

        assert_eq!(contract.property_count(), count);

        // Verify all properties are accessible
        for i in 1..=count {
            let property = contract.get_property(i);
            assert!(property.is_some());
            let prop = property.unwrap();
            assert_eq!(prop.id, i);
            assert_eq!(prop.owner, accounts.alice);
        }
    }

    #[ink::test]
    fn test_bulk_property_transfer() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let count = 20;

        // Register properties
        let mut property_ids = Vec::new();
        for _ in 0..count {
            let property_id = contract
                .register_property(create_sample_metadata())
                .expect("Failed to register property");
            property_ids.push(property_id);
        }

        // Transfer all to bob
        set_caller(accounts.alice);
        for property_id in &property_ids {
            assert!(contract
                .transfer_property(*property_id, accounts.bob)
                .is_ok());
        }

        // Verify all transferred
        let bob_properties = contract.get_owner_properties(accounts.bob);
        assert_eq!(bob_properties.len(), count);

        for property_id in &property_ids {
            let property = contract.get_property(*property_id).unwrap();
            assert_eq!(property.owner, accounts.bob);
        }
    }

    #[ink::test]
    fn test_get_owner_properties_large_list() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let count = 50;

        // Register many properties for alice
        for _ in 0..count {
            contract
                .register_property(create_sample_metadata())
                .expect("Failed to register property");
        }

        // Get all properties
        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert_eq!(alice_properties.len(), count);

        // Verify all property IDs are unique
        let mut seen = std::collections::HashSet::new();
        for property_id in &alice_properties {
            assert!(!seen.contains(property_id));
            seen.insert(*property_id);
        }
    }

    #[ink::test]
    fn test_property_count_accuracy_under_load() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let count = 100;

        // Register many properties
        for i in 1..=count {
            contract
                .register_property(create_sample_metadata())
                .expect("Failed to register property");
            assert_eq!(contract.property_count(), i);
        }

        assert_eq!(contract.property_count(), count);
    }

    // ============================================================================
    // ADDITIONAL EDGE CASES
    // ============================================================================

    #[ink::test]
    fn test_property_registered_at_timestamp() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        // Set a known block timestamp
        ink::env::test::set_block_timestamp::<ink::env::DefaultEnvironment>(1000);

        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.registered_at, 1000);
    }

    #[ink::test]
    fn test_multiple_transfers_same_property() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        // Transfer multiple times
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.bob)
            .is_ok());

        set_caller(accounts.bob);
        assert!(contract
            .transfer_property(property_id, accounts.charlie)
            .is_ok());

        set_caller(accounts.charlie);
        assert!(contract
            .transfer_property(property_id, accounts.alice)
            .is_ok());

        // Should be back with alice
        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.owner, accounts.alice);
    }

    #[ink::test]
    fn test_owner_properties_after_transfer_out() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let property_id_1 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        let property_id_2 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        let property_id_3 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        // Transfer one property out
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id_2, accounts.bob)
            .is_ok());

        // Alice should only have properties 1 and 3
        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert_eq!(alice_properties.len(), 2);
        assert!(alice_properties.contains(&property_id_1));
        assert!(!alice_properties.contains(&property_id_2));
        assert!(alice_properties.contains(&property_id_3));

        // Bob should have property 2
        let bob_properties = contract.get_owner_properties(accounts.bob);
        assert_eq!(bob_properties.len(), 1);
        assert_eq!(bob_properties[0], property_id_2);
    }

    #[ink::test]
    fn test_property_metadata_immutability() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();
        let original_metadata = create_custom_metadata(
            "Original Location",
            1000,
            "Original Description",
            1000000,
            "https://original.com",
        );

        let property_id = contract
            .register_property(original_metadata.clone())
            .expect("Failed to register property");

        // Transfer property
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id, accounts.bob)
            .is_ok());

        // Metadata should remain unchanged
        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.metadata.location, "Original Location");
        assert_eq!(property.metadata.size, 1000);
        assert_eq!(property.metadata.legal_description, "Original Description");
        assert_eq!(property.metadata.valuation, 1000000);
        assert_eq!(property.metadata.documents_url, "https://original.com");
    }

    #[ink::test]
    fn test_default_implementation() {
        let contract = PropertyRegistry::default();
        assert_eq!(contract.property_count(), 0);
    }

    #[ink::test]
    fn test_property_count_consistency_after_transfers() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let property_id_1 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        let property_id_2 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        let property_id_3 = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");

        assert_eq!(contract.property_count(), 3);

        // Transfer all properties
        set_caller(accounts.alice);
        assert!(contract
            .transfer_property(property_id_1, accounts.bob)
            .is_ok());
        assert!(contract
            .transfer_property(property_id_2, accounts.bob)
            .is_ok());
        assert!(contract
            .transfer_property(property_id_3, accounts.charlie)
            .is_ok());

        // Property count should remain the same
        assert_eq!(contract.property_count(), 3);
    }

    #[ink::test]
    fn test_property_id_uniqueness() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        // Register many properties
        let mut property_ids = std::collections::HashSet::new();
        for _ in 0..50 {
            let property_id = contract
                .register_property(create_sample_metadata())
                .expect("Failed to register property");
            assert!(
                property_ids.insert(property_id),
                "Property ID should be unique: {}",
                property_id
            );
        }

        assert_eq!(property_ids.len(), 50);
        assert_eq!(contract.property_count(), 50);
    }

    #[ink::test]
    fn update_metadata_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = PropertyRegistry::new();

        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 1000000,
            documents_url: "https://example.com/docs".to_string(),
        };

        let property_id = contract
            .register_property(metadata.clone())
            .expect("Failed to register");

        let new_metadata = PropertyMetadata {
            location: "123 Main St Updated".to_string(),
            size: 1100,
            legal_description: "Test property updated".to_string(),
            valuation: 1100000,
            documents_url: "https://example.com/docs/new".to_string(),
        };

        assert!(contract
            .update_metadata(property_id, new_metadata.clone())
            .is_ok());

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.metadata, new_metadata);

        // Check event emission
        let events = ink::env::test::recorded_events().collect::<Vec<_>>();
        assert!(events.len() > 1); // Registration + Update
    }

    #[ink::test]
    fn update_metadata_unauthorized_fails() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 1000000,
            documents_url: "https://example.com/docs".to_string(),
        };
        let property_id = contract
            .register_property(metadata)
            .expect("Failed to register");

        set_caller(accounts.bob);
        let new_metadata = PropertyMetadata {
            location: "123 Main St Updated".to_string(),
            size: 1100,
            legal_description: "Test property updated".to_string(),
            valuation: 1100000,
            documents_url: "https://example.com/docs/new".to_string(),
        };
        assert_eq!(
            contract.update_metadata(property_id, new_metadata),
            Err(Error::Unauthorized)
        );
    }

    #[ink::test]
    fn approval_work() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 1000000,
            documents_url: "https://example.com/docs".to_string(),
        };
        let property_id = contract
            .register_property(metadata)
            .expect("Failed to register");

        // Approve Bob
        assert!(contract.approve(property_id, Some(accounts.bob)).is_ok());
        assert_eq!(contract.get_approved(property_id), Some(accounts.bob));

        // Bob transfers property
        set_caller(accounts.bob);
        assert!(contract
            .transfer_property(property_id, accounts.charlie)
            .is_ok());

        let property = contract.get_property(property_id).unwrap();
        assert_eq!(property.owner, accounts.charlie);

        // Approval should be cleared
        assert_eq!(contract.get_approved(property_id), None);
    }

    // Batch Operations Tests

    #[ink::test]
    fn batch_register_properties_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        let properties = vec![
            PropertyMetadata {
                location: "Property 1".to_string(),
                size: 1000,
                legal_description: "Test property 1".to_string(),
                valuation: 100000,
                documents_url: "https://example.com/docs1".to_string(),
            },
            PropertyMetadata {
                location: "Property 2".to_string(),
                size: 1500,
                legal_description: "Test property 2".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs2".to_string(),
            },
            PropertyMetadata {
                location: "Property 3".to_string(),
                size: 2000,
                legal_description: "Test property 3".to_string(),
                valuation: 200000,
                documents_url: "https://example.com/docs3".to_string(),
            },
        ];

        let property_ids = contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");
        assert_eq!(property_ids.len(), 3);
        assert_eq!(property_ids, vec![1, 2, 3]);
        assert_eq!(contract.property_count(), 3);

        // Verify all properties were registered correctly
        for (i, &property_id) in property_ids.iter().enumerate() {
            let property = contract.get_property(property_id).unwrap();
            assert_eq!(property.owner, accounts.alice);
            assert_eq!(property.id, property_id);
            assert_eq!(property.metadata.location, format!("Property {}", i + 1));
        }

        // Verify owner has all properties
        let owner_properties = contract.get_owner_properties(accounts.alice);
        assert_eq!(owner_properties.len(), 3);
        assert!(owner_properties.contains(&1));
        assert!(owner_properties.contains(&2));
        assert!(owner_properties.contains(&3));
    }

    #[ink::test]
    fn batch_transfer_properties_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let properties = vec![
            PropertyMetadata {
                location: "Property 1".to_string(),
                size: 1000,
                legal_description: "Test property 1".to_string(),
                valuation: 100000,
                documents_url: "https://example.com/docs1".to_string(),
            },
            PropertyMetadata {
                location: "Property 2".to_string(),
                size: 1500,
                legal_description: "Test property 2".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs2".to_string(),
            },
        ];

        let property_ids = contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Transfer all properties to Bob
        assert!(contract
            .batch_transfer_properties(property_ids.clone(), accounts.bob)
            .is_ok());

        // Verify all properties were transferred
        for &property_id in &property_ids {
            let property = contract.get_property(property_id).unwrap();
            assert_eq!(property.owner, accounts.bob);
        }

        // Verify Alice has no properties
        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert!(alice_properties.is_empty());

        // Verify Bob has all properties
        let bob_properties = contract.get_owner_properties(accounts.bob);
        assert_eq!(bob_properties.len(), 2);
        assert!(bob_properties.contains(&1));
        assert!(bob_properties.contains(&2));
    }

    #[ink::test]
    fn batch_update_metadata_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let properties = vec![
            PropertyMetadata {
                location: "Property 1".to_string(),
                size: 1000,
                legal_description: "Test property 1".to_string(),
                valuation: 100000,
                documents_url: "https://example.com/docs1".to_string(),
            },
            PropertyMetadata {
                location: "Property 2".to_string(),
                size: 1500,
                legal_description: "Test property 2".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs2".to_string(),
            },
        ];

        let property_ids = contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Update metadata for all properties
        let updates = vec![
            (
                property_ids[0],
                PropertyMetadata {
                    location: "Updated Property 1".to_string(),
                    size: 1200,
                    legal_description: "Updated test property 1".to_string(),
                    valuation: 120000,
                    documents_url: "https://example.com/docs1_updated".to_string(),
                },
            ),
            (
                property_ids[1],
                PropertyMetadata {
                    location: "Updated Property 2".to_string(),
                    size: 1700,
                    legal_description: "Updated test property 2".to_string(),
                    valuation: 170000,
                    documents_url: "https://example.com/docs2_updated".to_string(),
                },
            ),
        ];

        assert!(contract.batch_update_metadata(updates).is_ok());

        // Verify updates
        let property1 = contract.get_property(property_ids[0]).unwrap();
        assert_eq!(property1.metadata.location, "Updated Property 1");
        assert_eq!(property1.metadata.size, 1200);
        assert_eq!(property1.metadata.valuation, 120000);

        let property2 = contract.get_property(property_ids[1]).unwrap();
        assert_eq!(property2.metadata.location, "Updated Property 2");
        assert_eq!(property2.metadata.size, 1700);
        assert_eq!(property2.metadata.valuation, 170000);
    }

    #[ink::test]
    fn batch_transfer_properties_to_multiple_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let properties = vec![
            PropertyMetadata {
                location: "Property 1".to_string(),
                size: 1000,
                legal_description: "Test property 1".to_string(),
                valuation: 100000,
                documents_url: "https://example.com/docs1".to_string(),
            },
            PropertyMetadata {
                location: "Property 2".to_string(),
                size: 1500,
                legal_description: "Test property 2".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs2".to_string(),
            },
            PropertyMetadata {
                location: "Property 3".to_string(),
                size: 2000,
                legal_description: "Test property 3".to_string(),
                valuation: 200000,
                documents_url: "https://example.com/docs3".to_string(),
            },
        ];

        let property_ids = contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Transfer properties to different recipients
        let transfers = vec![
            (property_ids[0], accounts.bob),
            (property_ids[1], accounts.charlie),
            (property_ids[2], accounts.django),
        ];

        assert!(contract
            .batch_transfer_properties_to_multiple(transfers)
            .is_ok());

        // Verify transfers
        let property1 = contract.get_property(property_ids[0]).unwrap();
        assert_eq!(property1.owner, accounts.bob);

        let property2 = contract.get_property(property_ids[1]).unwrap();
        assert_eq!(property2.owner, accounts.charlie);

        let property3 = contract.get_property(property_ids[2]).unwrap();
        assert_eq!(property3.owner, accounts.django);

        // Verify Alice has no properties
        let alice_properties = contract.get_owner_properties(accounts.alice);
        assert!(alice_properties.is_empty());
    }

    // Portfolio Management Tests

    #[ink::test]
    fn get_portfolio_summary_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let properties = vec![
            PropertyMetadata {
                location: "Property 1".to_string(),
                size: 1000,
                legal_description: "Test property 1".to_string(),
                valuation: 100000,
                documents_url: "https://example.com/docs1".to_string(),
            },
            PropertyMetadata {
                location: "Property 2".to_string(),
                size: 1500,
                legal_description: "Test property 2".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs2".to_string(),
            },
        ];

        contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Get portfolio summary
        let summary = contract.get_portfolio_summary(accounts.alice);
        assert_eq!(summary.property_count, 2);
        assert_eq!(summary.total_valuation, 250000);
        assert_eq!(summary.average_valuation, 125000);
        assert_eq!(summary.total_size, 2500);
        assert_eq!(summary.average_size, 1250);
    }

    #[ink::test]
    fn get_portfolio_details_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register multiple properties
        let properties = vec![
            PropertyMetadata {
                location: "Property 1".to_string(),
                size: 1000,
                legal_description: "Test property 1".to_string(),
                valuation: 100000,
                documents_url: "https://example.com/docs1".to_string(),
            },
            PropertyMetadata {
                location: "Property 2".to_string(),
                size: 1500,
                legal_description: "Test property 2".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs2".to_string(),
            },
        ];

        let property_ids = contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Get portfolio details
        let details = contract.get_portfolio_details(accounts.alice);
        assert_eq!(details.owner, accounts.alice);
        assert_eq!(details.total_count, 2);
        assert_eq!(details.properties.len(), 2);

        // Verify property details
        let prop1 = &details.properties[0];
        assert_eq!(prop1.id, property_ids[0]);
        assert_eq!(prop1.location, "Property 1");
        assert_eq!(prop1.size, 1000);
        assert_eq!(prop1.valuation, 100000);

        let prop2 = &details.properties[1];
        assert_eq!(prop2.id, property_ids[1]);
        assert_eq!(prop2.location, "Property 2");
        assert_eq!(prop2.size, 1500);
        assert_eq!(prop2.valuation, 150000);
    }

    // Analytics Tests

    #[ink::test]
    fn get_global_analytics_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register properties for Alice
        let alice_properties = vec![PropertyMetadata {
            location: "Alice Property 1".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 100000,
            documents_url: "https://example.com/docs".to_string(),
        }];
        contract
            .batch_register_properties(alice_properties)
            .expect("Failed to register Alice properties");

        // Register properties for Bob
        set_caller(accounts.bob);
        let bob_properties = vec![
            PropertyMetadata {
                location: "Bob Property 1".to_string(),
                size: 1500,
                legal_description: "Test property".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs".to_string(),
            },
            PropertyMetadata {
                location: "Bob Property 2".to_string(),
                size: 2000,
                legal_description: "Test property".to_string(),
                valuation: 200000,
                documents_url: "https://example.com/docs".to_string(),
            },
        ];
        contract
            .batch_register_properties(bob_properties)
            .expect("Failed to register Bob properties");

        // Get global analytics
        let analytics = contract.get_global_analytics();
        assert_eq!(analytics.total_properties, 3);
        assert_eq!(analytics.total_valuation, 450000);
        assert_eq!(analytics.average_valuation, 150000);
        assert_eq!(analytics.total_size, 4500);
        assert_eq!(analytics.average_size, 1500);
        assert_eq!(analytics.unique_owners, 2);
    }

    #[ink::test]
    fn get_properties_by_price_range_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register properties with different valuations
        let properties = vec![
            PropertyMetadata {
                location: "Cheap Property".to_string(),
                size: 1000,
                legal_description: "Test property".to_string(),
                valuation: 50000,
                documents_url: "https://example.com/docs".to_string(),
            },
            PropertyMetadata {
                location: "Medium Property".to_string(),
                size: 1500,
                legal_description: "Test property".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs".to_string(),
            },
            PropertyMetadata {
                location: "Expensive Property".to_string(),
                size: 2000,
                legal_description: "Test property".to_string(),
                valuation: 250000,
                documents_url: "https://example.com/docs".to_string(),
            },
        ];

        contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Get properties in medium price range
        let medium_properties = contract.get_properties_by_price_range(100000, 200000);
        assert_eq!(medium_properties.len(), 1);
        assert_eq!(medium_properties[0], 2); // Medium Property

        // Get properties in high price range
        let high_properties = contract.get_properties_by_price_range(200000, 300000);
        assert_eq!(high_properties.len(), 1);
        assert_eq!(high_properties[0], 3); // Expensive Property

        // Get all properties
        let all_properties = contract.get_properties_by_price_range(0, 300000);
        assert_eq!(all_properties.len(), 3);
        assert!(all_properties.contains(&1));
        assert!(all_properties.contains(&2));
        assert!(all_properties.contains(&3));
    }

    #[ink::test]
    fn get_properties_by_size_range_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register properties with different sizes
        let properties = vec![
            PropertyMetadata {
                location: "Small Property".to_string(),
                size: 500,
                legal_description: "Test property".to_string(),
                valuation: 100000,
                documents_url: "https://example.com/docs".to_string(),
            },
            PropertyMetadata {
                location: "Medium Property".to_string(),
                size: 1500,
                legal_description: "Test property".to_string(),
                valuation: 150000,
                documents_url: "https://example.com/docs".to_string(),
            },
            PropertyMetadata {
                location: "Large Property".to_string(),
                size: 2500,
                legal_description: "Test property".to_string(),
                valuation: 200000,
                documents_url: "https://example.com/docs".to_string(),
            },
        ];

        contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Get properties in medium size range
        let medium_properties = contract.get_properties_by_size_range(1000, 2000);
        assert_eq!(medium_properties.len(), 1);
        assert_eq!(medium_properties[0], 2); // Medium Property

        // Get properties in large size range
        let large_properties = contract.get_properties_by_size_range(2000, 3000);
        assert_eq!(large_properties.len(), 1);
        assert_eq!(large_properties[0], 3); // Large Property

        // Get all properties
        let all_properties = contract.get_properties_by_size_range(0, 3000);
        assert_eq!(all_properties.len(), 3);
        assert!(all_properties.contains(&1));
        assert!(all_properties.contains(&2));
        assert!(all_properties.contains(&3));
    }

    // Gas Monitoring Tests

    #[ink::test]
    fn gas_metrics_tracking_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Perform some operations
        let metadata = PropertyMetadata {
            location: "Test Property".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 100000,
            documents_url: "https://example.com/docs".to_string(),
        };

        contract
            .register_property(metadata)
            .expect("Failed to register");

        // Get gas metrics
        let metrics = contract.get_gas_metrics();
        assert_eq!(metrics.total_operations, 1);
        assert_eq!(metrics.last_operation_gas, 10000);
        assert_eq!(metrics.average_operation_gas, 10000);
        assert_eq!(metrics.min_gas_used, 10000);
        assert_eq!(metrics.max_gas_used, 10000);
    }

    #[ink::test]
    fn performance_recommendations_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Perform multiple operations to generate recommendations
        let metadata = PropertyMetadata {
            location: "Test Property".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 100000,
            documents_url: "https://example.com/docs".to_string(),
        };

        // Register multiple properties
        for _ in 0..5 {
            contract
                .register_property(metadata.clone())
                .expect("Failed to register");
        }

        // Get performance recommendations
        let recommendations = contract.get_performance_recommendations();
        assert!(!recommendations.is_empty());

        // Should contain general recommendations
        let recommendation_strings: Vec<&str> =
            recommendations.iter().map(|s| s.as_str()).collect();
        assert!(recommendation_strings
            .contains(&"Use batch operations for multiple property transfers"));
        assert!(recommendation_strings
            .contains(&"Prefer portfolio analytics over individual property queries"));
        assert!(
            recommendation_strings.contains(&"Consider off-chain indexing for complex analytics")
        );
    }

    // Error Cases Tests

    #[ink::test]
    fn batch_transfer_unauthorized_fails() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register properties
        let properties = vec![PropertyMetadata {
            location: "Property 1".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 100000,
            documents_url: "https://example.com/docs".to_string(),
        }];

        let property_ids = contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Try to transfer as unauthorized user
        set_caller(accounts.bob);
        assert_eq!(
            contract.batch_transfer_properties(property_ids, accounts.charlie),
            Err(Error::Unauthorized)
        );
    }

    #[ink::test]
    fn batch_update_metadata_unauthorized_fails() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Register properties
        let properties = vec![PropertyMetadata {
            location: "Property 1".to_string(),
            size: 1000,
            legal_description: "Test property".to_string(),
            valuation: 100000,
            documents_url: "https://example.com/docs".to_string(),
        }];

        let property_ids = contract
            .batch_register_properties(properties)
            .expect("Failed to batch register");

        // Try to update as unauthorized user
        set_caller(accounts.bob);
        let updates = vec![(
            property_ids[0],
            PropertyMetadata {
                location: "Updated Property".to_string(),
                size: 1200,
                legal_description: "Updated test property".to_string(),
                valuation: 120000,
                documents_url: "https://example.com/docs_updated".to_string(),
            },
        )];

        assert_eq!(
            contract.batch_update_metadata(updates),
            Err(Error::Unauthorized)
        );
    }

    #[ink::test]
    fn batch_operations_with_empty_input_works() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();

        // Test empty batch register
        let empty_properties: Vec<PropertyMetadata> = vec![];
        let result = contract.batch_register_properties(empty_properties);
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 0);

        // Test empty batch transfer
        let empty_transfers: Vec<u64> = vec![];
        assert!(contract
            .batch_transfer_properties(empty_transfers, accounts.bob)
            .is_ok());

        // Test empty batch update
        let empty_updates: Vec<(u64, PropertyMetadata)> = vec![];
        assert!(contract.batch_update_metadata(empty_updates).is_ok());

        // Test empty batch transfer to multiple
        let empty_multiple_transfers: Vec<(u64, AccountId)> = vec![];
        assert!(contract
            .batch_transfer_properties_to_multiple(empty_multiple_transfers)
            .is_ok());
    }

    // ============================================================================
    // BADGE SYSTEM TESTS
    // ============================================================================

    #[ink::test]
    fn test_badge_verifier_management() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();
        assert!(contract.set_verifier(accounts.bob, true).is_ok());
        assert!(contract.is_verifier(accounts.bob));
        assert!(contract.set_verifier(accounts.bob, false).is_ok());
        assert!(!contract.is_verifier(accounts.bob));
        set_caller(accounts.charlie);
        assert_eq!(
            contract.set_verifier(accounts.bob, true),
            Err(Error::Unauthorized)
        );
    }

    #[ink::test]
    fn test_badge_issuance_and_query() {
        use crate::propchain_contracts::BadgeType;
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        assert!(contract.set_verifier(accounts.bob, true).is_ok());
        set_caller(accounts.bob);
        assert!(contract
            .issue_badge(
                property_id,
                BadgeType::DocumentVerification,
                None,
                "https://metadata.example.com/badge.json".to_string()
            )
            .is_ok());
        assert!(contract.has_badge(property_id, BadgeType::DocumentVerification));
        let badge = contract.get_badge(property_id, BadgeType::DocumentVerification);
        assert!(badge.is_some());
        assert_eq!(badge.unwrap().issued_by, accounts.bob);
    }

    #[ink::test]
    fn test_verification_request_workflow() {
        use crate::propchain_contracts::BadgeType;
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        let request_id = contract
            .request_verification(
                property_id,
                BadgeType::LegalCompliance,
                "https://evidence.example.com/docs.pdf".to_string(),
            )
            .expect("Failed to request verification");
        assert_eq!(request_id, 1);
        assert!(contract.set_verifier(accounts.bob, true).is_ok());
        set_caller(accounts.bob);
        assert!(contract
            .review_verification(
                request_id,
                true,
                Some(1000000),
                "https://metadata.example.com/badge.json".to_string()
            )
            .is_ok());
        assert!(contract.has_badge(property_id, BadgeType::LegalCompliance));
    }

    #[ink::test]
    fn test_badge_revocation() {
        use crate::propchain_contracts::BadgeType;
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        assert!(contract.set_verifier(accounts.bob, true).is_ok());
        set_caller(accounts.bob);
        assert!(contract
            .issue_badge(
                property_id,
                BadgeType::OwnerVerification,
                None,
                "https://metadata.example.com/badge.json".to_string()
            )
            .is_ok());
        assert!(contract
            .revoke_badge(
                property_id,
                BadgeType::OwnerVerification,
                "Failed KYC".to_string()
            )
            .is_ok());
        assert!(!contract.has_badge(property_id, BadgeType::OwnerVerification));
        let badge = contract.get_badge(property_id, BadgeType::OwnerVerification);
        assert!(badge.is_some());
        assert!(badge.unwrap().revoked);
    }

    #[ink::test]
    fn test_badge_appeal_process() {
        use crate::propchain_contracts::BadgeType;
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();
        let property_id = contract
            .register_property(create_sample_metadata())
            .expect("Failed to register property");
        assert!(contract.set_verifier(accounts.bob, true).is_ok());
        set_caller(accounts.bob);
        assert!(contract
            .issue_badge(
                property_id,
                BadgeType::DocumentVerification,
                None,
                "https://metadata.example.com/badge.json".to_string()
            )
            .is_ok());
        assert!(contract
            .revoke_badge(
                property_id,
                BadgeType::DocumentVerification,
                "Documents expired".to_string()
            )
            .is_ok());
        set_caller(accounts.alice);
        let appeal_id = contract
            .submit_appeal(
                property_id,
                BadgeType::DocumentVerification,
                "Documents renewed".to_string(),
            )
            .expect("Failed to submit appeal");
        assert_eq!(appeal_id, 1);
        assert!(contract
            .resolve_appeal(appeal_id, true, "Reinstating badge".to_string())
            .is_ok());
        assert!(contract.has_badge(property_id, BadgeType::DocumentVerification));
    }

    // ============================================================================
    // DYNAMIC FEE INTEGRATION (Issue #38)
    // ============================================================================

    #[ink::test]
    fn test_fee_manager_initially_none() {
        let contract = PropertyRegistry::new();
        assert_eq!(contract.get_fee_manager(), None);
    }

    #[ink::test]
    fn test_get_dynamic_fee_without_manager_returns_zero() {
        let contract = PropertyRegistry::new();
        assert_eq!(contract.get_dynamic_fee(FeeOperation::RegisterProperty), 0);
        assert_eq!(contract.get_dynamic_fee(FeeOperation::TransferProperty), 0);
    }

    #[ink::test]
    fn test_set_fee_manager_admin_only() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();
        let fee_manager_addr = AccountId::from([0x42; 32]);
        assert!(contract.set_fee_manager(Some(fee_manager_addr)).is_ok());
        assert_eq!(contract.get_fee_manager(), Some(fee_manager_addr));

        set_caller(accounts.bob);
        assert!(contract.set_fee_manager(None).is_err());
        assert_eq!(contract.get_fee_manager(), Some(fee_manager_addr));
    }

    #[ink::test]
    fn test_set_fee_manager_clear() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = PropertyRegistry::new();
        contract
            .set_fee_manager(Some(AccountId::from([0x42; 32])))
            .unwrap();
        assert!(contract.set_fee_manager(None).is_ok());
        assert_eq!(contract.get_fee_manager(), None);
    }

    // ============================================================================
    // COMPLIANCE INTEGRATION (Issue #45)
    // ============================================================================

    #[ink::test]
    fn test_check_account_compliance_without_registry_returns_true() {
        let contract = PropertyRegistry::new();
        let accounts = default_accounts();
        assert_eq!(contract.check_account_compliance(accounts.alice), Ok(true));
        assert_eq!(contract.check_account_compliance(accounts.bob), Ok(true));
    }
}
