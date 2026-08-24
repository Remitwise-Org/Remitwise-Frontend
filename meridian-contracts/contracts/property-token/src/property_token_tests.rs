
        use super::*;
        use ink::env::{test, DefaultEnvironment};

        fn setup_contract() -> PropertyToken {
            PropertyToken::new()
        }

        #[ink::test]
        fn test_constructor_works() {
            let contract = setup_contract();
            assert_eq!(contract.total_supply(), 0);
            assert_eq!(contract.current_token_id(), 0);
        }

        #[ink::test]
        fn test_register_property_with_token() {
            let mut contract = setup_contract();

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let result = contract.register_property_with_token(metadata.clone());
            assert!(result.is_ok());

            let token_id = result.expect("Token registration should succeed in test");
            assert_eq!(token_id, 1);
            assert_eq!(contract.total_supply(), 1);
        }

        #[ink::test]
        fn test_balance_of() {
            let mut contract = setup_contract();

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let _token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");
            let _caller = AccountId::from([1u8; 32]);

            // Set up mock caller for the test
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            assert_eq!(contract.balance_of(accounts.alice), 1);
        }

        #[ink::test]
        fn test_attach_legal_document() {
            let mut contract = setup_contract();

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");

            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let doc_hash = Hash::from([1u8; 32]);
            let doc_type = String::from("Deed");

            let result = contract.attach_legal_document(token_id, doc_hash, doc_type);
            assert!(result.is_ok());
        }

        #[ink::test]
        fn test_verify_compliance() {
            let mut contract = setup_contract();

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");

            let _accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(contract.admin());

            let result = contract.verify_compliance(token_id, true);
            assert!(result.is_ok());

            let compliance_info = contract
                .compliance_flags
                .get(&token_id)
                .expect("Compliance info should exist after verification");
            assert!(compliance_info.verified);
        }

        // ============================================================================
        // EDGE CASE TESTS
        // ============================================================================

        #[ink::test]
        fn test_transfer_from_nonexistent_token() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            let result = contract.transfer_from(accounts.alice, accounts.bob, 999);
            assert_eq!(result, Err(Error::TokenNotFound));
        }

        #[ink::test]
        fn test_transfer_from_unauthorized_caller() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");

            // Bob tries to transfer Alice's token without approval
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let result = contract.transfer_from(accounts.alice, accounts.bob, token_id);
            assert_eq!(result, Err(Error::Unauthorized));
        }

        #[ink::test]
        fn test_approve_nonexistent_token() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            let result = contract.approve(accounts.bob, 999);
            assert_eq!(result, Err(Error::TokenNotFound));
        }

        #[ink::test]
        fn test_approve_unauthorized_caller() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");

            // Bob tries to approve without being owner or operator
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let result = contract.approve(accounts.charlie, token_id);
            assert_eq!(result, Err(Error::Unauthorized));
        }

        #[ink::test]
        fn test_owner_of_nonexistent_token() {
            let contract = setup_contract();

            assert_eq!(contract.owner_of(0), None);
            assert_eq!(contract.owner_of(1), None);
            assert_eq!(contract.owner_of(u64::MAX), None);
        }

        #[ink::test]
        fn test_balance_of_nonexistent_account() {
            let contract = setup_contract();
            let nonexistent = AccountId::from([0xFF; 32]);

            assert_eq!(contract.balance_of(nonexistent), 0);
        }

        #[ink::test]
        fn test_attach_document_to_nonexistent_token() {
            let mut contract = setup_contract();
            let doc_hash = Hash::from([1u8; 32]);

            let result = contract.attach_legal_document(999, doc_hash, "Deed".to_string());
            assert_eq!(result, Err(Error::TokenNotFound));
        }

        #[ink::test]
        fn test_attach_document_unauthorized() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");

            // Bob tries to attach document
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let doc_hash = Hash::from([1u8; 32]);
            let result = contract.attach_legal_document(token_id, doc_hash, "Deed".to_string());
            assert_eq!(result, Err(Error::Unauthorized));
        }

        #[ink::test]
        fn test_verify_compliance_nonexistent_token() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let result = contract.verify_compliance(999, true);
            assert_eq!(result, Err(Error::TokenNotFound));
        }

        #[ink::test]
        fn test_initiate_bridge_invalid_chain() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");

            // Try to bridge to unsupported chain
            let result = contract.initiate_bridge_multisig(
                token_id,
                999, // Invalid chain ID
                accounts.bob,
                2,    // required_signatures
                None, // timeout_blocks
            );

            assert_eq!(result, Err(Error::InvalidChain));
        }

        #[ink::test]
        fn test_initiate_bridge_nonexistent_token() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            let result = contract.initiate_bridge_multisig(
                999,          // nonexistent token_id
                2,            // destination_chain
                accounts.bob, // recipient
                2,            // required_signatures
                None,         // timeout_blocks
            );

            assert_eq!(result, Err(Error::TokenNotFound));
        }

        #[ink::test]
        fn test_sign_bridge_request_nonexistent() {
            let mut contract = setup_contract();
            let _accounts = test::default_accounts::<DefaultEnvironment>();

            let result = contract.sign_bridge_request(999, true);
            assert_eq!(result, Err(Error::InvalidRequest));
        }

        #[ink::test]
        fn test_register_multiple_properties_increments_ids() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            for i in 1..=10 {
                let metadata = PropertyMetadata {
                    location: format!("Property {}", i),
                    size: 1000 + i,
                    legal_description: format!("Description {}", i),
                    valuation: 100_000 + (i as u128 * 1000),
                    documents_url: format!("ipfs://prop{}", i),
                };

                let token_id = contract
                    .register_property_with_token(metadata)
                    .expect("Token registration should succeed in test");
                assert_eq!(token_id, i);
                assert_eq!(contract.total_supply(), i);
            }
        }

        #[ink::test]
        fn test_transfer_preserves_total_supply() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let metadata = PropertyMetadata {
                location: String::from("123 Main St"),
                size: 1000,
                legal_description: String::from("Sample property"),
                valuation: 500000,
                documents_url: String::from("ipfs://sample-docs"),
            };

            let token_id = contract
                .register_property_with_token(metadata)
                .expect("Token registration should succeed in test");

            let initial_supply = contract.total_supply();

            contract
                .transfer_from(accounts.alice, accounts.bob, token_id)
                .expect("Transfer should succeed");

            // Total supply should remain constant
            assert_eq!(contract.total_supply(), initial_supply);
        }

        #[ink::test]
        fn test_balance_of_batch_empty_vectors() {
            let contract = setup_contract();

            let result = contract.balance_of_batch(Vec::new(), Vec::new());
            assert_eq!(result, Vec::<u128>::new());
        }

        #[ink::test]
        fn test_get_error_count_nonexistent() {
            let contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            let count = contract.get_error_count(accounts.alice, "NONEXISTENT".to_string());
            assert_eq!(count, 0);
        }

        #[ink::test]
        fn test_get_error_rate_nonexistent() {
            let contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            let rate = contract.get_error_rate(accounts.alice);
            assert_eq!(rate, 0);
        }

        #[ink::test]
        fn test_get_recent_errors_unauthorized() {
            let contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            // Non-admin tries to get errors
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let errors = contract.get_recent_errors(10);
            assert_eq!(errors, Vec::new());
        }

        #[ink::test]
        fn test_error_log_cap_respected() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .set_error_limit(MAX_ERROR_LOG + 10)
                .expect("admin should update error limit");

            test::set_caller::<DefaultEnvironment>(accounts.bob);
            for token_id in 0..(MAX_ERROR_LOG + 5) {
                let result = contract.transfer_from(accounts.bob, accounts.charlie, token_id + 1_000);
                assert_eq!(result, Err(Error::TokenNotFound));
            }

            test::set_caller::<DefaultEnvironment>(contract.admin());
            let errors = contract.get_recent_errors((MAX_ERROR_LOG + 10) as u32);
            assert_eq!(errors.len(), MAX_ERROR_LOG as usize);
            assert_eq!(errors.first().expect("first retained error").log_id, 5);
            assert_eq!(
                errors.last().expect("last retained error").log_id,
                MAX_ERROR_LOG + 4
            );
        }

        #[ink::test]
        fn test_rate_limit_blocks_abusive_caller() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .set_error_limit(3)
                .expect("admin should update error limit");

            test::set_block_timestamp::<DefaultEnvironment>(1);
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            for _ in 0..3 {
                let result = contract.transfer_from(accounts.bob, accounts.charlie, 999);
                assert_eq!(result, Err(Error::TokenNotFound));
            }

            let stats = contract.get_error_stats(accounts.bob);
            assert_eq!(stats.total_errors, 3);
            assert_eq!(stats.window_error_count, 3);
            assert!(stats.is_rate_limited);
            assert_eq!(stats.remaining_before_block, 0);

            let blocked = contract.transfer_from(accounts.bob, accounts.charlie, 999);
            assert_eq!(blocked, Err(Error::RateLimited));

            test::set_caller::<DefaultEnvironment>(contract.admin());
            let errors = contract.get_recent_errors(10);
            assert_eq!(errors.len(), 3);

            test::set_block_timestamp::<DefaultEnvironment>(ERROR_WINDOW_DURATION_MS + 10);
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let after_window = contract.transfer_from(accounts.bob, accounts.charlie, 999);
            assert_eq!(after_window, Err(Error::TokenNotFound));
        }

        fn verify_error_chain(entries: &[ErrorLogEntry]) -> bool {
            let zero_hash = Hash::from([0u8; 32]);

            for (index, entry) in entries.iter().enumerate() {
                let expected_prev = if index == 0 {
                    zero_hash
                } else {
                    entries[index - 1].entry_hash
                };

                if entry.prev_error_hash != expected_prev {
                    return false;
                }

                let recalculated = PropertyToken::hash_error_entry(
                    entry.log_id,
                    &entry.account,
                    &entry.error_code,
                    &entry.message,
                    entry.timestamp,
                    &entry.context,
                    &entry.prev_error_hash,
                );
                if entry.entry_hash != recalculated {
                    return false;
                }
            }

            true
        }

        #[ink::test]
        fn test_error_log_hash_chain_verifies() {
            let mut contract = setup_contract();
            let accounts = test::default_accounts::<DefaultEnvironment>();

            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .set_error_limit(10)
                .expect("admin should update error limit");

            test::set_caller::<DefaultEnvironment>(accounts.bob);
            for timestamp in 1..=3 {
                test::set_block_timestamp::<DefaultEnvironment>(timestamp);
                let result = contract.transfer_from(accounts.bob, accounts.charlie, 7_000 + timestamp);
                assert_eq!(result, Err(Error::TokenNotFound));
            }

            test::set_caller::<DefaultEnvironment>(contract.admin());
            let errors = contract.get_recent_errors(10);
            assert_eq!(errors.len(), 3);
            assert!(verify_error_chain(&errors));
        }

        // Helper: registers a property, verifies compliance, adds bob as operator,
        // and returns the token_id.
        fn setup_bridge_ready_token(contract: &mut PropertyToken) -> u64 {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let metadata = PropertyMetadata {
                location: String::from("Bridge St"),
                size: 1000,
                legal_description: String::from("Bridge test property"),
                valuation: 500000,
                documents_url: String::from("ipfs://bridge"),
            };
            let token_id = contract
                .register_property_with_token(metadata)
                .expect("registration should succeed");

            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .verify_compliance(token_id, true)
                .expect("compliance verification should succeed");
            contract
                .add_bridge_operator(accounts.bob)
                .expect("add operator should succeed");

            token_id
        }

        #[ink::test]
        fn test_duplicate_bridge_request_rejected() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let token_id = setup_bridge_ready_token(&mut contract);

            // First request must succeed
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let first = contract.initiate_bridge_multisig(
                token_id,
                2,
                accounts.bob,
                2,
                None,
            );
            assert!(first.is_ok(), "first bridge request should succeed");

            // Second request for the same token must be rejected
            let second = contract.initiate_bridge_multisig(
                token_id,
                2,
                accounts.bob,
                2,
                None,
            );
            assert_eq!(second, Err(Error::DuplicateBridgeRequest));
        }

        #[ink::test]
        fn test_pending_cleared_on_rejection() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let token_id = setup_bridge_ready_token(&mut contract);

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let request_id = contract
                .initiate_bridge_multisig(token_id, 2, accounts.bob, 2, None)
                .expect("initiate should succeed");

            // Operator rejects
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            contract
                .sign_bridge_request(request_id, false)
                .expect("rejection should succeed");

            // A new request for the same token must now succeed (mapping entry cleared)
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let second = contract.initiate_bridge_multisig(
                token_id,
                2,
                accounts.bob,
                2,
                None,
            );
            assert!(second.is_ok(), "new request after rejection should succeed");
        }

        #[ink::test]
        fn test_retry_bridge_restores_pending_guard() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let token_id = setup_bridge_ready_token(&mut contract);

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let request_id = contract
                .initiate_bridge_multisig(token_id, 2, accounts.bob, 2, None)
                .expect("initiate should succeed");

            // Operator rejects -> mapping entry removed
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            contract
                .sign_bridge_request(request_id, false)
                .expect("rejection should succeed");

            // Admin retries -> mapping entry must be restored
            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .recover_failed_bridge(request_id, RecoveryAction::RetryBridge)
                .expect("retry recovery should succeed");

            // Duplicate request must now be blocked again
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let dup = contract.initiate_bridge_multisig(
                token_id,
                2,
                accounts.bob,
                2,
                None,
            );
            assert_eq!(
                dup,
                Err(Error::DuplicateBridgeRequest),
                "duplicate should be blocked after retry recovery"
            );
        }

        fn advance_blocks(n: u32) {
            for _ in 0..n {
                test::advance_block::<DefaultEnvironment>();
            }
        }

        #[ink::test]
        fn test_expired_bridge_sign_rejected_and_slot_freed() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let token_id = setup_bridge_ready_token(&mut contract);

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let request_id = contract
                .initiate_bridge_multisig(token_id, 2, accounts.bob, 2, Some(2))
                .expect("initiate should succeed");

            // Expire the request
            advance_blocks(3);

            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let result = contract.sign_bridge_request(request_id, true);
            assert_eq!(result, Err(Error::RequestExpired));

            // Pending slot freed — token can be re-bridged
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let again = contract.initiate_bridge_multisig(token_id, 2, accounts.bob, 2, Some(10));
            assert!(again.is_ok(), "re-bridge after expiry should succeed");
        }

        #[ink::test]
        fn test_expired_bridge_execute_rejected_and_token_unlocked() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let token_id = setup_bridge_ready_token(&mut contract);

            // Quorum 2: alice (admin/operator) + bob
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let request_id = contract
                .initiate_bridge_multisig(token_id, 2, accounts.charlie, 2, Some(5))
                .expect("initiate should succeed");

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            contract
                .sign_bridge_request(request_id, true)
                .expect("alice sign");
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            contract
                .sign_bridge_request(request_id, true)
                .expect("bob sign — should lock");

            // Token is locked to zero address
            assert_eq!(
                contract.owner_of(token_id),
                Some(AccountId::from([0u8; 32]))
            );

            advance_blocks(6);

            test::set_caller::<DefaultEnvironment>(accounts.bob);
            let exec = contract.execute_bridge(request_id);
            assert_eq!(exec, Err(Error::RequestExpired));

            // Token restored to original sender (alice)
            assert_eq!(contract.owner_of(token_id), Some(accounts.alice));
            assert!(contract.balance_of(accounts.alice) >= 1);

            // Can initiate a new bridge
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let again = contract.initiate_bridge_multisig(token_id, 2, accounts.charlie, 2, Some(10));
            assert!(again.is_ok(), "re-bridge after expired execute should succeed");
        }

        #[ink::test]
        fn test_duplicate_operator_signature_rejected() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let token_id = setup_bridge_ready_token(&mut contract);

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let request_id = contract
                .initiate_bridge_multisig(token_id, 2, accounts.bob, 2, Some(50))
                .expect("initiate should succeed");

            test::set_caller::<DefaultEnvironment>(accounts.bob);
            contract
                .sign_bridge_request(request_id, true)
                .expect("first sign should succeed");

            let dup = contract.sign_bridge_request(request_id, true);
            assert_eq!(dup, Err(Error::AlreadySigned));
        }

        #[ink::test]
        fn test_operator_rotation_mid_request_quorum() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let token_id = setup_bridge_ready_token(&mut contract);

            // Add charlie so we can rotate bob out while keeping min_signatures floor
            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .add_bridge_operator(accounts.charlie)
                .expect("add charlie");

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let request_id = contract
                .initiate_bridge_multisig(token_id, 2, accounts.django, 2, Some(50))
                .expect("initiate should succeed");

            // Bob votes once, then is removed — his vote must not count
            test::set_caller::<DefaultEnvironment>(accounts.bob);
            contract
                .sign_bridge_request(request_id, true)
                .expect("bob sign");

            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .remove_bridge_operator(accounts.bob)
                .expect("remove bob while alice+charlie remain");

            // Still pending — one current-operator vote needed from charlie + alice
            let status = contract
                .monitor_bridge_status(request_id)
                .expect("status");
            assert_eq!(status.signatures_collected, 0);
            assert_eq!(status.status, BridgeOperationStatus::Pending);

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            contract
                .sign_bridge_request(request_id, true)
                .expect("alice sign");
            test::set_caller::<DefaultEnvironment>(accounts.charlie);
            contract
                .sign_bridge_request(request_id, true)
                .expect("charlie sign — should lock");

            let status = contract
                .monitor_bridge_status(request_id)
                .expect("status after lock");
            assert_eq!(status.status, BridgeOperationStatus::Locked);
            assert_eq!(status.signatures_collected, 2);

            test::set_caller::<DefaultEnvironment>(accounts.charlie);
            contract
                .execute_bridge(request_id)
                .expect("execute with current-operator quorum");
        }

        #[ink::test]
        fn test_remove_operator_respects_min_signatures_floor() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let _token_id = setup_bridge_ready_token(&mut contract);
            // Operators: alice (deployer) + bob = 2, min_signatures_required = 2

            test::set_caller::<DefaultEnvironment>(contract.admin());
            let result = contract.remove_bridge_operator(accounts.bob);
            assert_eq!(
                result,
                Err(Error::InsufficientSignatures),
                "cannot drop below min_signatures_required"
        #[ink::test]
        fn admin_direct_code_hash_upgrade_is_blocked() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();

            let result = contract.set_code_hash(Hash::from([9u8; 32]));

            assert_eq!(result, Err(Error::Unauthorized));
            assert_eq!(contract.code_hash_history_count(), 0);
            assert!(contract.pending_code_hash().is_none());
        }

        #[ink::test]
        fn governance_proposal_pauses_until_timelocked_commit() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();
            let governance = accounts.bob;
            let new_hash = Hash::from([7u8; 32]);

            contract
                .set_governance(governance)
                .expect("admin should configure governance");

            test::set_block_timestamp::<DefaultEnvironment>(1_000);
            test::set_caller::<DefaultEnvironment>(governance);
            contract
                .propose_code_hash(new_hash)
                .expect("governance should propose code hash");

            let pending = contract
                .pending_code_hash()
                .expect("proposal should be stored");
            assert_eq!(pending.code_hash, new_hash);
            assert_eq!(
                pending.executable_at,
                1_000 + contract.code_hash_upgrade_delay()
            );
            assert!(contract.is_paused());
            assert_eq!(
                contract.commit_code_hash(),
                Err(Error::UpgradeTimelockActive)
            );

            test::set_block_timestamp::<DefaultEnvironment>(pending.executable_at);
            assert_eq!(contract.commit_code_hash(), Ok(()));
            assert!(contract.pending_code_hash().is_none());
            assert_eq!(contract.code_hash_history_count(), 1);

            let history = contract
                .code_hash_history(0)
                .expect("committed upgrade should be recorded");
            assert_eq!(history.code_hash, new_hash);
            assert_eq!(history.proposer, governance);
            assert_eq!(history.committer, governance);
        }

        #[ink::test]
        fn non_governance_cannot_propose_or_commit_code_hash() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();

            assert_eq!(
                contract.propose_code_hash(Hash::from([3u8; 32])),
                Err(Error::GovernanceNotSet)
            );

            contract
                .set_governance(accounts.bob)
                .expect("admin should configure governance");

            test::set_caller::<DefaultEnvironment>(accounts.charlie);
            assert_eq!(
                contract.propose_code_hash(Hash::from([3u8; 32])),
                Err(Error::Unauthorized)
            );
            assert_eq!(contract.commit_code_hash(), Err(Error::Unauthorized));
        }

        #[ink::test]
        fn code_hash_proposal_pause_blocks_token_transfer() {
            let accounts = test::default_accounts::<DefaultEnvironment>();
            test::set_caller::<DefaultEnvironment>(accounts.alice);
            let mut contract = setup_contract();

            let metadata = PropertyMetadata {
                location: String::from("Upgrade Guard Ave"),
                size: 1000,
                legal_description: String::from("Paused transfer test property"),
                valuation: 500000,
                documents_url: String::from("ipfs://upgrade-guard"),
            };
            let token_id = contract
                .register_property_with_token(metadata)
                .expect("registration should succeed");

            test::set_caller::<DefaultEnvironment>(contract.admin());
            contract
                .verify_compliance(token_id, true)
                .expect("compliance verification should succeed");
            contract
                .set_governance(accounts.bob)
                .expect("admin should configure governance");

            test::set_caller::<DefaultEnvironment>(accounts.bob);
            contract
                .propose_code_hash(Hash::from([5u8; 32]))
                .expect("governance should propose code hash");

            test::set_caller::<DefaultEnvironment>(accounts.alice);
            assert_eq!(
                contract.approve(accounts.charlie, token_id),
                Err(Error::ContractPaused)
            );
            assert_eq!(
                contract.transfer_from(accounts.alice, accounts.charlie, token_id),
                Err(Error::ContractPaused)
            );
        }
