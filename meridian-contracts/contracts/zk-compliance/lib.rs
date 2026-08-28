#![cfg_attr(not(feature = "std"), no_std, no_main)]

//! ZK compliance contract for proof-based regulatory checks.
//!
//! Proofs are verified with real Groth16 (arkworks over Bn254) when the crate
//! is compiled with the `zk` feature. Without the `zk` feature the contract
//! **rejects every proof** instead of auto-approving, so an unverifiable proof
//! can never be marked as `Verified`.
//!
//! Verification keys are stored per proof type in `verification_keys`
//! (`Mapping<u8, VerificationKeyRecord>`, keyed by the [`ZkProofType`]
//! discriminant) and are managed by the contract owner via
//! `set_verification_key` / `rotate_verification_key` /
//! `deactivate_verification_key`.
//!
//! Wire format (see `src/verification_keys.rs` and `scripts/generate_zk_proofs`):
//! proofs and keys use compressed arkworks serialization; each proof carries a
//! single public input derived as BLAKE2b-256 of the SCALE-encoded statement.

#[path = "src/verification_keys.rs"]
mod verification_keys;
#[path = "src/validation.rs"]
mod validation;
#[path = "state_root.rs"]
mod state_root;

#[ink::contract]
mod zk_compliance {
    use super::verification_keys;
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;
    use propchain_traits::{
        VerificationKeyRecord, ZkProofData, ZkProofStatus, ZkProofType, ZkVerifyError,
    };
    use scale::Encode;

    // Conditional imports for ZK libraries when the zk feature is enabled
    #[cfg(feature = "zk")]
    use ark_bn254::{Bn254, Fr};
    #[cfg(feature = "zk")]
    use ark_ff::PrimeField;
    #[cfg(feature = "zk")]
    use ark_groth16::{Groth16, PreparedVerifyingKey};
    #[cfg(feature = "zk")]
    use ark_snark::SNARK;

    /// User's privacy preferences
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct PrivacyPreferences {
        pub allow_analytics: bool,
        pub share_data_with_third_party: bool,
        pub consent_timestamp: u64,
        pub privacy_level: u8, // 1-5 scale, 5 being highest privacy
        pub encrypted_metadata: Vec<u8>,
    }

    /// Compliance verification using ZK proofs
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct ZkComplianceData {
        pub zk_proof_ids: Vec<u64>, // References to ZK proofs
        pub verification_status: ZkProofStatus,
        pub last_verification: u64,
        pub next_required_verification: u64,
        pub compliance_jurisdiction: u8, // 0-255 for jurisdiction encoding
        pub privacy_controls_enabled: bool,
    }

    #[ink(storage)]
    pub struct ZkCompliance {
        /// Contract owner (admin)
        owner: AccountId,
        /// Mapping of account to their ZK proofs
        zk_proofs: Mapping<(AccountId, u64), ZkProofData>,
        /// Counter for generating unique proof IDs
        proof_counter: Mapping<AccountId, u64>,
        /// User privacy preferences
        privacy_preferences: Mapping<AccountId, PrivacyPreferences>,
        /// ZK compliance data for accounts
        zk_compliance_data: Mapping<AccountId, ZkComplianceData>,
        /// Approved ZK proof verifiers
        approved_verifiers: Mapping<AccountId, bool>,
        /// Audit logs for compliance while preserving privacy
        audit_logs: Mapping<(AccountId, u64), AuditLog>,
        /// Audit log counter per account
        audit_log_count: Mapping<AccountId, u64>,
        /// Global proof verification statistics (privacy-preserving)
        verification_stats: VerificationStats,
        /// Groth16 verification keys per proof type (keyed by ZkProofType discriminant)
        verification_keys: Mapping<u8, VerificationKeyRecord>,
    }

    /// Audit log entry (without exposing sensitive data)
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct AuditLog {
        pub account: AccountId,
        pub proof_type: ZkProofType,
        pub status: ZkProofStatus,
        pub timestamp: u64,
        pub action: u8, // 0=submit, 1=verify, 2=reject, 3=expire
    }

    /// Verification statistics (aggregated, privacy-preserving)
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct VerificationStats {
        pub total_verifications: u64,
        pub successful_verifications: u64,
        pub failed_verifications: u64,
        pub last_updated: u64,
    }

    /// Privacy dashboard data structure
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct PrivacyDashboard {
        pub account: AccountId,
        pub active_proofs: u32,
        pub pending_proofs: u32,
        pub expired_proofs: u32,
        pub total_proofs: u32,
        pub privacy_level: u8, // 1-5 scale
        pub last_compliance_check: u64,
        pub next_verification_due: u64,
        pub audit_log_count: u32,
    }

    /// Compliance status summary for dashboard
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct ComplianceStatusSummary {
        pub account: AccountId,
        pub identity_verified: bool,
        pub financial_verified: bool,
        pub accredited_investor: bool,
        pub overall_status: ZkProofStatus,
        pub last_verification: u64,
        pub next_verification_due: u64,
    }

