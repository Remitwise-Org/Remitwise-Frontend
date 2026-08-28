#[cfg(test)]
#[allow(clippy::module_inception)]
mod tests {
    use super::*;
    use ink::prelude::string::String;
    use ink::prelude::vec::Vec;
    use ink::primitives::Hash;

    use crate::ipfs_metadata::{
        AccessLevel, DocumentType, Error, IpfsMetadataRegistry, PropertyMetadata, ValidationRules,
    };

    // Helper function to create default validation rules
    fn default_validation_rules() -> ValidationRules {
        ValidationRules {
            max_location_length: 500,
            min_size: 1,
            max_size: 1_000_000_000,
            max_legal_description_length: 5000,
            min_valuation: 1,
            max_file_size: 100_000_000,
            allowed_mime_types: vec![
                "application/pdf".to_string(),
                "image/jpeg".to_string(),
                "image/png".to_string(),
            ],
            max_documents_per_property: 100,
            max_pinned_size_per_property: 500_000_000,
        }
    }

    // Helper function to create valid property metadata
    fn valid_property_metadata() -> PropertyMetadata {
        PropertyMetadata {
            location: "123 Main St, City, State 12345".to_string(),
            size: 2500,
            legal_description: "Lot 123, Block 4, Subdivision XYZ".to_string(),
            valuation: 500_000_000_000, // $500,000 in smallest unit
            documents_ipfs_cid: Some("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG".to_string()),
            images_ipfs_cid: Some("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdH".to_string()),
            legal_docs_ipfs_cid: Some("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdI".to_string()),
            created_at: 1234567890,
            content_hash: Hash::from([0x01; 32]),
            is_encrypted: false,
        }
    }

    // ============================================================================
    // CONSTRUCTOR TESTS
    // ============================================================================

    #[ink::test]
    fn test_new_contract() {
        let contract = IpfsMetadataRegistry::new();
        let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();

        assert_eq!(contract.admin(), accounts.alice);
        assert_eq!(contract.document_count(), 0);
    }

    #[ink::test]
    fn test_new_with_custom_rules() {
        let rules = default_validation_rules();
        let contract = IpfsMetadataRegistry::new_with_rules(rules.clone());

        let retrieved_rules = contract.get_validation_rules();
        assert_eq!(retrieved_rules.max_location_length, 500);
        assert_eq!(retrieved_rules.max_file_size, 100_000_000);
    }

    // ============================================================================
    // METADATA VALIDATION TESTS
    // ============================================================================

