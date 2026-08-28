#![cfg_attr(not(feature = "std"), no_std)]
#![allow(unexpected_cfgs)]

//! Metadata contract for validating and storing IPFS-linked property metadata.


use ink::prelude::string::String;
use ink::prelude::vec::Vec;
use ink::storage::Mapping;
use scale::Encode;
mod state_root;

mod validation;

#[ink::contract]
#[allow(clippy::too_many_arguments)]
mod ipfs_metadata {
    use super::*;

    // ============================================================================
    // TYPES AND STRUCTURES
    // ============================================================================

    /// IPFS Content Identifier (CID) - stored as String for flexibility
    pub type IpfsCid = String;

    /// Error types for IPFS metadata validation
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        /// Property not found
        PropertyNotFound,
        /// Unauthorized access
        Unauthorized,
        /// Invalid metadata structure
        InvalidMetadata,
        /// Required field missing
        RequiredFieldMissing,
        /// Data type mismatch
        DataTypeMismatch,
        /// Size limit exceeded
        SizeLimitExceeded,
        /// Invalid IPFS CID format
        InvalidIpfsCid,
        /// IPFS network failure
        IpfsNetworkFailure,
        /// Content hash mismatch
        ContentHashMismatch,
        /// Malicious file detected
        MaliciousFileDetected,
        /// File type not allowed
        FileTypeNotAllowed,
        /// Encryption required
        EncryptionRequired,
        /// Pin limit exceeded
        PinLimitExceeded,
        /// Document not found
        DocumentNotFound,
        /// Document already exists
        DocumentAlreadyExists,
    }

    /// Enhanced property metadata with IPFS integration
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct PropertyMetadata {
        /// Physical address (required)
        pub location: String,
        /// Property size in square meters (required)
        pub size: u64,
        /// Legal description (required)
        pub legal_description: String,
        /// Valuation in smallest currency unit (required)
        pub valuation: u128,
        /// IPFS CID for main documents bundle
        pub documents_ipfs_cid: Option<IpfsCid>,
        /// IPFS CID for property images
        pub images_ipfs_cid: Option<IpfsCid>,
        /// IPFS CID for legal documents
        pub legal_docs_ipfs_cid: Option<IpfsCid>,
        /// Timestamp of metadata creation
        pub created_at: u64,
        /// Hash of all metadata content for verification
        pub content_hash: Hash,
        /// Whether sensitive data is encrypted
        pub is_encrypted: bool,
    }

    /// Document information stored on IPFS
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct IpfsDocument {
        /// Document unique identifier
        pub document_id: u64,
        /// Property ID this document belongs to
        pub property_id: u64,
        /// IPFS Content ID
        pub ipfs_cid: IpfsCid,
        /// Document type (deed, title, inspection, etc.)
        pub document_type: DocumentType,
        /// Hash of the document content for verification
        pub content_hash: Hash,
        /// File size in bytes
        pub file_size: u64,
        /// MIME type of the document
        pub mime_type: String,
        /// Whether document is pinned on IPFS
        pub is_pinned: bool,
        /// Whether document contains encrypted data
        pub is_encrypted: bool,
        /// Uploader account
        pub uploader: AccountId,
        /// Upload timestamp
        pub uploaded_at: u64,
        /// Last verification timestamp
        pub last_verified_at: u64,
    }

    /// Document type enumeration
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub enum DocumentType {
        /// Property deed
        Deed,
        /// Property title
        Title,
        /// Inspection report
        Inspection,
        /// Appraisal report
        Appraisal,
        /// Survey document
        Survey,
        /// Tax records
        TaxRecords,
        /// Insurance documents
        Insurance,
        /// Property images
        Images,
        /// Floor plans
        FloorPlans,
        /// Legal agreements
        Legal,
        /// Other document type
        Other,
    }

    /// Metadata validation rules
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct ValidationRules {
        /// Maximum location string length
        pub max_location_length: u32,
        /// Minimum property size
        pub min_size: u64,
        /// Maximum property size
        pub max_size: u64,
        /// Maximum legal description length
        pub max_legal_description_length: u32,
        /// Minimum valuation
        pub min_valuation: u128,
        /// Maximum file size for documents (in bytes)
        pub max_file_size: u64,
        /// Allowed MIME types
        pub allowed_mime_types: Vec<String>,
        /// Maximum number of documents per property
        pub max_documents_per_property: u32,
        /// Maximum total pinned size per property (in bytes)
        pub max_pinned_size_per_property: u64,
    }

    // ============================================================================
    // EVENTS
    // ============================================================================

    /// Event emitted when metadata is validated successfully
    #[ink(event)]
    pub struct MetadataValidated {
        #[ink(topic)]
        property_id: u64,
        #[ink(topic)]
        validator: AccountId,
        timestamp: u64,
    }

    /// Event emitted when document is uploaded to IPFS
    #[ink(event)]
    pub struct DocumentUploaded {
        #[ink(topic)]
        document_id: u64,
        #[ink(topic)]
        property_id: u64,
        #[ink(topic)]
        ipfs_cid: String,
        document_type: DocumentType,
        file_size: u64,
        uploader: AccountId,
        timestamp: u64,
    }

    /// Event emitted when document is pinned on IPFS
    #[ink(event)]
    pub struct DocumentPinned {
        #[ink(topic)]
        document_id: u64,
        #[ink(topic)]
        ipfs_cid: String,
        timestamp: u64,
    }

    /// Event emitted when document is unpinned from IPFS
    #[ink(event)]
    pub struct DocumentUnpinned {
        #[ink(topic)]
        document_id: u64,
        #[ink(topic)]
        ipfs_cid: String,
        timestamp: u64,
    }

    /// Event emitted when content hash is verified
    #[ink(event)]
    pub struct ContentHashVerified {
        #[ink(topic)]
        document_id: u64,
        #[ink(topic)]
        ipfs_cid: String,
        content_hash: Hash,
        timestamp: u64,
    }

    /// Event emitted when IPFS network failure occurs
    #[ink(event)]
    pub struct IpfsNetworkFailure {
        #[ink(topic)]
        operation: String,
        error_message: String,
        timestamp: u64,
    }

    /// Event emitted when malicious file is detected
    #[ink(event)]
    pub struct MaliciousFileDetected {
        #[ink(topic)]
        document_id: u64,
        #[ink(topic)]
        uploader: AccountId,
        reason: String,
        timestamp: u64,
    }

    // ============================================================================
    // CONTRACT STORAGE
    // ============================================================================

    #[ink(storage)]
    pub struct IpfsMetadataRegistry {
        /// Contract admin
        admin: AccountId,
        /// Mapping from property ID to metadata
        property_metadata: Mapping<u64, PropertyMetadata>,
        /// Mapping from document ID to document info
        documents: Mapping<u64, IpfsDocument>,
        /// Mapping from property ID to document IDs
        property_documents: Mapping<u64, Vec<u64>>,
        /// Mapping from IPFS CID to document ID
        cid_to_document: Mapping<String, u64>,
        /// Document counter
        document_count: u64,
        /// Validation rules
        validation_rules: ValidationRules,
        /// Mapping from property ID to total pinned size
        property_pinned_size: Mapping<u64, u64>,
        /// Mapping from account to access permissions
        access_permissions: Mapping<(u64, AccountId), AccessLevel>,
    }

    /// Access level for property documents
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub enum AccessLevel {
        None,
        Read,
        Write,
        Admin,
    }

    // ============================================================================
    // IMPLEMENTATION
    // ============================================================================

    impl IpfsMetadataRegistry {
        /// Creates a new IPFS metadata registry
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();

            Self {
                admin: caller,
                property_metadata: Mapping::default(),
                documents: Mapping::default(),
                property_documents: Mapping::default(),
                cid_to_document: Mapping::default(),
                document_count: 0,
                validation_rules: ValidationRules {
                    max_location_length: 500,
                    min_size: 1,
                    max_size: 1_000_000_000, // 1 billion sq meters
                    max_legal_description_length: 5000,
                    min_valuation: 1,
                    max_file_size: 100_000_000,     // 100 MB
                    allowed_mime_types: Vec::new(), // Initialize empty, populate via update
                    max_documents_per_property: 100,
                    max_pinned_size_per_property: 500_000_000, // 500 MB
                },
                property_pinned_size: Mapping::default(),
                access_permissions: Mapping::default(),
            }
        }

        /// Creates a new IPFS metadata registry with custom validation rules
        #[ink(constructor)]
        pub fn new_with_rules(rules: ValidationRules) -> Self {
            let caller = Self::env().caller();

            Self {
                admin: caller,
                property_metadata: Mapping::default(),
                documents: Mapping::default(),
                property_documents: Mapping::default(),
                cid_to_document: Mapping::default(),
                document_count: 0,
                validation_rules: rules,
                property_pinned_size: Mapping::default(),
                access_permissions: Mapping::default(),
            }
        }

        // ============================================================================
        // METADATA VALIDATION
        // ============================================================================

        /// Validates and registers property metadata
        #[ink(message)]
        pub fn validate_and_register_metadata(
            &mut self,
            property_id: u64,
            metadata: PropertyMetadata,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Validate metadata structure
            self.validate_metadata(metadata.clone())?;

            // Store metadata
            self.property_metadata.insert(property_id, &metadata);

            // Grant admin access to property owner
            self.access_permissions
                .insert((property_id, caller), &AccessLevel::Admin);

            // Emit validation event
            self.env().emit_event(MetadataValidated {
                property_id,
                validator: caller,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Validates metadata according to validation rules
        #[ink(message)]
        pub fn validate_metadata(&self, metadata: PropertyMetadata) -> Result<(), Error> {
            // Check required fields
            if metadata.location.is_empty() {
                return Err(Error::RequiredFieldMissing);
            }

            if metadata.legal_description.is_empty() {
                return Err(Error::RequiredFieldMissing);
            }

            // Check size limits
            if metadata.location.len() as u32 > self.validation_rules.max_location_length {
                return Err(Error::SizeLimitExceeded);
            }

            if metadata.legal_description.len() as u32
                > self.validation_rules.max_legal_description_length
            {
                return Err(Error::SizeLimitExceeded);
            }

            // Check data type validation
            if metadata.size < self.validation_rules.min_size
                || metadata.size > self.validation_rules.max_size
            {
                return Err(Error::DataTypeMismatch);
            }

            if metadata.valuation < self.validation_rules.min_valuation {
                return Err(Error::DataTypeMismatch);
            }

            // Validate IPFS CIDs if present
            if let Some(ref cid) = metadata.documents_ipfs_cid {
                self.validate_ipfs_cid(cid.clone())?;
            }

            if let Some(ref cid) = metadata.images_ipfs_cid {
                self.validate_ipfs_cid(cid.clone())?;
            }

            if let Some(ref cid) = metadata.legal_docs_ipfs_cid {
                self.validate_ipfs_cid(cid.clone())?;
            }

            Ok(())
        }

        /// Validates IPFS CID format
        #[ink(message)]
        pub fn validate_ipfs_cid(&self, cid: String) -> Result<(), Error> {
            // Basic CID validation
            // CIDv0: starts with "Qm" and is 46 characters
            // CIDv1: starts with "b" and uses base32
            if cid.is_empty() {
                return Err(Error::InvalidIpfsCid);
            }

            if cid.starts_with("Qm") {
                // CIDv0: must be exactly 46 characters
                if cid.len() == 46 {
                    Ok(())
                } else {
                    Err(Error::InvalidIpfsCid)
                }
            } else if cid.starts_with('b') {
                // CIDv1: minimum length check
                if cid.len() >= 10 {
                    Ok(())
                } else {
                    Err(Error::InvalidIpfsCid)
                }
            } else {
                // Neither CIDv0 nor CIDv1 format
                Err(Error::InvalidIpfsCid)
            }
        }

        // ============================================================================
        // IPFS DOCUMENT MANAGEMENT
        // ============================================================================

        /// Uploads document metadata to registry (actual IPFS upload handled off-chain)
        #[ink(message)]
        #[allow(clippy::too_many_arguments)]
        pub fn register_ipfs_document(
            &mut self,
            property_id: u64,
            ipfs_cid: IpfsCid,
            document_type: DocumentType,
            content_hash: Hash,
            file_size: u64,
            mime_type: String,
            is_encrypted: bool,
        ) -> Result<u64, Error> {
            let caller = self.env().caller();

            // Check access permissions
            self.check_write_access(property_id, caller)?;

            self.validate_ipfs_cid(ipfs_cid.clone())?;

            // Check if document already exists
            if self.cid_to_document.contains(&ipfs_cid) {
                return Err(Error::DocumentAlreadyExists);
            }

            // Validate file size
            if file_size > self.validation_rules.max_file_size {
                return Err(Error::SizeLimitExceeded);
            }

            // Check total documents count
            let doc_ids = self.property_documents.get(property_id).unwrap_or_default();
            if doc_ids.len() as u32 >= self.validation_rules.max_documents_per_property {
                return Err(Error::SizeLimitExceeded);
            }

            // Validate MIME type if restrictions are set
            if !self.validation_rules.allowed_mime_types.is_empty() {
                if !self
                    .validation_rules
                    .allowed_mime_types
                    .contains(&mime_type)
                {
                    return Err(Error::FileTypeNotAllowed);
                }
            }

            // Increment document counter
            self.document_count += 1;
            let document_id = self.document_count;

            let timestamp = self.env().block_timestamp();

            // Create document record
            let document = IpfsDocument {
                document_id,
                property_id,
                ipfs_cid: ipfs_cid.clone(),
                document_type: document_type.clone(),
                content_hash,
                file_size,
                mime_type,
                is_pinned: false,
                is_encrypted,
                uploader: caller,
                uploaded_at: timestamp,
                last_verified_at: timestamp,
            };

            // Store document
            self.documents.insert(document_id, &document);
            self.cid_to_document.insert(&ipfs_cid, &document_id);

            // Update property documents list
            let mut doc_ids = self.property_documents.get(property_id).unwrap_or_default();
            doc_ids.push(document_id);
            self.property_documents.insert(property_id, &doc_ids);

            // Emit event
            self.env().emit_event(DocumentUploaded {
                document_id,
                property_id,
                ipfs_cid,
                document_type,
                file_size,
                uploader: caller,
                timestamp,
            });

            Ok(document_id)
        }

        /// Pins a document on IPFS
        #[ink(message)]
        pub fn pin_document(&mut self, document_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            let mut document = self
                .documents
                .get(document_id)
                .ok_or(Error::DocumentNotFound)?;

            // Check access permissions
            self.check_write_access(document.property_id, caller)?;

            // Check if already pinned
            if document.is_pinned {
                return Ok(());
            }

            // Check pin size limits
            let current_pinned_size = self
                .property_pinned_size
                .get(document.property_id)
                .unwrap_or(0);

            if current_pinned_size + document.file_size
                > self.validation_rules.max_pinned_size_per_property
            {
                return Err(Error::PinLimitExceeded);
            }

            // Update document pin status
            document.is_pinned = true;
            self.documents.insert(document_id, &document);

            // Update total pinned size
            self.property_pinned_size.insert(
                document.property_id,
                &(current_pinned_size + document.file_size),
            );

            // Emit event
            self.env().emit_event(DocumentPinned {
                document_id,
                ipfs_cid: document.ipfs_cid,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Unpins a document from IPFS
        #[ink(message)]
        pub fn unpin_document(&mut self, document_id: u64) -> Result<(), Error> {
            let caller = self.env().caller();

            let mut document = self
                .documents
                .get(document_id)
                .ok_or(Error::DocumentNotFound)?;

            // Check access permissions
            self.check_write_access(document.property_id, caller)?;

            // Check if already unpinned
            if !document.is_pinned {
                return Ok(());
            }

            // Update document pin status
            document.is_pinned = false;
            self.documents.insert(document_id, &document);

            // Update total pinned size
            let current_pinned_size = self
                .property_pinned_size
                .get(document.property_id)
                .unwrap_or(0);

            if current_pinned_size >= document.file_size {
                self.property_pinned_size.insert(
                    document.property_id,
                    &(current_pinned_size - document.file_size),
                );
            }

            // Emit event
            self.env().emit_event(DocumentUnpinned {
                document_id,
                ipfs_cid: document.ipfs_cid,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Verifies content hash of a document
        #[ink(message)]
        pub fn verify_content_hash(
            &mut self,
            document_id: u64,
            provided_hash: Hash,
        ) -> Result<bool, Error> {
            let caller = self.env().caller();

            let mut document = self
                .documents
                .get(document_id)
                .ok_or(Error::DocumentNotFound)?;

            // Check access permissions
            self.check_read_access(document.property_id, caller)?;

            // Verify hash
            let is_valid = document.content_hash == provided_hash;

            if is_valid {
                // Update last verified timestamp
                document.last_verified_at = self.env().block_timestamp();
                self.documents.insert(document_id, &document);

                // Emit verification event
                self.env().emit_event(ContentHashVerified {
                    document_id,
                    ipfs_cid: document.ipfs_cid,
                    content_hash: provided_hash,
                    timestamp: self.env().block_timestamp(),
                });
            } else {
                return Err(Error::ContentHashMismatch);
            }

            Ok(is_valid)
        }

        // ============================================================================
        // ACCESS CONTROL
        // ============================================================================

        /// Grants access to property documents
        #[ink(message)]
        pub fn grant_access(
            &mut self,
            property_id: u64,
            account: AccountId,
            access_level: AccessLevel,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            // Only admin or property owner can grant access
            if caller != self.admin {
                self.check_admin_access(property_id, caller)?;
            }

            self.access_permissions
                .insert((property_id, account), &access_level);

            Ok(())
        }

        /// Revokes access to property documents
        #[ink(message)]
        pub fn revoke_access(&mut self, property_id: u64, account: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();

            // Only admin or property owner can revoke access
            if caller != self.admin {
                self.check_admin_access(property_id, caller)?;
            }

            self.access_permissions.remove((property_id, account));

            Ok(())
        }

        /// Checks if account has read access
        fn check_read_access(&self, property_id: u64, account: AccountId) -> Result<(), Error> {
            if account == self.admin {
                return Ok(());
            }

            let access_level = self
                .access_permissions
                .get((property_id, account))
                .unwrap_or(AccessLevel::None);

            match access_level {
                AccessLevel::None => Err(Error::Unauthorized),
                _ => Ok(()),
            }
        }

        /// Checks if account has write access
        fn check_write_access(&self, property_id: u64, account: AccountId) -> Result<(), Error> {
            if account == self.admin {
                return Ok(());
            }

            let access_level = self
                .access_permissions
                .get((property_id, account))
                .unwrap_or(AccessLevel::None);

            match access_level {
                AccessLevel::Write | AccessLevel::Admin => Ok(()),
                _ => Err(Error::Unauthorized),
            }
        }

        /// Checks if account has admin access
        fn check_admin_access(&self, property_id: u64, account: AccountId) -> Result<(), Error> {
            let access_level = self
                .access_permissions
                .get((property_id, account))
                .unwrap_or(AccessLevel::None);

            match access_level {
                AccessLevel::Admin => Ok(()),
                _ => Err(Error::Unauthorized),
            }
        }

        // ============================================================================
        // QUERY FUNCTIONS
        // ============================================================================

        /// Gets property metadata
        #[ink(message)]
        pub fn get_metadata(&self, property_id: u64) -> Option<PropertyMetadata> {
            self.property_metadata.get(property_id)
        }

        /// Gets document information
        #[ink(message)]
        pub fn get_document(&self, document_id: u64) -> Option<IpfsDocument> {
            self.documents.get(document_id)
        }

        /// Gets all documents for a property
        #[ink(message)]
        pub fn get_property_documents(&self, property_id: u64) -> Vec<u64> {
            self.property_documents.get(property_id).unwrap_or_default()
        }

        /// Gets document by IPFS CID
        #[ink(message)]
        pub fn get_document_by_cid(&self, ipfs_cid: IpfsCid) -> Option<IpfsDocument> {
            let document_id = self.cid_to_document.get(&ipfs_cid)?;
            self.documents.get(document_id)
        }

        /// Gets validation rules
        #[ink(message)]
        pub fn get_validation_rules(&self) -> ValidationRules {
            self.validation_rules.clone()
        }

        /// Gets total pinned size for a property
        #[ink(message)]
        pub fn get_property_pinned_size(&self, property_id: u64) -> u64 {
            self.property_pinned_size.get(property_id).unwrap_or(0)
        }

        // ============================================================================
        // ADMIN FUNCTIONS
        // ============================================================================

        /// Updates validation rules (admin only)
        #[ink(message)]
        pub fn update_validation_rules(&mut self, rules: ValidationRules) -> Result<(), Error> {
            let caller = self.env().caller();

            if caller != self.admin {
                return Err(Error::Unauthorized);
            }

            self.validation_rules = rules;

            Ok(())
        }

        /// Adds allowed MIME type (admin only)
        #[ink(message)]
        pub fn add_allowed_mime_type(&mut self, mime_type: String) -> Result<(), Error> {
            let caller = self.env().caller();

            if caller != self.admin {
                return Err(Error::Unauthorized);
            }

            if !self
                .validation_rules
                .allowed_mime_types
                .contains(&mime_type)
            {
                self.validation_rules.allowed_mime_types.push(mime_type);
            }

            Ok(())
        }

        /// Reports malicious file (admin only)
        #[ink(message)]
        pub fn report_malicious_file(
            &mut self,
            document_id: u64,
            reason: String,
        ) -> Result<(), Error> {
            let caller = self.env().caller();

            if caller != self.admin {
                return Err(Error::Unauthorized);
            }

            let document = self
                .documents
                .get(document_id)
                .ok_or(Error::DocumentNotFound)?;

            // Emit malicious file event
            self.env().emit_event(MaliciousFileDetected {
                document_id,
                uploader: document.uploader,
                reason,
                timestamp: self.env().block_timestamp(),
            });

            // Remove document from registry
            self.documents.remove(document_id);
            self.cid_to_document.remove(&document.ipfs_cid);

            // Remove from property documents list
            let mut doc_ids = self
                .property_documents
                .get(document.property_id)
                .unwrap_or_default();
            doc_ids.retain(|&id| id != document_id);
            self.property_documents
                .insert(document.property_id, &doc_ids);

            Ok(())
        }

        /// Handles IPFS network failure gracefully
        #[ink(message)]
        pub fn handle_ipfs_failure(
            &mut self,
            operation: String,
            error_message: String,
        ) -> Result<(), Error> {
            // Emit network failure event
            self.env().emit_event(IpfsNetworkFailure {
                operation,
                error_message,
                timestamp: self.env().block_timestamp(),
            });

            // In production, this would trigger fallback mechanisms
            // such as trying alternative IPFS gateways or storage providers

            Ok(())
        }

        /// Gets contract admin
        #[ink(message)]
        pub fn admin(&self) -> AccountId {
            self.admin
        }

        /// Gets total document count
        #[ink(message)]
        pub fn document_count(&self) -> u64 {
            self.document_count
        }

        #[ink(message)]
        pub fn get_state_root(&self) -> crate::state_root::StateRoot {
            crate::state_root::compute_root(&vec![self.admin.encode(), self.document_count.encode()])
        }
    }

    impl Default for IpfsMetadataRegistry {
        /// Build an empty metadata registry for tests and default construction.
        fn default() -> Self {
            Self::new()
        }
    }
}

#[cfg(test)]
mod tests;