    /// Errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        NotAuthorized,
        ProofNotFound,
        InvalidProof,
        VerificationFailed,
        ExpiredProof,
        AlreadyVerified,
        InvalidInputs,
        PrivacyControlsViolation,
        StatsNotAvailable,
        InvalidPrivacyLevel,
        /// No active verification key is registered for this proof type.
        VerificationKeyNotFound,
        /// The registered verification key bytes are malformed.
        InvalidVerificationKey,
    }

    pub type Result<T> = core::result::Result<T, Error>;

    /// Events
    #[ink(event)]
    pub struct ZkProofSubmitted {
        #[ink(topic)]
        account: AccountId,
        proof_id: u64,
        proof_type: ZkProofType,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ZkProofVerified {
        #[ink(topic)]
        account: AccountId,
        proof_id: u64,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ZkProofRejected {
        #[ink(topic)]
        account: AccountId,
        proof_id: u64,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct PrivacyPreferencesUpdated {
        #[ink(topic)]
        account: AccountId,
        privacy_level: u8,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ComplianceVerified {
        #[ink(topic)]
        account: AccountId,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ZkComplianceUpdated {
        #[ink(topic)]
        account: AccountId,
        status: ZkProofStatus,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct VerificationKeySet {
        #[ink(topic)]
        proof_type: ZkProofType,
        version: u32,
        is_active: bool,
    }

    impl ZkCompliance {
        /// Constructor
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();

            Self {
                owner: caller,
                zk_proofs: Mapping::default(),
                proof_counter: Mapping::default(),
                privacy_preferences: Mapping::default(),
                zk_compliance_data: Mapping::default(),
                approved_verifiers: Mapping::default(),
                audit_logs: Mapping::default(),
                audit_log_count: Mapping::default(),
                verification_stats: VerificationStats {
                    total_verifications: 0,
                    successful_verifications: 0,
                    failed_verifications: 0,
                    last_updated: Self::env().block_timestamp(),
                },
                verification_keys: Mapping::default(),
            }
        }

        /// Submit a ZK proof for verification
        #[ink(message)]
        pub fn submit_zk_proof(
            &mut self,
            proof_type: ZkProofType,
            public_inputs: Vec<[u8; 32]>,
            proof_data: Vec<u8>,
            metadata: Vec<u8>,
        ) -> Result<u64> {
            let caller = self.env().caller();
            let proof_id = self.get_next_proof_id(caller);

            let now = self.env().block_timestamp();
            // Set expiration to 1 year from now
            let expires_at = now + (365 * 24 * 60 * 60 * 1000);

            let proof = ZkProofData {
                proof_type,
                status: ZkProofStatus::Pending,
                public_inputs,
                proof_data,
                created_at: now,
                expires_at,
                verifier: AccountId::from([0x0; 32]), // Not assigned yet
                metadata,
            };

            self.zk_proofs.insert((caller, proof_id), &proof);

            // Log audit event
            self.log_audit_event(caller, proof_type, ZkProofStatus::Pending, 0);

            self.env().emit_event(ZkProofSubmitted {
                account: caller,
                proof_id,
                proof_type,
                timestamp: now,
            });

            Ok(proof_id)
        }

        /// Verify a ZK proof (called by approved verifiers).
        ///
        /// Proofs are only marked `Verified` when the Groth16 verification
        /// succeeds. Unverifiable proofs are rejected — the contract never
        /// auto-approves a proof.
        #[ink(message)]
        pub fn verify_zk_proof(
            &mut self,
            account: AccountId,
            proof_id: u64,
            approve: bool,
        ) -> Result<()> {
            self.ensure_approved_verifier()?;

            let mut proof = self.zk_proofs.get((account, proof_id))
                .ok_or(Error::ProofNotFound)?;

            if proof.status != ZkProofStatus::Pending {
                return Err(Error::AlreadyVerified);
            }

            // Only run cryptographic verification when the verifier intends to
            // approve. Without the `zk` feature (or with a missing key) the
            // proof cannot be verified and is rejected.
            let verification_successful = if approve {
                self.perform_zk_verification(&proof)?
            } else {
                false
            };

            if approve && verification_successful {
                proof.status = ZkProofStatus::Verified;
            } else {
                proof.status = ZkProofStatus::Rejected;
            }
            proof.verifier = self.env().caller();

            self.zk_proofs.insert((account, proof_id), &proof);

            let action = if approve { 1 } else { 2 }; // 1=verify, 2=reject
            self.log_audit_event(account, proof.proof_type, proof.status, action);

            if approve && verification_successful {
                self.env().emit_event(ZkProofVerified {
                    account,
                    proof_id,
                    timestamp: self.env().block_timestamp(),
                });

                // Update verification stats
                self.verification_stats.successful_verifications += 1;
            } else {
                self.env().emit_event(ZkProofRejected {
                    account,
                    proof_id,
                    timestamp: self.env().block_timestamp(),
                });

                self.verification_stats.failed_verifications += 1;
            }

            self.verification_stats.total_verifications += 1;
            self.verification_stats.last_updated = self.env().block_timestamp();

            // Update compliance data if needed
            self.update_compliance_data(account)?;

            Ok(())
        }

        /// Stateless proof verification, callable by any contract or account.
        ///
        /// This is the entry point used by the oracle and other consumers for
        /// cross-contract verification of ZK-attested statements.
        #[ink(message)]
        pub fn verify_zk_proof_data(
            &self,
            proof_type: ZkProofType,
            public_inputs: Vec<[u8; 32]>,
            proof_data: Vec<u8>,
        ) -> core::result::Result<bool, ZkVerifyError> {
            #[cfg(feature = "zk")]
            {
                if !verification_keys::validate_public_inputs(&public_inputs) {
                    return Err(ZkVerifyError::InvalidPublicInputs);
                }
                if !verification_keys::validate_proof_payload(&proof_data) {
                    return Err(ZkVerifyError::InvalidProof);
                }

                let record = self
                    .verification_keys
                    .get(&(proof_type as u8))
                    .ok_or(ZkVerifyError::VerificationKeyNotFound)?;
                if !record.is_active {
                    return Err(ZkVerifyError::VerificationKeyNotFound);
                }

                let vk = verification_keys::deserialize_vk(&record.serialized_vk)
                    .map_err(|_| ZkVerifyError::InvalidVerificationKey)?;
                let inputs: Vec<Fr> = public_inputs
                    .iter()
                    .map(|bytes| Fr::from_le_bytes_mod_order(bytes.as_slice()))
                    .collect();
                let proof = verification_keys::deserialize_proof(&proof_data)
                    .map_err(|_| ZkVerifyError::InvalidProof)?;

                let pvk = PreparedVerifyingKey::from(vk);
                Groth16::<Bn254>::verify_with_processed_vk(&pvk, &inputs, &proof)
                    .map_err(|_| ZkVerifyError::VerificationFailed)
            }
            #[cfg(not(feature = "zk"))]
            {
                let _ = (proof_type, public_inputs, proof_data);
                Err(ZkVerifyError::ZkUnavailable)
            }
        }

        /// Register (or replace) the verification key for a proof type (owner only).
        #[ink(message)]
        pub fn set_verification_key(
            &mut self,
            proof_type: ZkProofType,
            serialized_vk: Vec<u8>,
            vk_hash: [u8; 32],
        ) -> Result<()> {
            self.ensure_owner()?;

            if serialized_vk.is_empty() || serialized_vk.len() > verification_keys::MAX_PROOF_LEN {
                return Err(Error::InvalidVerificationKey);
            }

            // Eagerly validate the key bytes when the zk backend is compiled in.
            #[cfg(feature = "zk")]
            {
                verification_keys::deserialize_vk(&serialized_vk)
                    .map_err(|_| Error::InvalidVerificationKey)?;
            }

            let existing = self.verification_keys.get(&(proof_type as u8));
            let version = existing.as_ref().map(|r| r.version + 1).unwrap_or(1);

            self.verification_keys.insert(
                &(proof_type as u8),
                &VerificationKeyRecord {
                    version,
                    serialized_vk,
                    vk_hash,
                    is_active: true,
                },
            );

            self.env().emit_event(VerificationKeySet {
                proof_type,
                version,
                is_active: true,
            });

            Ok(())
        }

        /// Rotate the verification key for a proof type, returning the new version (owner only).
        #[ink(message)]
        pub fn rotate_verification_key(
            &mut self,
            proof_type: ZkProofType,
            serialized_vk: Vec<u8>,
            vk_hash: [u8; 32],
        ) -> Result<u32> {
            // Rotation is `set` with the version always bumped.
            self.set_verification_key(proof_type, serialized_vk, vk_hash)?;
            let version = self
                .verification_keys
                .get(&(proof_type as u8))
                .map(|r| r.version)
                .ok_or(Error::VerificationKeyNotFound)?;
            Ok(version)
        }

        /// Deactivate the verification key for a proof type (owner only).
        ///
        /// Deactivated keys cause all future verification attempts for that
        /// proof type to fail with [`Error::VerificationKeyNotFound`].
        #[ink(message)]
        pub fn deactivate_verification_key(&mut self, proof_type: ZkProofType) -> Result<()> {
            self.ensure_owner()?;
            let mut record = self
                .verification_keys
                .get(&(proof_type as u8))
                .ok_or(Error::VerificationKeyNotFound)?;
            record.is_active = false;
            self.verification_keys.insert(&(proof_type as u8), &record);

            self.env().emit_event(VerificationKeySet {
                proof_type,
                version: record.version,
                is_active: false,
            });

            Ok(())
        }

        /// Get the verification key record for a proof type.
        #[ink(message)]
        pub fn get_verification_key(&self, proof_type: ZkProofType) -> Option<VerificationKeyRecord> {
            self.verification_keys.get(&(proof_type as u8))
        }

        /// Get the current verification key version for a proof type.
        #[ink(message)]
        pub fn get_verification_key_version(&self, proof_type: ZkProofType) -> Option<u32> {
            self.verification_keys
                .get(&(proof_type as u8))
                .map(|record| record.version)
        }

        /// Check if a ZK proof is valid without revealing sensitive data
        #[ink(message)]
        pub fn is_zk_proof_valid(&self, account: AccountId, proof_type: ZkProofType) -> bool {
            // Find the latest proof of this type for the account
            let current_id = self.proof_counter.get(account).unwrap_or(0);

            for proof_id in (1..=current_id).rev() {
                if let Some(proof) = self.zk_proofs.get((account, proof_id)) {
                    if proof.proof_type == proof_type {
                        let now = self.env().block_timestamp();

                        // Check if proof is verified and not expired
                        if proof.status == ZkProofStatus::Verified &&
                           proof.expires_at > now {
                            return true;
                        } else {
                            // If expired, return false
                            return false;
                        }
                    }
                }
            }

            false
        }

        /// Perform compliance check using ZK proofs (without exposing data)
        #[ink(message)]
        pub fn zk_compliance_check(&self, account: AccountId, required_proof_types: Vec<ZkProofType>) -> Result<()> {
            for proof_type in required_proof_types {
                if !self.is_zk_proof_valid(account, proof_type) {
                    return Err(Error::VerificationFailed);
                }
            }

            self.env().emit_event(ComplianceVerified {
                account,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Get user's ZK compliance data
        #[ink(message)]
        pub fn get_zk_compliance_data(&self, account: AccountId) -> Option<ZkComplianceData> {
            self.zk_compliance_data.get(account)
        }

        /// Get a specific ZK proof
        #[ink(message)]
        pub fn get_zk_proof(&self, account: AccountId, proof_id: u64) -> Option<ZkProofData> {
            self.zk_proofs.get((account, proof_id))
        }

        /// Update privacy preferences for an account
        #[ink(message)]
        pub fn update_privacy_preferences(
            &mut self,
            allow_analytics: bool,
            share_data_with_third_party: bool,
            privacy_level: u8,
            encrypted_metadata: Vec<u8>,
        ) -> Result<()> {
            let caller = self.env().caller();

            if privacy_level > 5 {
                return Err(Error::InvalidPrivacyLevel);
            }

            let preferences = PrivacyPreferences {
                allow_analytics,
                share_data_with_third_party,
                consent_timestamp: self.env().block_timestamp(),
                privacy_level,
                encrypted_metadata,
            };

            self.privacy_preferences.insert(caller, &preferences);

            self.env().emit_event(PrivacyPreferencesUpdated {
                account: caller,
                privacy_level,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Get privacy preferences for an account
        #[ink(message)]
        pub fn get_privacy_preferences(&self, account: AccountId) -> Option<PrivacyPreferences> {
            self.privacy_preferences.get(account)
        }

        /// Set privacy controls and consent preferences
        #[ink(message)]
        pub fn set_privacy_controls(
            &mut self,
            allow_analytics: bool,
            share_data_with_third_party: bool,
            privacy_level: u8, // 1-5 scale
            consent_to_process: bool,
            consent_to_store: bool,
            encrypted_metadata: Vec<u8>
        ) -> Result<()> {
            let caller = self.env().caller();

            if privacy_level > 5 {
                return Err(Error::InvalidPrivacyLevel);
            }

            // Check if user has given explicit consent to process their data
            if !consent_to_process {
                return Err(Error::PrivacyControlsViolation);
            }

            let preferences = PrivacyPreferences {
                allow_analytics,
                share_data_with_third_party,
                consent_timestamp: self.env().block_timestamp(),
                privacy_level,
                encrypted_metadata,
            };

            self.privacy_preferences.insert(caller, &preferences);

            self.env().emit_event(PrivacyPreferencesUpdated {
                account: caller,
                privacy_level,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Grant consent for specific ZK proof types
        #[ink(message)]
        pub fn grant_proof_consent(&mut self, proof_types: Vec<ZkProofType>) -> Result<()> {
            let caller = self.env().caller();

            // In a real implementation, this would store consent for specific proof types
            // For now, we'll just verify that the user has appropriate privacy settings
            let prefs = self.privacy_preferences.get(caller).unwrap_or(PrivacyPreferences {
                allow_analytics: false,
                share_data_with_third_party: false,
                consent_timestamp: 0,
                privacy_level: 3,
                encrypted_metadata: vec![],
            });

            // Check if user has given consent to process data
            if prefs.privacy_level < 2 {
                return Err(Error::PrivacyControlsViolation);
            }

            // Update consent timestamp
            let mut updated_prefs = prefs;
            updated_prefs.consent_timestamp = self.env().block_timestamp();
            self.privacy_preferences.insert(caller, &updated_prefs);

            Ok(())
        }

        /// Revoke consent for specific ZK proof types
        #[ink(message)]
        pub fn revoke_proof_consent(&mut self, proof_types: Vec<ZkProofType>) -> Result<()> {
            let caller = self.env().caller();

            // In a real implementation, this would revoke consent for specific proof types
            // For now, we'll just update the consent timestamp
            let prefs = self.privacy_preferences.get(caller).unwrap_or(PrivacyPreferences {
                allow_analytics: false,
                share_data_with_third_party: false,
                consent_timestamp: 0,
                privacy_level: 3,
                encrypted_metadata: vec![],
            });

            // Update consent timestamp
            let mut updated_prefs = prefs;
            updated_prefs.consent_timestamp = self.env().block_timestamp();
            self.privacy_preferences.insert(caller, &updated_prefs);

            Ok(())
        }

        /// Get verification statistics (aggregated, privacy-preserving)
        #[ink(message)]
        pub fn get_verification_stats(&self) -> Result<&VerificationStats> {
            Ok(&self.verification_stats)
        }

        #[ink(message)]
        pub fn get_state_root(&self) -> crate::state_root::StateRoot {
            crate::state_root::compute_root(&vec![self.owner.encode(), self.verification_stats.total_verifications.encode()])
        }

        /// Perform compliance verification without exposing user data
        #[ink(message)]
        pub fn anonymous_compliance_check(
            &self,
            account: AccountId,
            required_proof_types: Vec<ZkProofType>
        ) -> bool {
            // This function verifies that the account has the required ZK proofs
            // without revealing any sensitive information about the proofs themselves
            for proof_type in required_proof_types {
                if !self.is_zk_proof_valid(account, proof_type) {
                    return false;
                }
            }
            true
        }

        /// Verify compliance using only public parameters
        #[ink(message)]
        pub fn verify_compliance_public_params(
            &mut self,
            account: AccountId,
            proof_type: ZkProofType,
            public_params: Vec<[u8; 32]>
        ) -> Result<()> {
            // Find the latest proof of this type for the account
            let current_id = self.proof_counter.get(account).unwrap_or(0);

            for proof_id in (1..=current_id).rev() {
                if let Some(mut proof) = self.zk_proofs.get((account, proof_id)) {
                    if proof.proof_type == proof_type {
                        // Compare public parameters without exposing private data
                        if proof.public_inputs == public_params {
                            // Check if the proof is still valid
                            let now = self.env().block_timestamp();
                            if proof.status == ZkProofStatus::Verified && proof.expires_at > now {
                                return Ok(());
                            } else {
                                return Err(Error::ExpiredProof);
                            }
                        } else {
                            return Err(Error::InvalidProof);
                        }
                    }
                }
            }

            Err(Error::ProofNotFound)
        }

        /// Create a compliance certificate without revealing underlying data
        #[ink(message)]
        pub fn create_compliance_certificate(
            &mut self,
            account: AccountId,
            certificate_type: u8, // 0=KYC, 1=AML, 2=Accredited Investor, etc.
            expiration_days: u32
        ) -> Result<[u8; 32]> {
            // This would typically create a ZK proof that the user meets certain criteria
            // without revealing the underlying data

            // For this implementation, we'll create a pseudo-certificate
            // that attests to compliance without revealing details
            let proof_type = match certificate_type {
                0 => ZkProofType::IdentityVerification,
                1 => ZkProofType::ComplianceCheck,
                2 => ZkProofType::AccreditedInvestor,
                _ => ZkProofType::ComplianceCheck,
            };

            // Check if user already has the required proof
            if !self.is_zk_proof_valid(account, proof_type) {
                return Err(Error::VerificationFailed);
            }

            // Create a certificate identifier (in a real system this would be derived differently)
            let now = self.env().block_timestamp();
            let cert_id = [
                ((now >> 0) & 0xFF) as u8,
                ((now >> 8) & 0xFF) as u8,
                ((now >> 16) & 0xFF) as u8,
                ((now >> 24) & 0xFF) as u8,
                // ... continue for all 32 bytes
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
            ];

            Ok(cert_id)
        }

        /// Add an approved verifier
        #[ink(message)]
        pub fn add_approved_verifier(&mut self, verifier: AccountId) -> Result<()> {
            self.ensure_owner()?;
            self.approved_verifiers.insert(verifier, &true);
            Ok(())
        }

        /// Remove an approved verifier
        #[ink(message)]
        pub fn remove_approved_verifier(&mut self, verifier: AccountId) -> Result<()> {
            self.ensure_owner()?;
            self.approved_verifiers.insert(verifier, &false);
            Ok(())
        }

        /// Get audit logs for an account (without exposing sensitive data)
        #[ink(message)]
        pub fn get_audit_logs(&self, account: AccountId, limit: u64) -> Vec<AuditLog> {
            let count = self.audit_log_count.get(account).unwrap_or(0);
            let start = count.saturating_sub(limit);
            let mut logs = Vec::new();

            for i in start..count {
                if let Some(log) = self.audit_logs.get((account, i)) {
                    logs.push(log);
                }
            }

            logs
        }

        /// Create privacy-preserving audit entry
        #[ink(message)]
        pub fn create_privacy_preserving_audit(
            &mut self,
            account: AccountId,
            action_type: u8, // 0=submit, 1=verify, 2=access, 3=modify, 4=delete
            proof_type: ZkProofType,
            metadata_hash: [u8; 32] // Hash of metadata instead of actual data
        ) -> Result<()> {
            let caller = self.env().caller();

            // Only allow account owner or approved verifiers to create audit entries
            if caller != account && !self.approved_verifiers.get(caller).unwrap_or(false) {
                return Err(Error::NotAuthorized);
            }

            // Create an audit log that doesn't expose sensitive information
            let log = AuditLog {
                account,
                proof_type,
                status: ZkProofStatus::NotSubmitted, // Placeholder status
                timestamp: self.env().block_timestamp(),
                action: action_type,
            };

            let count = self.audit_log_count.get(account).unwrap_or(0);
            self.audit_logs.insert((account, count), &log);
            self.audit_log_count.insert(account, &(count + 1));

            Ok(())
        }

        /// Get anonymized compliance statistics
        #[ink(message)]
        pub fn get_anonymized_compliance_stats(&self) -> Result<Vec<u8>> {
            // Return aggregated statistics without identifying individuals
            let stats = &self.verification_stats;

            // Serialize the stats in a privacy-preserving way
            let mut result = Vec::new();
            result.extend_from_slice(&stats.total_verifications.to_le_bytes());
            result.extend_from_slice(&stats.successful_verifications.to_le_bytes());
            result.extend_from_slice(&stats.failed_verifications.to_le_bytes());

            Ok(result)
        }

        /// Generate compliance report without exposing individual data
        #[ink(message)]
        pub fn generate_privacy_preserving_report(
            &self,
            report_type: u8 // 0=daily, 1=weekly, 2=monthly, 3=yearly
        ) -> Result<Vec<u8>> {
            // Generate a report that aggregates data without exposing individuals
            let mut report_data = Vec::new();

            // Add general statistics
            report_data.extend_from_slice(&self.verification_stats.total_verifications.to_le_bytes());
            report_data.extend_from_slice(&self.verification_stats.successful_verifications.to_le_bytes());
            report_data.extend_from_slice(&self.verification_stats.failed_verifications.to_le_bytes());

            // Add report type indicator
            report_data.push(report_type);

            // Add timestamp
            report_data.extend_from_slice(&self.verification_stats.last_updated.to_le_bytes());

            Ok(report_data)
        }

        /// Get all ZK proofs for an account
        #[ink(message)]
        pub fn get_account_proofs(&self, account: AccountId) -> Vec<(u64, ZkProofData)> {
            let mut proofs = Vec::new();
            let count = self.proof_counter.get(account).unwrap_or(0);

            for proof_id in 1..=count {
                if let Some(proof) = self.zk_proofs.get((account, proof_id)) {
                    proofs.push((proof_id, proof));
                }
            }

            proofs
        }

        /// Get user's privacy dashboard summary
        #[ink(message)]
        pub fn get_privacy_dashboard(&self, account: AccountId) -> PrivacyDashboard {
            let proofs = self.get_account_proofs(account);
            let preferences = self.privacy_preferences.get(account);
            let compliance_data = self.zk_compliance_data.get(account);
            let audit_logs = self.get_audit_logs(account, 10); // Last 10 logs

            let active_proofs = proofs.iter()
                .filter(|(_, proof)| {
                    let now = self.env().block_timestamp();
                    proof.status == ZkProofStatus::Verified && proof.expires_at > now
                })
                .count() as u32;

            let expired_proofs = proofs.iter()
                .filter(|(_, proof)| {
                    let now = self.env().block_timestamp();
                    proof.expires_at <= now
                })
                .count() as u32;

            let pending_proofs = proofs.iter()
                .filter(|(_, proof)| proof.status == ZkProofStatus::Pending)
                .count() as u32;

            PrivacyDashboard {
                account,
                active_proofs,
                pending_proofs,
                expired_proofs,
                total_proofs: proofs.len() as u32,
                privacy_level: preferences.as_ref().map(|p| p.privacy_level).unwrap_or(3),
                last_compliance_check: compliance_data.as_ref().map(|c| c.last_verification).unwrap_or(0),
                next_verification_due: compliance_data.as_ref().map(|c| c.next_required_verification).unwrap_or(0),
                audit_log_count: audit_logs.len() as u32,
            }
        }

        /// Update user's privacy settings via dashboard
        #[ink(message)]
        pub fn update_privacy_settings_via_dashboard(
            &mut self,
            new_privacy_level: u8,
            allow_analytics: bool,
            share_data_with_third_party: bool,
            encrypted_metadata: Vec<u8>
        ) -> Result<()> {
            if new_privacy_level > 5 {
                return Err(Error::InvalidPrivacyLevel);
            }

            let caller = self.env().caller();

            // Get existing preferences or create new ones
            let existing_prefs = self.privacy_preferences.get(caller).unwrap_or(PrivacyPreferences {
                allow_analytics: false,
                share_data_with_third_party: false,
                consent_timestamp: self.env().block_timestamp(),
                privacy_level: 3,
                encrypted_metadata: vec![],
            });

            // Update preferences
            let updated_prefs = PrivacyPreferences {
                allow_analytics,
                share_data_with_third_party,
                consent_timestamp: existing_prefs.consent_timestamp, // Keep original consent time
                privacy_level: new_privacy_level,
                encrypted_metadata,
            };

            self.privacy_preferences.insert(caller, &updated_prefs);

            self.env().emit_event(PrivacyPreferencesUpdated {
                account: caller,
                privacy_level: new_privacy_level,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Get compliance status summary for dashboard
        #[ink(message)]
        pub fn get_compliance_status_summary(&self, account: AccountId) -> ComplianceStatusSummary {
            let compliance_data = self.zk_compliance_data.get(account);
            let proofs = self.get_account_proofs(account);

            let mut identity_verified = false;
            let mut financial_verified = false;
            let mut accredited_investor = false;

            for (_, proof) in proofs {
                let now = self.env().block_timestamp();
                if proof.status == ZkProofStatus::Verified && proof.expires_at > now {
                    match proof.proof_type {
                        ZkProofType::IdentityVerification => identity_verified = true,
                        ZkProofType::FinancialStanding | ZkProofType::IncomeVerification => financial_verified = true,
                        ZkProofType::AccreditedInvestor => accredited_investor = true,
                        _ => (),
                    }
                }
            }

            ComplianceStatusSummary {
                account,
                identity_verified,
                financial_verified,
                accredited_investor,
                overall_status: compliance_data.as_ref().map(|d| d.verification_status).unwrap_or(ZkProofStatus::NotSubmitted),
                last_verification: compliance_data.as_ref().map(|d| d.last_verification).unwrap_or(0),
                next_verification_due: compliance_data.as_ref().map(|d| d.next_required_verification).unwrap_or(0),
            }
        }

        /// Verify identity without revealing personal information.
        ///
        /// The single public input must equal BLAKE2b-256 of the SCALE-encoded
        /// statement `(age_requirement, country_code)`; the proof is verified
        /// against the registered key for [`ZkProofType::AgeVerification`].
        #[ink(message)]
        pub fn verify_identity_zk(&mut self, age_requirement: u8, country_code: u16, proof_data: Vec<u8>) -> Result<()> {
            let caller = self.env().caller();

            let statement = (age_requirement, country_code).encode();
            let public_input = self.bind_public_input(&statement);

            self.verify_and_store_proof(
                caller,
                ZkProofType::AgeVerification,
                vec![public_input],
                proof_data,
                statement,
            )?;

            Ok(())
        }

        /// Verify financial standing without revealing exact amounts.
        ///
        /// The single public input must equal BLAKE2b-256 of the SCALE-encoded
        /// statement `min_income_usd`.
        #[ink(message)]
        pub fn verify_financial_standing_zk(&mut self, min_income_usd: u64, proof_data: Vec<u8>) -> Result<()> {
            let caller = self.env().caller();

            let statement = min_income_usd.encode();
            let public_input = self.bind_public_input(&statement);

            self.verify_and_store_proof(
                caller,
                ZkProofType::IncomeVerification,
                vec![public_input],
                proof_data,
                statement,
            )?;

            Ok(())
        }

        /// Verify accredited investor status without revealing financial details.
        ///
        /// The single public input must equal BLAKE2b-256 of the constant
        /// statement marker (`1u8`).
        #[ink(message)]
        pub fn verify_accredited_investor_zk(&mut self, proof_data: Vec<u8>) -> Result<()> {
            let caller = self.env().caller();

            let statement = 1u8.encode();
            let public_input = self.bind_public_input(&statement);

            self.verify_and_store_proof(
                caller,
                ZkProofType::AccreditedInvestor,
                vec![public_input],
                proof_data,
                statement,
            )?;

            Ok(())
        }

        /// Submit confidential transaction data using ZK proofs.
        ///
        /// The single public input must equal BLAKE2b-256 of the SCALE-encoded
        /// statement `(transaction_type, amount, asset_type)`.
        #[ink(message)]
        pub fn submit_confidential_transaction(
            &mut self,
            transaction_type: u8, // 0=buy, 1=sell, 2=transfer, 3=other
            amount: u128,         // Amount in smallest unit
            asset_type: u8,       // 0=real_estate, 1=token, 2=other
            proof_data: Vec<u8>,  // ZK proof that user is compliant
        ) -> Result<()> {
            let caller = self.env().caller();

            let statement = (transaction_type, amount, asset_type).encode();
            let public_input = self.bind_public_input(&statement);

            self.verify_and_store_proof(
                caller,
                ZkProofType::ComplianceCheck,
                vec![public_input],
                proof_data,
                statement,
            )?;

            Ok(())
        }

        /// Create confidential property ownership proof.
        ///
        /// The single public input must equal BLAKE2b-256 of the property id.
        #[ink(message)]
        pub fn create_property_ownership_proof(
            &mut self,
            property_id: [u8; 32],
            proof_data: Vec<u8>
        ) -> Result<()> {
            let caller = self.env().caller();

            let statement = property_id.to_vec();
            let public_input = self.bind_public_input(&statement);

            self.verify_and_store_proof(
                caller,
                ZkProofType::PropertyOwnership,
                vec![public_input],
                proof_data,
                statement,
            )?;

            Ok(())
        }

        /// Verify property ownership using ZK-SNARK without revealing ownership details.
        ///
        /// The single public input must equal BLAKE2b-256 of the SCALE-encoded
        /// statement `(property_id, owner_public_key)`.
        #[ink(message)]
        pub fn verify_property_ownership_zk(
            &mut self,
            property_id: [u8; 32],
            owner_public_key: [u8; 32], // Public key associated with the property
            proof_data: Vec<u8>          // ZK proof of ownership
        ) -> Result<()> {
            let caller = self.env().caller();

            let statement = (property_id, owner_public_key).encode();
            let public_input = self.bind_public_input(&statement);

            self.verify_and_store_proof(
                caller,
                ZkProofType::PropertyOwnership,
                vec![public_input],
                proof_data,
                statement,
            )?;

            Ok(())
        }

        /// Verify address ownership using ZK proof.
        ///
        /// The single public input must equal BLAKE2b-256 of the address hash.
        #[ink(message)]
        pub fn verify_address_ownership_zk(
            &mut self,
            address_hash: [u8; 32],
            proof_data: Vec<u8>
        ) -> Result<()> {
            let caller = self.env().caller();

            let statement = address_hash.to_vec();
            let public_input = self.bind_public_input(&statement);

            self.verify_and_store_proof(
                caller,
                ZkProofType::AddressOwnership,
                vec![public_input],
                proof_data,
                statement,
            )?;

            Ok(())
        }

        // --- Internal helper functions ---
        /// Validate proof data using the configured ZK backend.
        ///
        /// When the `zk` feature is disabled the function returns `Ok(false)`
        /// — proofs are *rejected*, never auto-approved.
        fn perform_zk_verification(&self, proof: &ZkProofData) -> Result<bool> {
            #[cfg(feature = "zk")]
            {
                // Real Groth16 verification against the registered key.
                let is_valid = self.deserialize_and_verify_zk_proof(proof)?;
                Ok(is_valid)
            }
            #[cfg(not(feature = "zk"))]
            {
                // No ZK backend compiled in: an unverifiable proof must not be
                // approved. Compile with `--features zk` and register a
                // verification key to accept proofs.
                let _ = proof;
                Ok(false)
            }
        }

        /// Decode and verify a submitted proof with arkworks when the `zk`
        /// feature is enabled.
        #[cfg(feature = "zk")]
        fn deserialize_and_verify_zk_proof(&self, proof: &ZkProofData) -> Result<bool> {
            if !verification_keys::validate_public_inputs(&proof.public_inputs) {
                return Err(Error::InvalidInputs);
            }
            if !verification_keys::validate_proof_payload(&proof.proof_data) {
                return Err(Error::InvalidProof);
            }

            let record = self
                .verification_keys
                .get(&(proof.proof_type as u8))
                .ok_or(Error::VerificationKeyNotFound)?;
            if !record.is_active {
                return Err(Error::VerificationKeyNotFound);
            }

            let vk = verification_keys::deserialize_vk(&record.serialized_vk)
                .map_err(|_| Error::InvalidVerificationKey)?;
            let public_inputs: Vec<Fr> = proof
                .public_inputs
                .iter()
                .map(|bytes| Fr::from_le_bytes_mod_order(bytes.as_slice()))
                .collect();
            let proof_struct = verification_keys::deserialize_proof(&proof.proof_data)
                .map_err(|_| Error::InvalidProof)?;

            let pvk = PreparedVerifyingKey::from(vk);
            Groth16::<Bn254>::verify_with_processed_vk(&pvk, &public_inputs, &proof_struct)
                .map_err(|_| Error::VerificationFailed)
        }

        /// Hash a statement into the single 32-byte public input expected by
        /// the off-chain prover.
        ///
        /// The public input is `BLAKE2b-256(statement) mod r`, where `r` is the
        /// Bn254 scalar field order — matching the prover's
        /// `Fr::from_le_bytes_mod_order(BLAKE2b-256(statement))` exactly so the
        /// canonicality gate and proof verification agree byte-for-byte (a raw
        /// hash exceeds `r` with probability ≈ 81%).
        fn bind_public_input(&self, statement: &[u8]) -> [u8; 32] {
            use ink::env::hash::{Blake2x256, HashOutput};

            let mut output = <Blake2x256 as HashOutput>::Type::default();
            self.env().hash_bytes::<Blake2x256>(statement, &mut output);
            verification_keys::reduce_mod_bn254(&output)
        }

        /// Submit a proof and verify it with the real backend before marking it
        /// `Verified`. Unverifiable proofs are stored as `Rejected`.
        fn verify_and_store_proof(
            &mut self,
            account: AccountId,
            proof_type: ZkProofType,
            public_inputs: Vec<[u8; 32]>,
            proof_data: Vec<u8>,
            metadata: Vec<u8>,
        ) -> Result<u64> {
            let proof_id = self.submit_zk_proof(proof_type, public_inputs, proof_data, metadata)?;

            let mut proof = self
                .zk_proofs
                .get((account, proof_id))
                .ok_or(Error::ProofNotFound)?;

            let valid = self.perform_zk_verification(&proof)?;
            if !valid {
                // Never leave an unverifiable proof pending: mark it rejected.
                proof.status = ZkProofStatus::Rejected;
                self.zk_proofs.insert((account, proof_id), &proof);
                self.log_audit_event(account, proof_type, ZkProofStatus::Rejected, 2);
                self.verification_stats.failed_verifications += 1;
                self.verification_stats.total_verifications += 1;
                self.verification_stats.last_updated = self.env().block_timestamp();
                return Err(Error::VerificationFailed);
            }

            let now = self.env().block_timestamp();
            proof.status = ZkProofStatus::Verified;
            proof.created_at = now;
            proof.expires_at = now + (365 * 24 * 60 * 60 * 1000);
            self.zk_proofs.insert((account, proof_id), &proof);

            self.log_audit_event(account, proof_type, ZkProofStatus::Verified, 1);
            self.verification_stats.successful_verifications += 1;
            self.verification_stats.total_verifications += 1;
            self.verification_stats.last_updated = now;

            self.env().emit_event(ZkProofVerified {
                account,
                proof_id,
                timestamp: now,
            });

            self.update_compliance_data(account)?;

            Ok(proof_id)
        }

        /// Increment and return the next proof identifier for an account.
        fn get_next_proof_id(&mut self, account: AccountId) -> u64 {
            let current_id = self.proof_counter.get(account).unwrap_or(0);
            let next_id = current_id + 1;
            self.proof_counter.insert(account, &next_id);
            next_id
        }

        /// Require the contract owner before owner-only administration.
        fn ensure_owner(&self) -> Result<()> {
            if self.env().caller() != self.owner {
                return Err(Error::NotAuthorized);
            }
            Ok(())
        }

        /// Require the caller to be an approved verifier before proof review.
        fn ensure_approved_verifier(&self) -> Result<()> {
            let caller = self.env().caller();
            if !self.approved_verifiers.get(caller).unwrap_or(false) {
                return Err(Error::NotAuthorized);
            }
            Ok(())
        }

        /// Append a privacy-preserving audit entry for a proof action.
        fn log_audit_event(&mut self, account: AccountId, proof_type: ZkProofType, status: ZkProofStatus, action: u8) {
            let count = self.audit_log_count.get(account).unwrap_or(0);
            let log = AuditLog {
                account,
                proof_type,
                status,
                timestamp: self.env().block_timestamp(),
                action,
            };

            self.audit_logs.insert((account, count), &log);
            self.audit_log_count.insert(account, &(count + 1));
        }

        /// Refresh an account's compliance summary from its latest proof state.
        fn update_compliance_data(&mut self, account: AccountId) -> Result<()> {
            let mut compliance_data = self.zk_compliance_data.get(account).unwrap_or(ZkComplianceData {
                zk_proof_ids: Vec::new(),
                verification_status: ZkProofStatus::NotSubmitted,
                last_verification: 0,
                next_required_verification: 0,
                compliance_jurisdiction: 0,
                privacy_controls_enabled: true,
            });

            // Update with latest proof ID
            if let Some(current_id) = self.proof_counter.get(account) {
                if current_id > 0 {
                    compliance_data.zk_proof_ids.push(current_id);
                }
            }

            compliance_data.last_verification = self.env().block_timestamp();
            // Set next verification to 1 year from now
            compliance_data.next_required_verification = self.env().block_timestamp() + (365 * 24 * 60 * 60 * 1000);

            // Update verification status based on latest proof
            if let Some(latest_proof_id) = self.proof_counter.get(account) {
                if latest_proof_id > 0 {
                    if let Some(latest_proof) = self.zk_proofs.get((account, latest_proof_id)) {
                        compliance_data.verification_status = latest_proof.status;
                    }
                }
            }

            self.zk_compliance_data.insert(account, &compliance_data);

            self.env().emit_event(ZkComplianceUpdated {
                account,
                status: compliance_data.verification_status,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn new_works() {
            let contract = ZkCompliance::new();
            let caller = AccountId::from([0x01; 32]);
            assert_eq!(contract.owner, caller);
        }

        #[ink::test]
        fn submit_and_verify_zk_proof_rejects_unverifiable() {
            let mut contract = ZkCompliance::new();
            let user = AccountId::from([0x02; 32]);
            let verifier = AccountId::from([0x03; 32]);

            // Add verifier
            contract.add_approved_verifier(verifier).unwrap();

            // Submit ZK proof
            let public_inputs = vec![[1u8; 32]];
            let proof_data = vec![2u8, 3u8, 4u8];
            let metadata = vec![5u8, 6u8];

            let proof_id = contract.submit_zk_proof(
                ZkProofType::IdentityVerification,
                public_inputs.clone(),
                proof_data.clone(),
                metadata.clone(),
            ).unwrap();

            assert_eq!(proof_id, 1);

            // Verify the proof. Without a registered verification key (and with
            // no ZK backend in the default build) the proof must NOT be
            // auto-approved — it is either rejected or the call fails loudly.
            match contract.verify_zk_proof(user, proof_id, true) {
                Ok(()) => {
                    // Default build (no `zk` feature): the proof is rejected.
                    assert!(
                        !contract.is_zk_proof_valid(user, ZkProofType::IdentityVerification),
                        "unverifiable proof must not be marked valid"
                    );
                }
                Err(_) => {
                    // `zk` feature build without a registered key: loud failure.
                }
            }
        }

        #[ink::test]
        fn verification_key_management_works() {
            let mut contract = ZkCompliance::new();
            let owner = AccountId::from([0x01; 32]);
            let stranger = AccountId::from([0x09; 32]);

            // Non-owner cannot set a key.
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(stranger);
            assert_eq!(
                contract.set_verification_key(
                    ZkProofType::IdentityVerification,
                    vec![7u8; 64],
                    [0u8; 32],
                ),
                Err(Error::NotAuthorized)
            );

            // Owner sets a key.
            ink::env::test::set_caller::<ink::env::DefaultEnvironment>(owner);
            contract
                .set_verification_key(
                    ZkProofType::IdentityVerification,
                    vec![7u8; 64],
                    [1u8; 32],
                )
                .unwrap();

            let record = contract
                .get_verification_key(ZkProofType::IdentityVerification)
                .expect("key should be registered");
            assert_eq!(record.version, 1);
            assert!(record.is_active);
            assert_eq!(record.vk_hash, [1u8; 32]);

            // Rotation bumps the version.
            let version = contract
                .rotate_verification_key(
                    ZkProofType::IdentityVerification,
                    vec![8u8; 64],
                    [2u8; 32],
                )
                .unwrap();
            assert_eq!(version, 2);
            assert_eq!(
                contract.get_verification_key_version(ZkProofType::IdentityVerification),
                Some(2)
            );

            // Deactivation makes the key unusable.
            contract
                .deactivate_verification_key(ZkProofType::IdentityVerification)
                .unwrap();
            let record = contract
                .get_verification_key(ZkProofType::IdentityVerification)
                .expect("record should still exist");
            assert!(!record.is_active);
        }

        #[ink::test]
        fn privacy_preferences_works() {
            let mut contract = ZkCompliance::new();
            let user = AccountId::from([0x04; 32]);

            // Update privacy preferences
            assert!(contract.update_privacy_preferences(true, false, 4, vec![1, 2, 3]).is_ok());

            // Get privacy preferences
            let prefs = contract.get_privacy_preferences(user)
                .expect("Privacy preferences should exist after update");
            assert_eq!(prefs.allow_analytics, true);
            assert_eq!(prefs.share_data_with_third_party, false);
            assert_eq!(prefs.privacy_level, 4);
        }

        /// With the `zk` feature enabled, a malformed verification key must be
        /// rejected at registration time and unregistered proof types must fail
        /// verification loudly (never auto-approve).
        #[cfg(feature = "zk")]
        #[ink::test]
        fn malformed_keys_and_proofs_are_rejected_with_zk() {
            let mut contract = ZkCompliance::new();

            // Garbage verification key bytes are rejected eagerly.
            assert_eq!(
                contract.set_verification_key(
                    ZkProofType::ComplianceCheck,
                    vec![0xabu8; 32],
                    [0u8; 32],
                ),
                Err(Error::InvalidVerificationKey)
            );

            // No key registered => verification fails loudly instead of
            // auto-approving.
            let result = contract.verify_zk_proof_data(
                ZkProofType::ComplianceCheck,
                vec![[0u8; 32]],
                vec![0u8; 10],
            );
            assert_eq!(result, Err(ZkVerifyError::VerificationKeyNotFound));

            // Wrapper entry points also fail loudly without a registered key.
            let wrapper_result = contract.verify_identity_zk(25, 840, vec![0u8; 10]);
            assert_eq!(wrapper_result, Err(Error::VerificationKeyNotFound));
        }
    }
}