    #[ink::test]
    fn test_validate_metadata_success() {
        let contract = IpfsMetadataRegistry::new();
        let metadata = valid_property_metadata();

        let result = contract.validate_metadata(metadata);
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_validate_metadata_empty_location() {
        let contract = IpfsMetadataRegistry::new();
        let mut metadata = valid_property_metadata();
        metadata.location = String::new();

        let result = contract.validate_metadata(metadata);
        assert_eq!(result, Err(Error::RequiredFieldMissing));
    }

    #[ink::test]
    fn test_validate_metadata_empty_legal_description() {
        let contract = IpfsMetadataRegistry::new();
        let mut metadata = valid_property_metadata();
        metadata.legal_description = String::new();

        let result = contract.validate_metadata(metadata);
        assert_eq!(result, Err(Error::RequiredFieldMissing));
    }

    #[ink::test]
    fn test_validate_metadata_location_too_long() {
        let contract = IpfsMetadataRegistry::new();
        let mut metadata = valid_property_metadata();
        metadata.location = "a".repeat(501);

        let result = contract.validate_metadata(metadata);
        assert_eq!(result, Err(Error::SizeLimitExceeded));
    }

    #[ink::test]
    fn test_validate_metadata_size_too_small() {
        let contract = IpfsMetadataRegistry::new();
        let mut metadata = valid_property_metadata();
        metadata.size = 0;

        let result = contract.validate_metadata(metadata);
        assert_eq!(result, Err(Error::DataTypeMismatch));
    }

    #[ink::test]
    fn test_validate_metadata_size_too_large() {
        let contract = IpfsMetadataRegistry::new();
        let mut metadata = valid_property_metadata();
        metadata.size = 1_000_000_001;

        let result = contract.validate_metadata(metadata);
        assert_eq!(result, Err(Error::DataTypeMismatch));
    }

    #[ink::test]
    fn test_validate_metadata_valuation_too_low() {
        let contract = IpfsMetadataRegistry::new();
        let mut metadata = valid_property_metadata();
        metadata.valuation = 0;

        let result = contract.validate_metadata(metadata);
        assert_eq!(result, Err(Error::DataTypeMismatch));
    }

    // ============================================================================
    // IPFS CID VALIDATION TESTS
    // ============================================================================

    #[ink::test]
    fn test_validate_ipfs_cid_v0_valid() {
        let contract = IpfsMetadataRegistry::new();
        let cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

        let result = contract.validate_ipfs_cid(cid.to_string());
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_validate_ipfs_cid_v1_valid() {
        let contract = IpfsMetadataRegistry::new();
        let cid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

        let result = contract.validate_ipfs_cid(cid.to_string());
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_validate_ipfs_cid_empty() {
        let contract = IpfsMetadataRegistry::new();
        let cid = "";

        let result = contract.validate_ipfs_cid(cid.to_string());
        assert_eq!(result, Err(Error::InvalidIpfsCid));
    }

    #[ink::test]
    fn test_validate_ipfs_cid_v0_wrong_length() {
        let contract = IpfsMetadataRegistry::new();
        let cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbd"; // 45 chars

        let result = contract.validate_ipfs_cid(cid.to_string());
        assert_eq!(result, Err(Error::InvalidIpfsCid));
    }

    #[ink::test]
    fn test_validate_ipfs_cid_invalid_prefix() {
        let contract = IpfsMetadataRegistry::new();
        let cid = "XmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG";

        let result = contract.validate_ipfs_cid(cid.to_string());
        assert_eq!(result, Err(Error::InvalidIpfsCid));
    }

    // ============================================================================
    // REGISTER METADATA TESTS
    // ============================================================================

    #[ink::test]
    fn test_register_metadata_success() {
        let mut contract = IpfsMetadataRegistry::new();
        let metadata = valid_property_metadata();
        let property_id = 1;

        let result = contract.validate_and_register_metadata(property_id, metadata.clone());
        assert!(result.is_ok());

        let retrieved = contract.get_metadata(property_id);
        assert!(retrieved.is_some());
        assert_eq!(
            retrieved
                .expect("Metadata should exist after registration")
                .location,
            metadata.location
        );
    }

    #[ink::test]
    fn test_register_metadata_invalid() {
        let mut contract = IpfsMetadataRegistry::new();
        let mut metadata = valid_property_metadata();
        metadata.location = String::new();
        let property_id = 1;

        let result = contract.validate_and_register_metadata(property_id, metadata);
        assert_eq!(result, Err(Error::RequiredFieldMissing));
    }

    // ============================================================================
    // DOCUMENT REGISTRATION TESTS
    // ============================================================================

    #[ink::test]
    fn test_register_document_success() {
        let _accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
        let mut contract = IpfsMetadataRegistry::new();

        // First register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Register document
        let ipfs_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string();
        let content_hash = Hash::from([0x02; 32]);

        let result = contract.register_ipfs_document(
            property_id,
            ipfs_cid.clone(),
            DocumentType::Deed,
            content_hash,
            1_000_000,
            "application/pdf".to_string(),
            false,
        );

        assert!(result.is_ok());
        let document_id = result.expect("Document registration should succeed in test");
        assert_eq!(document_id, 1);

        // Verify document was stored
        let document = contract.get_document(document_id);
        assert!(document.is_some());
        assert_eq!(
            document
                .expect("Document should exist after registration")
                .ipfs_cid,
            ipfs_cid
        );
    }

    #[ink::test]
    fn test_register_document_invalid_cid() {
        let mut contract = IpfsMetadataRegistry::new();

        // First register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Try to register document with invalid CID
        let ipfs_cid = "invalid_cid".to_string();
        let content_hash = Hash::from([0x02; 32]);

        let result = contract.register_ipfs_document(
            property_id,
            ipfs_cid,
            DocumentType::Deed,
            content_hash,
            1_000_000,
            "application/pdf".to_string(),
            false,
        );

        assert_eq!(result, Err(Error::InvalidIpfsCid));
    }

    #[ink::test]
    fn test_register_document_file_too_large() {
        let mut contract = IpfsMetadataRegistry::new();

        // First register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Try to register document that's too large
        let ipfs_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string();
        let content_hash = Hash::from([0x02; 32]);

        let result = contract.register_ipfs_document(
            property_id,
            ipfs_cid,
            DocumentType::Deed,
            content_hash,
            200_000_000, // Exceeds max_file_size
            "application/pdf".to_string(),
            false,
        );

        assert_eq!(result, Err(Error::SizeLimitExceeded));
    }

    #[ink::test]
    fn test_register_document_duplicate_cid() {
        let mut contract = IpfsMetadataRegistry::new();

        // First register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Register first document
        let ipfs_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string();
        let content_hash = Hash::from([0x02; 32]);

        contract
            .register_ipfs_document(
                property_id,
                ipfs_cid.clone(),
                DocumentType::Deed,
                content_hash,
                1_000_000,
                "application/pdf".to_string(),
                false,
            )
            .expect("Metadata registration should succeed in test");

        // Try to register same CID again
        let result = contract.register_ipfs_document(
            property_id,
            ipfs_cid,
            DocumentType::Title,
            content_hash,
            1_000_000,
            "application/pdf".to_string(),
            false,
        );

        assert_eq!(result, Err(Error::DocumentAlreadyExists));
    }

    // ============================================================================
    // PIN/UNPIN TESTS
    // ============================================================================

    #[ink::test]
    fn test_pin_document_success() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata and document
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        let document_id = contract
            .register_ipfs_document(
                property_id,
                "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string(),
                DocumentType::Deed,
                Hash::from([0x02; 32]),
                1_000_000,
                "application/pdf".to_string(),
                false,
            )
            .expect("Metadata registration should succeed in test");

        // Pin document
        let result = contract.pin_document(document_id);
        assert!(result.is_ok());

        // Verify it's pinned
        let document = contract
            .get_document(document_id)
            .expect("Document should exist in test");
        assert!(document.is_pinned);

        // Verify pinned size updated
        let pinned_size = contract.get_property_pinned_size(property_id);
        assert_eq!(pinned_size, 1_000_000);
    }

    #[ink::test]
    fn test_pin_document_exceeds_limit() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Register 6 documents at max_file_size (100 MB each).
        // The max_pinned_size_per_property is 500 MB, so pinning 5 fills it;
        // the 6th pin must be rejected with PinLimitExceeded.
        // Using distinct CIDs (last character differs: A-F).
        let cids = [
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdA",
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdB",
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdC",
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdD",
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdE",
            "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdF",
        ];

        let mut document_ids = Vec::new();
        for (i, cid) in cids.iter().enumerate() {
            let doc_id = contract
                .register_ipfs_document(
                    property_id,
                    cid.to_string(),
                    DocumentType::Deed,
                    Hash::from([(i + 1) as u8; 32]),
                    100_000_000, // 100 MB — within max_file_size
                    "application/pdf".to_string(),
                    false,
                )
                .unwrap();
            document_ids.push(doc_id);
        }

        // Pin the first 5 documents to reach the 500 MB pin limit
        for &doc_id in &document_ids[..5] {
            contract.pin_document(doc_id).unwrap();
        }

        // Pinning the 6th document (100 MB) would bring total to 600 MB > 500 MB limit
        let result = contract.pin_document(document_ids[5]);
        assert_eq!(result, Err(Error::PinLimitExceeded));
    }

    #[ink::test]
    fn test_unpin_document_success() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata and document
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        let document_id = contract
            .register_ipfs_document(
                property_id,
                "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string(),
                DocumentType::Deed,
                Hash::from([0x02; 32]),
                1_000_000,
                "application/pdf".to_string(),
                false,
            )
            .expect("Metadata registration should succeed in test");

        // Pin then unpin
        contract.pin_document(document_id).unwrap();
        let result = contract.unpin_document(document_id);
        assert!(result.is_ok());

        // Verify it's unpinned
        let document = contract
            .get_document(document_id)
            .expect("Document should exist in test");
        assert!(!document.is_pinned);

        // Verify pinned size updated
        let pinned_size = contract.get_property_pinned_size(property_id);
        assert_eq!(pinned_size, 0);
    }

