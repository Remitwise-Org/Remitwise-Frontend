#[cfg(test)]
pub mod escrow_tests {
    use crate::propchain_escrow::*;
    use ink::env::test::DefaultAccounts;
    use ink::primitives::{AccountId, Hash};

    fn default_accounts() -> DefaultAccounts<ink::env::DefaultEnvironment> {
        ink::env::test::default_accounts::<ink::env::DefaultEnvironment>()
    }

    fn set_caller(caller: AccountId) {
        ink::env::test::set_caller::<ink::env::DefaultEnvironment>(caller);
    }

    fn set_balance(account: AccountId, balance: u128) {
        ink::env::test::set_account_balance::<ink::env::DefaultEnvironment>(account, balance);
    }

    #[ink::test]
    fn test_new_contract() {
        let contract = AdvancedEscrow::new(1_000_000);
        assert_eq!(contract.get_high_value_threshold(), 1_000_000);
    }

    #[ink::test]
    fn test_create_escrow_advanced() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob, accounts.charlie];
        let result = contract.create_escrow_advanced(
            1,              // property_id
            1_000_000,      // amount
            accounts.alice, // buyer
            accounts.bob,   // seller
            participants,
            2,    // required_signatures
            None, // no time lock
        );

        assert!(result.is_ok());
        let escrow_id = result.expect("Escrow creation should succeed in test");
        assert_eq!(escrow_id, 1);

        let escrow = contract
            .get_escrow(escrow_id)
            .expect("Escrow should exist after creation");
        assert_eq!(escrow.property_id, 1);
        assert_eq!(escrow.amount, 1_000_000);
        assert_eq!(escrow.buyer, accounts.alice);
        assert_eq!(escrow.seller, accounts.bob);
        assert_eq!(escrow.status, EscrowStatus::Created);
    }

    #[ink::test]
    fn test_create_escrow_invalid_config() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        // Test with more required signatures than participants
        let participants = vec![accounts.alice, accounts.bob];
        let result = contract.create_escrow_advanced(
            1,
            1_000_000,
            accounts.alice,
            accounts.bob,
            participants,
            3, // More than participants
            None,
        );

        assert_eq!(result, Err(Error::InvalidConfiguration));
    }

    #[ink::test]
    fn test_deposit_funds() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        set_balance(accounts.alice, 2_000_000);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        // Deposit funds
        ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000_000);
        let result = contract.deposit_funds(escrow_id);
        assert!(result.is_ok());

        let escrow = contract
            .get_escrow(escrow_id)
            .expect("Escrow should exist after deposit");
        assert_eq!(escrow.deposited_amount, 1_000_000);
        assert_eq!(escrow.status, EscrowStatus::Active);
    }

    #[ink::test]
    fn test_upload_document() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        let doc_hash = Hash::from([1u8; 32]);
        let result = contract.upload_document(escrow_id, doc_hash, "Title Deed".to_string());

        assert!(result.is_ok());

        let documents = contract.get_documents(escrow_id);
        assert_eq!(documents.len(), 1);
        assert_eq!(documents[0].hash, doc_hash);
        assert_eq!(documents[0].document_type, "Title Deed");
        assert!(!documents[0].verified);
    }

    #[ink::test]
    fn test_verify_document() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        let doc_hash = Hash::from([1u8; 32]);
        contract
            .upload_document(escrow_id, doc_hash, "Title Deed".to_string())
            .expect("Document upload should succeed in test");

        // Verify document
        let result = contract.verify_document(escrow_id, doc_hash);
        assert!(result.is_ok());

        let documents = contract.get_documents(escrow_id);
        assert!(documents[0].verified);
    }

    #[ink::test]
    fn test_add_condition() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        let result = contract.add_condition(escrow_id, "Property inspection completed".to_string());

        assert!(result.is_ok());
        let condition_id = result.expect("Condition addition should succeed in test");
        assert_eq!(condition_id, 1);

        let conditions = contract.get_conditions(escrow_id);
        assert_eq!(conditions.len(), 1);
        assert_eq!(conditions[0].description, "Property inspection completed");
        assert!(!conditions[0].met);
    }

    #[ink::test]
    fn test_mark_condition_met() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        let condition_id = contract
            .add_condition(escrow_id, "Property inspection completed".to_string())
            .expect("Condition addition should succeed in test");

        let result = contract.mark_condition_met(escrow_id, condition_id);
        assert!(result.is_ok());

        let conditions = contract.get_conditions(escrow_id);
        assert!(conditions[0].met);
        assert_eq!(conditions[0].verified_by, Some(accounts.alice));
    }

    #[ink::test]
    fn test_sign_approval() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        // Alice signs
        let result = contract.sign_approval(escrow_id, ApprovalType::Release);
        assert!(result.is_ok());

        let count = contract.get_signature_count(escrow_id, ApprovalType::Release);
        assert_eq!(count, 1);

        // Bob signs
        set_caller(accounts.bob);
        let result = contract.sign_approval(escrow_id, ApprovalType::Release);
        assert!(result.is_ok());

        let count = contract.get_signature_count(escrow_id, ApprovalType::Release);
        assert_eq!(count, 2);
    }

    #[ink::test]
    fn test_sign_approval_already_signed() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        contract
            .sign_approval(escrow_id, ApprovalType::Release)
            .expect("Approval signing should succeed in test");

        // Try to sign again
        let result = contract.sign_approval(escrow_id, ApprovalType::Release);
        assert_eq!(result, Err(Error::AlreadySigned));
    }

    #[ink::test]
    fn test_raise_dispute() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        let result =
            contract.raise_dispute(escrow_id, "Property condition not as described".to_string());

        assert!(result.is_ok());

        let dispute = contract
            .get_dispute(escrow_id)
            .expect("Dispute should exist after raising");
        assert_eq!(dispute.raised_by, accounts.alice);
        assert_eq!(dispute.reason, "Property condition not as described");
        assert!(!dispute.resolved);

        let escrow = contract
            .get_escrow(escrow_id)
            .expect("Escrow should exist in test");
        assert_eq!(escrow.status, EscrowStatus::Disputed);
    }

    #[ink::test]
    fn test_resolve_dispute() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);
        let admin = contract.get_admin();

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .unwrap();

        contract
            .raise_dispute(escrow_id, "Issue".to_string())
            .expect("Dispute raising should succeed in test");

        // Admin resolves dispute
        set_caller(admin);
        let result = contract.resolve_dispute(escrow_id, "Resolved in favor of buyer".to_string());

        assert!(result.is_ok());

        let dispute = contract
            .get_dispute(escrow_id)
            .expect("Dispute should exist after raising");
        assert!(dispute.resolved);
        assert_eq!(
            dispute.resolution,
            Some("Resolved in favor of buyer".to_string())
        );

        let escrow = contract
            .get_escrow(escrow_id)
            .expect("Escrow should exist in test");
        assert_eq!(escrow.status, EscrowStatus::Active);
    }

    #[ink::test]
    fn test_resolve_dispute_unauthorized() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        contract
            .raise_dispute(escrow_id, "Issue".to_string())
            .expect("Dispute raising should succeed in test");

        // Non-admin tries to resolve
        set_caller(accounts.bob);
        let result = contract.resolve_dispute(escrow_id, "Resolution".to_string());
        assert_eq!(result, Err(Error::Unauthorized));
    }

    #[ink::test]
    fn test_check_all_conditions_met() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        // No conditions - should return true
        let result = contract.check_all_conditions_met(escrow_id);
        assert_eq!(result, Ok(true));

        // Add conditions
        let cond1 = contract
            .add_condition(escrow_id, "Condition 1".to_string())
            .expect("Condition addition should succeed in test");
        let cond2 = contract
            .add_condition(escrow_id, "Condition 2".to_string())
            .expect("Condition addition should succeed in test");

        // Not all met
        let result = contract.check_all_conditions_met(escrow_id);
        assert_eq!(result, Ok(false));

        // Mark first condition met
        contract
            .mark_condition_met(escrow_id, cond1)
            .expect("Marking condition met should succeed in test");
        let result = contract.check_all_conditions_met(escrow_id);
        assert_eq!(result, Ok(false));

        // Mark second condition met
        contract
            .mark_condition_met(escrow_id, cond2)
            .expect("Marking condition met should succeed in test");
        let result = contract.check_all_conditions_met(escrow_id);
        assert_eq!(result, Ok(true));
    }

    #[ink::test]
    fn test_audit_trail() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        // Perform some actions
        contract
            .add_condition(escrow_id, "Test condition".to_string())
            .expect("Condition addition should succeed in test");
        let doc_hash = Hash::from([1u8; 32]);
        contract
            .upload_document(escrow_id, doc_hash, "Test doc".to_string())
            .expect("Document upload should succeed in test");

        // Check audit trail
        let audit_trail = contract.get_audit_trail(escrow_id);
        assert!(audit_trail.len() >= 3); // Created + Condition + Document

        // Verify audit entries contain expected actions
        let actions: Vec<String> = audit_trail.iter().map(|e| e.action.clone()).collect();
        assert!(actions.contains(&"EscrowCreated".to_string()));
        assert!(actions.contains(&"ConditionAdded".to_string()));
        assert!(actions.contains(&"DocumentUploaded".to_string()));
    }

    #[ink::test]
    fn test_set_admin() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);
        let original_admin = contract.get_admin();
        assert_eq!(original_admin, accounts.alice);

        let result = contract.set_admin(accounts.bob);
        assert!(result.is_ok());

        let new_admin = contract.get_admin();
        assert_eq!(new_admin, accounts.bob);
    }

    #[ink::test]
    fn test_set_admin_unauthorized() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        // Try to set admin as non-admin
        set_caller(accounts.bob);
        let result = contract.set_admin(accounts.charlie);
        assert_eq!(result, Err(Error::Unauthorized));
    }

    #[ink::test]
    fn test_multi_sig_config() {
        let accounts = default_accounts();
        set_caller(accounts.alice);

        let mut contract = AdvancedEscrow::new(1_000_000);

        let participants = vec![accounts.alice, accounts.bob, accounts.charlie];
        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants.clone(),
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        let config = contract
            .get_multi_sig_config(escrow_id)
            .expect("Multi-sig config should exist in test");
        assert_eq!(config.required_signatures, 2);
        assert_eq!(config.signers, participants);
    }

    #[ink::test]
    fn test_release_funds_updates_state_before_interaction_path() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        set_balance(accounts.alice, 2_000_000);

        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000_000);
        contract
            .deposit_funds(escrow_id)
            .expect("Deposit should succeed in test");

        contract
            .sign_approval(escrow_id, ApprovalType::Release)
            .expect("First release signature should succeed in test");
        set_caller(accounts.bob);
        contract
            .sign_approval(escrow_id, ApprovalType::Release)
            .expect("Second release signature should succeed in test");

        set_caller(accounts.alice);
        contract
            .release_funds(escrow_id)
            .expect("Release should succeed in test");

        let escrow = contract
            .get_escrow(escrow_id)
            .expect("Escrow should exist after release");
        assert_eq!(escrow.status, EscrowStatus::Released);
        assert_eq!(escrow.deposited_amount, 0);
    }

    #[ink::test]
    fn test_refund_funds_updates_state_before_interaction_path() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        set_balance(accounts.alice, 2_000_000);

        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000_000);
        contract
            .deposit_funds(escrow_id)
            .expect("Deposit should succeed in test");

        contract
            .sign_approval(escrow_id, ApprovalType::Refund)
            .expect("First refund signature should succeed in test");
        set_caller(accounts.bob);
        contract
            .sign_approval(escrow_id, ApprovalType::Refund)
            .expect("Second refund signature should succeed in test");

        set_caller(accounts.alice);
        contract
            .refund_funds(escrow_id)
            .expect("Refund should succeed in test");

        let escrow = contract
            .get_escrow(escrow_id)
            .expect("Escrow should exist after refund");
        assert_eq!(escrow.status, EscrowStatus::Refunded);
        assert_eq!(escrow.deposited_amount, 0);
    }

    #[ink::test]
    fn test_emergency_override_updates_state_before_interaction_path() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        set_balance(accounts.alice, 2_000_000);

        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                2,
                None,
            )
            .expect("Escrow creation should succeed in test");

        ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000_000);
        contract
            .deposit_funds(escrow_id)
            .expect("Deposit should succeed in test");

        contract
            .emergency_override(escrow_id, true)
            .expect("Emergency override should succeed in test");

        let escrow = contract
            .get_escrow(escrow_id)
            .expect("Escrow should exist after emergency override");
        assert_eq!(escrow.status, EscrowStatus::Released);
        assert_eq!(escrow.deposited_amount, 0);
    }

    // =========================================================================
    // Issue #310: Input validation – amount must be > 0
    // =========================================================================

    #[ink::test]
    fn test_create_escrow_zero_amount_rejected() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let result = contract.create_escrow_advanced(
            1,
            0, // zero amount – must be rejected
            accounts.alice,
            accounts.bob,
            participants,
            1,
            None,
        );
        assert_eq!(result, Err(Error::InvalidConfiguration));
    }

    // =========================================================================
    // Issue #294: Initialization edge case tests
    // =========================================================================

    #[ink::test]
    fn test_init_zero_threshold() {
        // A threshold of 0 is a valid constructor value (no high-value enforcement)
        let contract = AdvancedEscrow::new(0);
        assert_eq!(contract.get_high_value_threshold(), 0);
    }

    #[ink::test]
    fn test_init_max_u128_threshold() {
        let contract = AdvancedEscrow::new(u128::MAX);
        assert_eq!(contract.get_high_value_threshold(), u128::MAX);
    }

    #[ink::test]
    fn test_create_escrow_zero_required_signatures_rejected() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let result = contract.create_escrow_advanced(
            1,
            1_000_000,
            accounts.alice,
            accounts.bob,
            participants,
            0, // zero required signatures – must be rejected
            None,
        );
        assert_eq!(result, Err(Error::InvalidConfiguration));
    }

    #[ink::test]
    fn test_create_escrow_empty_participants_rejected() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(1_000_000);

        let result = contract.create_escrow_advanced(
            1,
            1_000_000,
            accounts.alice,
            accounts.bob,
            vec![], // empty participants – must be rejected
            1,
            None,
        );
        assert_eq!(result, Err(Error::InvalidConfiguration));
    }

    #[ink::test]
    fn test_create_escrow_max_amount() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(u128::MAX);
        let participants = vec![accounts.alice, accounts.bob];

        let result = contract.create_escrow_advanced(
            u64::MAX,
            u128::MAX,
            accounts.alice,
            accounts.bob,
            participants,
            1,
            None,
        );
        assert!(result.is_ok());
        let escrow = contract.get_escrow(result.unwrap()).unwrap();
        assert_eq!(escrow.amount, u128::MAX);
        assert_eq!(escrow.property_id, u64::MAX);
    }

    #[ink::test]
    fn test_double_init_admin_is_caller() {
        // Each new() call sets admin to the current caller – verify isolation
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let contract_a = AdvancedEscrow::new(1_000);
        assert_eq!(contract_a.get_admin(), accounts.alice);

        set_caller(accounts.bob);
        let contract_b = AdvancedEscrow::new(1_000);
        assert_eq!(contract_b.get_admin(), accounts.bob);
    }

    // =========================================================================
    // Issue #296: Regression tests – guard against previously-fixed bugs
    // =========================================================================

    #[ink::test]
    fn regression_escrow_count_increments_correctly() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        for expected_id in 1u64..=3 {
            let id = contract
                .create_escrow_advanced(
                    expected_id,
                    1_000,
                    accounts.alice,
                    accounts.bob,
                    participants.clone(),
                    1,
                    None,
                )
                .expect("Escrow creation should succeed");
            assert_eq!(id, expected_id);
        }
    }

    #[ink::test]
    fn regression_deposit_does_not_overflow_deposited_amount() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        set_balance(accounts.alice, u128::MAX);
        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let escrow_id = contract
            .create_escrow_advanced(
                1,
                2_000,
                accounts.alice,
                accounts.bob,
                participants,
                1,
                None,
            )
            .unwrap();

        ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000);
        contract.deposit_funds(escrow_id).unwrap();

        let escrow = contract.get_escrow(escrow_id).unwrap();
        assert_eq!(escrow.deposited_amount, 1_000);
        assert_eq!(escrow.status, EscrowStatus::Funded);

        ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1_000);
        contract.deposit_funds(escrow_id).unwrap();

        let escrow = contract.get_escrow(escrow_id).unwrap();
        assert_eq!(escrow.deposited_amount, 2_000);
        assert_eq!(escrow.status, EscrowStatus::Active);
    }

    #[ink::test]
    fn regression_non_participant_cannot_upload_document() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                1,
                None,
            )
            .unwrap();

        set_caller(accounts.charlie); // not a participant
        let result =
            contract.upload_document(escrow_id, Hash::from([9u8; 32]), "Deed".to_string());
        assert_eq!(result, Err(Error::Unauthorized));
    }

    #[ink::test]
    fn regression_duplicate_dispute_rejected() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                1,
                None,
            )
            .unwrap();

        contract
            .raise_dispute(escrow_id, "First dispute".to_string())
            .unwrap();

        // Second dispute while first is unresolved must be rejected
        let result = contract.raise_dispute(escrow_id, "Second dispute".to_string());
        assert_eq!(result, Err(Error::DisputeActive));
    }

    #[ink::test]
    fn regression_release_requires_active_status() {
        let accounts = default_accounts();
        set_caller(accounts.alice);
        let mut contract = AdvancedEscrow::new(1_000_000);
        let participants = vec![accounts.alice, accounts.bob];

        let escrow_id = contract
            .create_escrow_advanced(
                1,
                1_000_000,
                accounts.alice,
                accounts.bob,
                participants,
                1,
                None,
            )
            .unwrap();

        // Escrow is in Created state – release must fail
        let result = contract.release_funds(escrow_id);
        assert_eq!(result, Err(Error::InvalidStatus));
    }
}