    // ============================================================================
    // CONTENT HASH VERIFICATION TESTS
    // ============================================================================

    #[ink::test]
    fn test_verify_content_hash_success() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata and document
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        let content_hash = Hash::from([0x02; 32]);
        let document_id = contract
            .register_ipfs_document(
                property_id,
                "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string(),
                DocumentType::Deed,
                content_hash,
                1_000_000,
                "application/pdf".to_string(),
                false,
            )
            .expect("Metadata registration should succeed in test");

        // Verify with correct hash
        let result = contract.verify_content_hash(document_id, content_hash);
        assert!(result.is_ok());
        assert!(result.expect("Hash verification should succeed in test"));
    }

    #[ink::test]
    fn test_verify_content_hash_mismatch() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata and document
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        let content_hash = Hash::from([0x02; 32]);
        let document_id = contract
            .register_ipfs_document(
                property_id,
                "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string(),
                DocumentType::Deed,
                content_hash,
                1_000_000,
                "application/pdf".to_string(),
                false,
            )
            .expect("Metadata registration should succeed in test");

        // Verify with incorrect hash
        let wrong_hash = Hash::from([0x03; 32]);
        let result = contract.verify_content_hash(document_id, wrong_hash);
        assert_eq!(result, Err(Error::ContentHashMismatch));
    }

    // ============================================================================
    // ACCESS CONTROL TESTS
    // ============================================================================

    #[ink::test]
    fn test_grant_access_success() {
        let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Grant access to Bob
        let result = contract.grant_access(property_id, accounts.bob, AccessLevel::Read);
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_revoke_access_success() {
        let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Grant then revoke access
        contract
            .grant_access(property_id, accounts.bob, AccessLevel::Read)
            .expect("Metadata registration should succeed in test");
        let result = contract.revoke_access(property_id, accounts.bob);
        assert!(result.is_ok());
    }

    // ============================================================================
    // QUERY TESTS
    // ============================================================================

    #[ink::test]
    fn test_get_property_documents() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        // Register multiple documents
        for i in 0..3 {
            let cid = format!("QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbd{}", i);
            contract
                .register_ipfs_document(
                    property_id,
                    cid,
                    DocumentType::Deed,
                    Hash::from([i as u8; 32]),
                    1_000_000,
                    "application/pdf".to_string(),
                    false,
                )
                .expect("Metadata registration should succeed in test");
        }

        // Get all documents
        let docs = contract.get_property_documents(property_id);
        assert_eq!(docs.len(), 3);
    }

    #[ink::test]
    fn test_get_document_by_cid() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata and document
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        let ipfs_cid = "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string();
        contract
            .register_ipfs_document(
                property_id,
                ipfs_cid.clone(),
                DocumentType::Deed,
                Hash::from([0x02; 32]),
                1_000_000,
                "application/pdf".to_string(),
                false,
            )
            .expect("Metadata registration should succeed in test");

        // Get document by CID
        let document = contract.get_document_by_cid(ipfs_cid.clone());
        assert!(document.is_some());
        assert_eq!(
            document
                .expect("Document should exist after registration")
                .ipfs_cid,
            ipfs_cid
        );
    }

    // ============================================================================
    // ADMIN TESTS
    // ============================================================================

    #[ink::test]
    fn test_update_validation_rules() {
        let mut contract = IpfsMetadataRegistry::new();

        let new_rules = ValidationRules {
            max_location_length: 1000,
            min_size: 10,
            max_size: 2_000_000_000,
            max_legal_description_length: 10000,
            min_valuation: 100,
            max_file_size: 200_000_000,
            allowed_mime_types: Vec::new(),
            max_documents_per_property: 200,
            max_pinned_size_per_property: 1_000_000_000,
        };

        let result = contract.update_validation_rules(new_rules.clone());
        assert!(result.is_ok());

        let retrieved = contract.get_validation_rules();
        assert_eq!(retrieved.max_location_length, 1000);
    }

    #[ink::test]
    fn test_add_allowed_mime_type() {
        let mut contract = IpfsMetadataRegistry::new();

        let result = contract.add_allowed_mime_type("video/mp4".to_string());
        assert!(result.is_ok());

        let rules = contract.get_validation_rules();
        assert!(rules.allowed_mime_types.contains(&"video/mp4".to_string()));
    }

    #[ink::test]
    fn test_report_malicious_file() {
        let mut contract = IpfsMetadataRegistry::new();

        // Register metadata and document
        let property_id = 1;
        let metadata = valid_property_metadata();
        contract
            .validate_and_register_metadata(property_id, metadata)
            .expect("Metadata registration should succeed in test");

        let document_id = contract
            .register_ipfs_document(
                property_id,
                "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdJ".to_string(),
                DocumentType::Deed,
                Hash::from([0x02; 32]),
                1_000_000,
                "application/pdf".to_string(),
                false,
            )
            .expect("Metadata registration should succeed in test");

        // Report as malicious
        let result = contract.report_malicious_file(document_id, "Contains malware".to_string());
        assert!(result.is_ok());

        // Verify document was removed
        let document = contract.get_document(document_id);
        assert!(document.is_none());
    }

    #[ink::test]
    fn test_handle_ipfs_failure() {
        let mut contract = IpfsMetadataRegistry::new();

        let result =
            contract.handle_ipfs_failure("pin_document".to_string(), "Network timeout".to_string());
        assert!(result.is_ok());
    }
}
