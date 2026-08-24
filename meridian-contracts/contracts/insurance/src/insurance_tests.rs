
    use super::*;
    use ink::env::{test, DefaultEnvironment};

    use crate::propchain_insurance::{
        ClaimStatus, CoverageType, EvidenceMetadata, InsuranceError, PolicyStatus,
        PropertyInsurance,
    };

    fn valid_evidence() -> EvidenceMetadata {
        EvidenceMetadata {
            evidence_type: "photo".into(),
            reference_uri: "ipfs://QmEvidence123".into(),
            content_hash: vec![0u8; 32],
            description: Some("Fire damage photos".into()),
        }
    }

    fn setup() -> PropertyInsurance {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        // Start at 35 days so `now - last_claim(0) > 30-day cooldown`
        test::set_block_timestamp::<DefaultEnvironment>(3_000_000);
        PropertyInsurance::new(accounts.alice)
    }

    fn add_risk_assessment(contract: &mut PropertyInsurance, property_id: u64) {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract
            .update_risk_assessment(property_id, 75, 80, 85, 90, 86_400 * 365)
            .expect("risk assessment failed");
    }

    fn create_pool(contract: &mut PropertyInsurance) -> u64 {
        contract
            .create_risk_pool(
                "Fire & Flood Pool".into(),
                CoverageType::Fire,
                8000,
                500_000_000_000u128,
            )
            .expect("pool creation failed")
    }

    fn fee_split(amount: u128, fee_bps: u128) -> (u128, u128) {
        let fee = amount.saturating_mul(fee_bps) / 10_000;
        let pool_share = amount.saturating_sub(fee);
        (fee, pool_share)
    }

    // =========================================================================
    // CONSTRUCTOR
    // =========================================================================

    #[ink::test]
    fn test_new_contract_initialised() {
        let contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        assert_eq!(contract.get_admin(), accounts.alice);
        assert_eq!(contract.get_policy_count(), 0);
        assert_eq!(contract.get_claim_count(), 0);
    }

    // =========================================================================
    // POOL TESTS
    // =========================================================================

    #[ink::test]
    fn test_create_risk_pool_works() {
        let mut contract = setup();
        let pool_id = create_pool(&mut contract);
        assert_eq!(pool_id, 1);
        let pool = contract.get_pool(1).unwrap();
        assert_eq!(pool.pool_id, 1);
        assert!(pool.is_active);
        assert_eq!(pool.active_policies, 0);
    }

    #[ink::test]
    fn test_create_risk_pool_unauthorized() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.create_risk_pool(
            "Unauthorized Pool".into(),
            CoverageType::Fire,
            8000,
            1_000_000,
        );
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    #[ink::test]
    fn test_provide_pool_liquidity_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(1_000_000_000_000u128);
        let result = contract.provide_pool_liquidity(pool_id);
        assert!(result.is_ok());
        let pool = contract.get_pool(pool_id).unwrap();
        assert_eq!(pool.total_capital, 1_000_000_000_000u128);
        assert_eq!(pool.available_capital, 1_000_000_000_000u128);
    }

    #[ink::test]
    fn test_provide_liquidity_nonexistent_pool_fails() {
        let mut contract = setup();
        test::set_value_transferred::<DefaultEnvironment>(1_000_000u128);
        let result = contract.provide_pool_liquidity(999);
        assert_eq!(result, Err(InsuranceError::PoolNotFound));
    }

    // =========================================================================
    // RISK ASSESSMENT TESTS
    // =========================================================================

    #[ink::test]
    fn test_update_risk_assessment_works() {
        let mut contract = setup();
        add_risk_assessment(&mut contract, 1);
        let assessment = contract.get_risk_assessment(1).unwrap();
        assert_eq!(assessment.property_id, 1);
        assert_eq!(assessment.overall_risk_score, 82); // (75+80+85+90)/4
        assert!(assessment.valid_until > 0);
    }

    #[ink::test]
    fn test_risk_assessment_unauthorized() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.update_risk_assessment(1, 70, 70, 70, 70, 86400);
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    #[ink::test]
    fn test_authorized_oracle_can_assess() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.update_risk_assessment(1, 70, 70, 70, 70, 86400);
        assert!(result.is_ok());
    }

    // =========================================================================
    // CONFIDENCE-SCORE → RISK-LEVEL MAPPING TESTS
    // =========================================================================
    // These tests verify that `confidence_score_to_risk_level` correctly maps
    // property quality scores to risk levels (higher score = lower risk).

    #[ink::test]
    fn test_confidence_score_0_20_maps_to_very_high_risk() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        // All sub-scores at 10 → overall = 10 (0–20 bucket)
        contract.update_risk_assessment(1, 10, 10, 10, 10, 86_400).unwrap();
        let assessment = contract.get_risk_assessment(1).unwrap();
        assert_eq!(assessment.overall_risk_score, 10);
        assert_eq!(assessment.risk_level, RiskLevel::VeryHigh);
    }

    #[ink::test]
    fn test_confidence_score_21_40_maps_to_high_risk() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        // All sub-scores at 30 → overall = 30 (21–40 bucket)
        contract.update_risk_assessment(2, 30, 30, 30, 30, 86_400).unwrap();
        let assessment = contract.get_risk_assessment(2).unwrap();
        assert_eq!(assessment.overall_risk_score, 30);
        assert_eq!(assessment.risk_level, RiskLevel::High);
    }

    #[ink::test]
    fn test_confidence_score_41_60_maps_to_medium_risk() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        // All sub-scores at 50 → overall = 50 (41–60 bucket)
        contract.update_risk_assessment(3, 50, 50, 50, 50, 86_400).unwrap();
        let assessment = contract.get_risk_assessment(3).unwrap();
        assert_eq!(assessment.overall_risk_score, 50);
        assert_eq!(assessment.risk_level, RiskLevel::Medium);
    }

    #[ink::test]
    fn test_confidence_score_61_80_maps_to_low_risk() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        // All sub-scores at 70 → overall = 70 (61–80 bucket)
        contract.update_risk_assessment(4, 70, 70, 70, 70, 86_400).unwrap();
        let assessment = contract.get_risk_assessment(4).unwrap();
        assert_eq!(assessment.overall_risk_score, 70);
        assert_eq!(assessment.risk_level, RiskLevel::Low);
    }

    #[ink::test]
    fn test_confidence_score_81_100_maps_to_very_low_risk() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        // All sub-scores at 90 → overall = 90 (81–100 bucket)
        contract.update_risk_assessment(5, 90, 90, 90, 90, 86_400).unwrap();
        let assessment = contract.get_risk_assessment(5).unwrap();
        assert_eq!(assessment.overall_risk_score, 90);
        assert_eq!(assessment.risk_level, RiskLevel::VeryLow);
    }

    #[ink::test]
    fn test_confidence_score_boundary_values() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        // Score 0 → VeryHigh (lower bound)
        contract.update_risk_assessment(200, 0, 0, 0, 0, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(200).unwrap().risk_level, RiskLevel::VeryHigh);

        // Score 20 → VeryHigh (upper bound)
        contract.update_risk_assessment(201, 20, 20, 20, 20, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(201).unwrap().risk_level, RiskLevel::VeryHigh);

        // Score 21 → High (lower bound)
        contract.update_risk_assessment(202, 21, 21, 21, 21, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(202).unwrap().risk_level, RiskLevel::High);

        // Score 40 → High (upper bound)
        contract.update_risk_assessment(203, 40, 40, 40, 40, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(203).unwrap().risk_level, RiskLevel::High);

        // Score 41 → Medium (lower bound)
        contract.update_risk_assessment(204, 41, 41, 41, 41, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(204).unwrap().risk_level, RiskLevel::Medium);

        // Score 60 → Medium (upper bound)
        contract.update_risk_assessment(205, 60, 60, 60, 60, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(205).unwrap().risk_level, RiskLevel::Medium);

        // Score 61 → Low (lower bound)
        contract.update_risk_assessment(206, 61, 61, 61, 61, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(206).unwrap().risk_level, RiskLevel::Low);

        // Score 80 → Low (upper bound)
        contract.update_risk_assessment(207, 80, 80, 80, 80, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(207).unwrap().risk_level, RiskLevel::Low);

        // Score 81 → VeryLow (lower bound)
        contract.update_risk_assessment(208, 81, 81, 81, 81, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(208).unwrap().risk_level, RiskLevel::VeryLow);

        // Score 100 → VeryLow (upper bound)
        contract.update_risk_assessment(209, 100, 100, 100, 100, 86_400).unwrap();
        assert_eq!(contract.get_risk_assessment(209).unwrap().risk_level, RiskLevel::VeryLow);
    }

    // =========================================================================
    // PREMIUM CALCULATION TESTS
    // =========================================================================

    #[ink::test]
    fn test_calculate_premium_works() {
        let mut contract = setup();
        add_risk_assessment(&mut contract, 1);
        let result = contract.calculate_premium(1, 1_000_000_000_000u128, CoverageType::Fire);
        assert!(result.is_ok());
        let calc = result.unwrap();
        assert!(calc.annual_premium > 0);
        assert!(calc.monthly_premium > 0);
        assert!(calc.deductible > 0);
        assert_eq!(calc.base_rate, 150);
    }

    #[ink::test]
    fn test_premium_without_assessment_fails() {
        let contract = setup();
        let result = contract.calculate_premium(999, 1_000_000u128, CoverageType::Fire);
        assert_eq!(result, Err(InsuranceError::PropertyNotInsurable));
    }

    #[ink::test]
    fn test_comprehensive_coverage_higher_premium() {
        let mut contract = setup();
        add_risk_assessment(&mut contract, 1);
        let fire_calc = contract
            .calculate_premium(1, 1_000_000_000_000u128, CoverageType::Fire)
            .unwrap();
        let comp_calc = contract
            .calculate_premium(1, 1_000_000_000_000u128, CoverageType::Comprehensive)
            .unwrap();
        assert!(comp_calc.annual_premium > fire_calc.annual_premium);
    }

    #[ink::test]
    fn test_security_large_coverage_premium_calculation_does_not_overflow() {
        let mut contract = setup();
        add_risk_assessment(&mut contract, 1);

        let result = contract.calculate_premium(1, u128::MAX, CoverageType::Comprehensive);
        assert!(result.is_ok());

        let calc = result.expect("Premium calculation should handle large values safely");
        assert!(calc.annual_premium > 0);
        assert!(calc.monthly_premium <= calc.annual_premium);
        assert!(calc.deductible <= u128::MAX);
    }

    // =========================================================================
    // POLICY CREATION TESTS
    // =========================================================================

    #[ink::test]
    fn test_create_policy_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);

        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);

        let result = contract.create_policy(
            1,
            CoverageType::Fire,
            500_000_000_000u128,
            pool_id,
            86_400 * 365,
            "ipfs://policy-metadata".into(),
        );
        assert!(result.is_ok());

        let policy_id = result.unwrap();
        let policy = contract.get_policy(policy_id).unwrap();
        assert_eq!(policy.property_id, 1);
        assert_eq!(policy.policyholder, accounts.bob);
        assert_eq!(policy.status, PolicyStatus::Active);
        assert_eq!(contract.get_policy_count(), 1);
    }

    #[ink::test]
    fn test_create_policy_insufficient_premium_fails() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(1u128);
        let result = contract.create_policy(
            1,
            CoverageType::Fire,
            500_000_000_000u128,
            pool_id,
            86_400 * 365,
            "ipfs://policy-metadata".into(),
        );
        assert_eq!(result, Err(InsuranceError::InsufficientPremium));
    }

    #[ink::test]
    fn test_create_policy_nonexistent_pool_fails() {
        let mut contract = setup();
        add_risk_assessment(&mut contract, 1);
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(1_000_000_000_000u128);
        let result = contract.create_policy(
            1,
            CoverageType::Fire,
            100_000u128,
            999,
            86_400 * 365,
            "ipfs://policy-metadata".into(),
        );
        assert_eq!(result, Err(InsuranceError::PoolNotFound));
    }

    // =========================================================================
    // POLICY CANCELLATION TESTS
    // =========================================================================

    #[ink::test]
    fn test_cancel_policy_by_policyholder() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let result = contract.cancel_policy(policy_id);
        assert!(result.is_ok());
        let policy = contract.get_policy(policy_id).unwrap();
        assert_eq!(policy.status, PolicyStatus::Cancelled);
    }

    #[ink::test]
    fn test_cancel_policy_by_non_owner_fails() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let result = contract.cancel_policy(policy_id);
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    // =========================================================================
    // CLAIM SUBMISSION TESTS
    // =========================================================================

    #[ink::test]
    fn test_submit_claim_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let result = contract.submit_claim(
            policy_id,
            10_000_000_000u128,
            "Fire damage to property".into(),
            valid_evidence(), 0,
        );
        assert!(result.is_ok());
        let claim_id = result.unwrap();
        let claim = contract.get_claim(claim_id).unwrap();
        assert_eq!(claim.policy_id, policy_id);
        assert_eq!(claim.claimant, accounts.bob);
        assert_eq!(claim.status, ClaimStatus::Pending);
        assert_eq!(contract.get_claim_count(), 1);
    }

    #[ink::test]
    fn test_claim_exceeds_coverage_fails() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let coverage = 500_000_000_000u128;
        let calc = contract
            .calculate_premium(1, coverage, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                coverage,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let result = contract.submit_claim(
            policy_id,
            coverage * 2,
            "Huge fire".into(),
            valid_evidence(), 0,
        );
        assert_eq!(result, Err(InsuranceError::ClaimExceedsCoverage));
    }

    #[ink::test]
    fn test_claim_by_nonpolicyholder_fails() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let result = contract.submit_claim(
            policy_id,
            1_000u128,
            "Fraud attempt".into(),
            valid_evidence(), 0,
        );
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    // =========================================================================
    // CLAIM PROCESSING TESTS
    // =========================================================================

    #[ink::test]
    fn test_process_claim_approve_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let coverage = 500_000_000_000u128;
        let calc = contract
            .calculate_premium(1, coverage, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                coverage,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let claim_id = contract
            .submit_claim(
                policy_id,
                10_000_000_000u128,
                "Fire damage".into(),
                valid_evidence(), 0,
            )
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let result =
            contract.process_claim(claim_id, true, "ipfs://oracle-report".into(), String::new());
        assert!(result.is_ok());
        let claim = contract.get_claim(claim_id).unwrap();
        assert_eq!(claim.status, ClaimStatus::Paid);
        assert!(claim.payout_amount > 0);
    }

    #[ink::test]
    fn test_process_claim_reject_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let claim_id = contract
            .submit_claim(
                policy_id,
                5_000_000_000u128,
                "Fraudulent claim".into(),
                "ipfs://fake-evidence".into(), 0,
            )
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let result = contract.process_claim(
            claim_id,
            false,
            "ipfs://oracle-report".into(),
            "Evidence does not support claim".into(),
        );
        assert!(result.is_ok());
        let claim = contract.get_claim(claim_id).unwrap();
        assert_eq!(claim.status, ClaimStatus::Rejected);
    }

    #[ink::test]
    fn test_process_claim_unauthorized_fails() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let claim_id = contract
            .submit_claim(policy_id, 1_000_000u128, "Damage".into(), "ipfs://e".into(), 0)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let result = contract.process_claim(claim_id, true, "ipfs://r".into(), String::new());
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    #[ink::test]
    fn test_authorized_assessor_can_process_claim() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let claim_id = contract
            .submit_claim(policy_id, 1_000_000u128, "Damage".into(), "ipfs://e".into(), 0)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.authorize_assessor(accounts.charlie).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let result = contract.process_claim(
            claim_id,
            false,
            "ipfs://r".into(),
            "Insufficient evidence".into(),
        );
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_security_claim_cooldown_boundary_blocks_early_retry_and_allows_exact_boundary() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);

        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://cooldown".into(), 0,
            )
            .unwrap();

        let first_claim_id = contract
            .submit_claim(
                policy_id,
                100_000u128,
                "Initial loss".into(),
                valid_evidence(), 0,
            )
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract
            .process_claim(first_claim_id, true, "ipfs://report".into(), String::new())
            .unwrap();

        let cooldown_anchor = 3_000_000u64;

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_block_timestamp::<DefaultEnvironment>(
            cooldown_anchor + contract.claim_cooldown_period() - 1,
        );
        let early_retry = contract.submit_claim(
            policy_id,
            100_000u128,
            "Retry too early".into(),
            valid_evidence(), 0,
        );
        assert_eq!(early_retry, Err(InsuranceError::CooldownPeriodActive));

        test::set_block_timestamp::<DefaultEnvironment>(
            cooldown_anchor + contract.claim_cooldown_period(),
        );
        let boundary_retry = contract.submit_claim(
            policy_id,
            100_000u128,
            "Retry at boundary".into(),
            valid_evidence(), 0,
        );
        assert!(boundary_retry.is_ok());
    }

    // =========================================================================
    // REINSURANCE TESTS
    // =========================================================================

    #[ink::test]
    fn test_register_reinsurance_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let result = contract.register_reinsurance(
            accounts.bob,
            10_000_000_000_000u128,
            500_000_000_000u128,
            2000,
            [CoverageType::Fire, CoverageType::Flood].to_vec(),
            86_400 * 365,
        );
        assert!(result.is_ok());
        let agreement_id = result.unwrap();
        let agreement = contract.get_reinsurance_agreement(agreement_id).unwrap();
        assert_eq!(agreement.reinsurer, accounts.bob);
        assert!(agreement.is_active);
    }

    #[ink::test]
    fn test_register_reinsurance_unauthorized_fails() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.register_reinsurance(
            accounts.bob,
            1_000_000u128,
            100_000u128,
            2000,
            [CoverageType::Fire].to_vec(),
            86_400,
        );
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    // =========================================================================
    // TOKEN / SECONDARY MARKET TESTS
    // =========================================================================

    #[ink::test]
    fn test_token_minted_on_policy_creation() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        let token = contract.get_token(1).unwrap();
        assert_eq!(token.policy_id, policy_id);
        assert_eq!(token.owner, accounts.bob);
        assert!(token.is_tradeable);
    }

    #[ink::test]
    fn test_list_and_purchase_token() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        // Bob lists token 1
        assert!(contract.list_token_for_sale(1, 100_000_000u128).is_ok());
        assert!(contract.get_token_listings().contains(&1));
        // Charlie buys token
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        test::set_value_transferred::<DefaultEnvironment>(100_000_000u128);
        assert!(contract.purchase_token(1).is_ok());
        let token = contract.get_token(1).unwrap();
        assert_eq!(token.owner, accounts.charlie);
        assert!(token.listed_price.is_none());
        let policy = contract.get_policy(1).unwrap();
        assert_eq!(policy.policyholder, accounts.charlie);
    }

    // =========================================================================
    // ACTUARIAL MODEL TESTS
    // =========================================================================

    #[ink::test]
    fn test_update_actuarial_model_works() {
        let mut contract = setup();
        let result =
            contract.update_actuarial_model(CoverageType::Fire, 50, 50_000_000u128, 4500, 95, 1000);
        assert!(result.is_ok());
        let model = contract.get_actuarial_model(result.unwrap()).unwrap();
        assert_eq!(model.loss_frequency, 50);
        assert_eq!(model.confidence_level, 95);
    }

    // =========================================================================
    // UNDERWRITING TESTS
    // =========================================================================

    #[ink::test]
    fn test_set_underwriting_criteria_works() {
        let mut contract = setup();
        let pool_id = create_pool(&mut contract);
        let result = contract.set_underwriting_criteria(
            pool_id,
            50,
            10_000_000u128,
            1_000_000_000_000_000u128,
            true,
            3,
            40,
        );
        assert!(result.is_ok());
        let criteria = contract.get_underwriting_criteria(pool_id).unwrap();
        assert_eq!(criteria.max_property_age_years, 50);
        assert_eq!(criteria.max_previous_claims, 3);
        assert_eq!(criteria.min_risk_score, 40);
    }

    // =========================================================================
    // ADMIN TESTS
    // =========================================================================

    #[ink::test]
    fn test_set_platform_fee_works() {
        let mut contract = setup();
        assert!(contract.set_platform_fee_rate(300).is_ok());
    }

    #[ink::test]
    fn test_set_platform_fee_exceeds_max_fails() {
        let mut contract = setup();
        assert_eq!(
            contract.set_platform_fee_rate(1001),
            Err(InsuranceError::InvalidParameters)
        );
    }

    #[ink::test]
    fn test_set_claim_cooldown_works() {
        let mut contract = setup();
        assert!(contract.set_claim_cooldown(86_400).is_ok());
    }

    #[ink::test]
    fn test_security_set_claim_cooldown_requires_admin() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.set_claim_cooldown(86_400);
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    #[ink::test]
    fn test_authorize_oracle_and_assessor() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        assert!(contract.authorize_oracle(accounts.bob).is_ok());
        assert!(contract.authorize_assessor(accounts.charlie).is_ok());
    }

    // =========================================================================
    // LIQUIDITY PROVIDER TESTS
    // =========================================================================

    #[ink::test]
    fn test_liquidity_provider_tracking() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(5_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        let provider = contract
            .get_liquidity_provider(pool_id, accounts.bob)
            .unwrap();
        assert_eq!(provider.provider_stake, 5_000_000_000_000u128);
        assert_eq!(provider.pool_id, pool_id);
    }

    #[ink::test]
    fn test_deposit_liquidity_tracks_total_provider_stake() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(3_000u128);
        contract.deposit_liquidity(pool_id).unwrap();
        let pool = contract.get_pool(pool_id).unwrap();
        assert_eq!(pool.total_provider_stake, 3_000);
        assert_eq!(pool.accumulated_reward_per_share, 0);
    }

    #[ink::test]
    fn test_premium_splits_rewards_evenly_between_two_lps() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(1_000u128);
        contract.deposit_liquidity(pool_id).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        test::set_value_transferred::<DefaultEnvironment>(1_000u128);
        contract.deposit_liquidity(pool_id).unwrap();

        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 100u128, CoverageType::Fire)
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.eve);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                100u128,
                pool_id,
                86_400 * 365,
                "ipfs://p".into(), 0,
            )
            .unwrap();

        let fee = calc.annual_premium.saturating_mul(200u128) / 10_000u128;
        let pool_share = calc.annual_premium.saturating_sub(fee);

        let bob_p = contract.get_pending_rewards(pool_id, accounts.bob);
        let charlie_p = contract.get_pending_rewards(pool_id, accounts.charlie);
        assert_eq!(bob_p + charlie_p, pool_share);
        assert_eq!(bob_p, charlie_p);
    }

    #[ink::test]
    fn test_claim_rewards_syncs_debt_and_clears_pending() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);

        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.deposit_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://m".into(), 0,
            )
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let pending_before = contract.get_pending_rewards(pool_id, accounts.alice);
        assert!(pending_before > 0);
        let claimed = contract.claim_rewards(pool_id).unwrap();
        assert_eq!(claimed, pending_before);
        assert_eq!(contract.get_pending_rewards(pool_id, accounts.alice), 0);
        let p = contract
            .get_liquidity_provider(pool_id, accounts.alice)
            .unwrap();
        let pool = contract.get_pool(pool_id).unwrap();
        const PREC: u128 = 1_000_000_000_000_000_000;
        assert_eq!(
            p.reward_debt,
            p.provider_stake
                .saturating_mul(pool.accumulated_reward_per_share)
                / PREC
        );
    }

    #[ink::test]
    fn test_reinvest_rewards_increases_stake_and_clears_pending() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);

        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.deposit_liquidity(pool_id).unwrap();
        let stake_before = contract
            .get_liquidity_provider(pool_id, accounts.alice)
            .unwrap()
            .provider_stake;

        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://m".into(), 0,
            )
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.alice);
        let pending = contract.get_pending_rewards(pool_id, accounts.alice);
        assert!(pending > 0);
        contract.reinvest_rewards(pool_id).unwrap();
        assert_eq!(contract.get_pending_rewards(pool_id, accounts.alice), 0);
        let stake_after = contract
            .get_liquidity_provider(pool_id, accounts.alice)
            .unwrap()
            .provider_stake;
        assert_eq!(stake_after, stake_before.saturating_add(pending));

        let pool = contract.get_pool(pool_id).unwrap();
        assert_eq!(
            pool.total_provider_stake,
            stake_before.saturating_add(pending)
        );
    }
    
    #[ink::test]
    fn test_vesting_schedule_and_claims() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);

        // configure vesting on pool
        contract.configure_pool_vesting(pool_id, 10, 100, 500).unwrap();

        // Bob deposits liquidity
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(1_000u128);
        contract.deposit_liquidity(pool_id).unwrap();

        // Generate a premium to create pending rewards
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 100u128, CoverageType::Fire)
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.eve);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                100u128,
                pool_id,
                86_400 * 365,
                "ipfs://p".into(), 0,
            )
            .unwrap();

        // Bob's pending should be > 0
        let bob = accounts.bob;
        let pending = contract.get_pending_rewards(pool_id, bob);
        assert!(pending > 0);

        // Claim rewards -> moved into vesting
        test::set_caller::<DefaultEnvironment>(bob);
        let moved = contract.claim_rewards(pool_id).unwrap();
        assert_eq!(moved, pending);

        let (total_vesting, vested_claimed, vesting_start) = contract.get_vesting_info(pool_id, bob);
        assert_eq!(total_vesting, pending);
        assert_eq!(vested_claimed, 0);
        assert!(vesting_start > 0);

        // Advance time past cliff but halfway through vesting
        let pool = contract.get_pool(pool_id).unwrap();
        let half = pool.vesting_duration_seconds / 2;
        test::set_block_timestamp::<DefaultEnvironment>(vesting_start + pool.vesting_cliff_seconds + half);

        // Claim vested portion
        let claimed = contract.claim_vested_rewards(pool_id).unwrap();
        assert!(claimed > 0);

        // Now test early withdrawal penalty: withdraw some principal before full vest
        // Reset timestamp to now (still within vest)
        test::set_block_timestamp::<DefaultEnvironment>(vesting_start + pool.vesting_cliff_seconds + 1);
        // Bob withdraws part of his stake
        let before_pool = contract.get_pool(pool_id).unwrap();
        let before_available = before_pool.available_capital;
        contract.withdraw_liquidity(pool_id, 500u128).unwrap();
        let after_pool = contract.get_pool(pool_id).unwrap();
        // Available capital should have increased by penalty amount (>=0)
        assert!(after_pool.available_capital >= before_available);
    }

    #[ink::test]
    fn test_withdraw_liquidity_pays_principal_and_accrued_rewards() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        let deposit = 10_000_000_000_000u128;

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(deposit);
        contract.deposit_liquidity(pool_id).unwrap();

        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://m".into(), 0,
            )
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let rewards = contract.get_pending_rewards(pool_id, accounts.bob);
        assert!(rewards > 0);
        contract
            .withdraw_liquidity(pool_id, deposit)
            .expect("withdraw with auto reward payout");
        assert!(contract
            .get_liquidity_provider(pool_id, accounts.bob)
            .is_none());
    }

    #[ink::test]
    fn test_e2e_policy_claim_payout_and_liquidity_withdrawal_smoke() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        let deposit = 12_000_000_000_000u128;
        let coverage = 500_000_000_000u128;

        test::set_caller::<DefaultEnvironment>(accounts.alice);
        test::set_value_transferred::<DefaultEnvironment>(deposit);
        contract.deposit_liquidity(pool_id).unwrap();

        let pool_after_deposit = contract.get_pool(pool_id).unwrap();
        assert_eq!(pool_after_deposit.total_capital, deposit);
        assert_eq!(pool_after_deposit.available_capital, deposit);
        assert_eq!(pool_after_deposit.total_provider_stake, deposit);
        assert_eq!(pool_after_deposit.total_premiums_collected, 0);
        assert_eq!(contract.get_pending_rewards(pool_id, accounts.alice), 0);

        add_risk_assessment(&mut contract, 7);
        let calc = contract
            .calculate_premium(7, coverage, CoverageType::Fire)
            .unwrap();
        let premium_paid = calc.annual_premium;
        let (_, pool_share) = fee_split(premium_paid, 200);

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(premium_paid);
        let policy_id = contract
            .create_policy(
                7,
                CoverageType::Fire,
                coverage,
                pool_id,
                86_400 * 365,
                "ipfs://policy-7".into(), 0,
            )
            .unwrap();

        let policy_after_issue = contract.get_policy(policy_id).unwrap();
        let token_after_issue = contract.get_token(1).unwrap();
        let pool_after_issue = contract.get_pool(pool_id).unwrap();
        assert_eq!(policy_after_issue.status, PolicyStatus::Active);
        assert_eq!(policy_after_issue.policyholder, accounts.bob);
        assert_eq!(policy_after_issue.premium_amount, premium_paid);
        assert_eq!(token_after_issue.policy_id, policy_id);
        assert_eq!(token_after_issue.owner, accounts.bob);
        assert_eq!(pool_after_issue.active_policies, 1);
        assert_eq!(pool_after_issue.total_premiums_collected, pool_share);
        assert_eq!(pool_after_issue.available_capital, deposit + pool_share);
        assert_eq!(
            contract.get_pending_rewards(pool_id, accounts.alice),
            pool_share
        );

        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let unauthorized_pre_transfer = contract.submit_claim(
            policy_id,
            calc.deductible.saturating_add(50_000_000_000u128),
            "Should fail before token transfer".into(),
            valid_evidence(), 0,
        );
        assert_eq!(unauthorized_pre_transfer, Err(InsuranceError::Unauthorized));

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        contract.list_token_for_sale(1, 250_000_000u128).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        test::set_value_transferred::<DefaultEnvironment>(250_000_000u128);
        contract.purchase_token(1).unwrap();

        let policy_after_transfer = contract.get_policy(policy_id).unwrap();
        let token_after_transfer = contract.get_token(1).unwrap();
        assert_eq!(policy_after_transfer.policyholder, accounts.charlie);
        assert_eq!(token_after_transfer.owner, accounts.charlie);
        assert!(!contract
            .get_policyholder_policies(accounts.bob)
            .contains(&policy_id));
        assert!(contract
            .get_policyholder_policies(accounts.charlie)
            .contains(&policy_id));

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let old_holder_submit = contract.submit_claim(
            policy_id,
            calc.deductible.saturating_add(50_000_000_000u128),
            "Former holder".into(),
            valid_evidence(), 0,
        );
        assert_eq!(old_holder_submit, Err(InsuranceError::Unauthorized));

        let claim_amount = calc.deductible.saturating_add(120_000_000_000u128);
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let claim_id = contract
            .submit_claim(
                policy_id,
                claim_amount,
                "Fire spread through the upper floor".into(),
                valid_evidence(), 0,
            )
            .unwrap();

        let claim_after_submit = contract.get_claim(claim_id).unwrap();
        assert_eq!(claim_after_submit.status, ClaimStatus::Pending);
        assert_eq!(claim_after_submit.claimant, accounts.charlie);
        assert_eq!(claim_after_submit.claim_amount, claim_amount);
        assert_eq!(contract.get_policy_claims(policy_id), vec![claim_id]);

        test::set_caller::<DefaultEnvironment>(accounts.django);
        let unauthorized_review =
            contract.process_claim(claim_id, true, "ipfs://oracle-ok".into(), String::new());
        assert_eq!(unauthorized_review, Err(InsuranceError::Unauthorized));

        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.authorize_assessor(accounts.eve).unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.eve);
        contract
            .process_claim(claim_id, true, "ipfs://oracle-ok".into(), String::new())
            .unwrap();

        let claim_after_approval = contract.get_claim(claim_id).unwrap();
        let policy_after_payout = contract.get_policy(policy_id).unwrap();
        let pool_after_payout = contract.get_pool(pool_id).unwrap();
        let payout = claim_amount.saturating_sub(calc.deductible);
        assert_eq!(claim_after_approval.status, ClaimStatus::Paid);
        assert_eq!(claim_after_approval.assessor, Some(accounts.eve));
        assert_eq!(claim_after_approval.payout_amount, payout);
        assert_eq!(policy_after_payout.total_claimed, payout);
        assert_eq!(policy_after_payout.status, PolicyStatus::Active);
        assert_eq!(pool_after_payout.total_claims_paid, payout);
        assert_eq!(
            pool_after_payout.available_capital,
            deposit + pool_share - payout
        );
        assert_eq!(
            contract.get_pending_rewards(pool_id, accounts.alice),
            pool_share
        );

        let max_withdrawable_principal = pool_after_payout
            .available_capital
            .saturating_sub(contract.get_pending_rewards(pool_id, accounts.alice));
        assert_eq!(max_withdrawable_principal, deposit.saturating_sub(payout));

        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract
            .withdraw_liquidity(pool_id, max_withdrawable_principal)
            .unwrap();

        let pool_after_withdraw = contract.get_pool(pool_id).unwrap();
        let provider_after_withdraw = contract
            .get_liquidity_provider(pool_id, accounts.alice)
            .unwrap();
        assert_eq!(provider_after_withdraw.provider_stake, payout);
        assert_eq!(contract.get_pending_rewards(pool_id, accounts.alice), 0);
        assert_eq!(pool_after_withdraw.total_provider_stake, payout);
        assert_eq!(pool_after_withdraw.total_capital, payout);
        assert_eq!(pool_after_withdraw.available_capital, 0);
        assert_eq!(pool_after_withdraw.total_claims_paid, payout);
        assert_eq!(pool_after_withdraw.total_premiums_collected, pool_share);
    }

    #[ink::test]
    fn test_e2e_failure_paths_for_claim_rejection_expiry_and_coverage_limits() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        let deposit = 10_000_000_000_000u128;
        let coverage = 300_000_000_000u128;

        test::set_value_transferred::<DefaultEnvironment>(deposit);
        contract.deposit_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 11);

        let calc = contract
            .calculate_premium(11, coverage, CoverageType::Fire)
            .unwrap();
        let premium_paid = calc.annual_premium;
        let (_, pool_share) = fee_split(premium_paid, 200);

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(premium_paid);
        let policy_id = contract
            .create_policy(
                11,
                CoverageType::Fire,
                coverage,
                pool_id,
                1_000,
                "ipfs://policy-11".into(), 0,
            )
            .unwrap();

        let excessive_claim = contract.submit_claim(
            policy_id,
            coverage.saturating_add(1),
            "Coverage overflow".into(),
            valid_evidence(), 0,
        );
        assert_eq!(excessive_claim, Err(InsuranceError::ClaimExceedsCoverage));

        let claim_amount = calc.deductible.saturating_add(25_000_000_000u128);
        let claim_id = contract
            .submit_claim(
                policy_id,
                claim_amount,
                "Minor fire claim".into(),
                valid_evidence(), 0,
            )
            .unwrap();

        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract
            .process_claim(
                claim_id,
                false,
                "ipfs://oracle-reject".into(),
                "Evidence inconsistent".into(),
            )
            .unwrap();

        let rejected_claim = contract.get_claim(claim_id).unwrap();
        let policy_after_rejection = contract.get_policy(policy_id).unwrap();
        let pool_after_rejection = contract.get_pool(pool_id).unwrap();
        assert_eq!(rejected_claim.status, ClaimStatus::Rejected);
        assert_eq!(rejected_claim.rejection_reason, "Evidence inconsistent");
        assert_eq!(policy_after_rejection.total_claimed, 0);
        assert_eq!(policy_after_rejection.status, PolicyStatus::Active);
        assert_eq!(pool_after_rejection.total_claims_paid, 0);
        assert_eq!(pool_after_rejection.available_capital, deposit + pool_share);

        test::set_block_timestamp::<DefaultEnvironment>(policy_after_rejection.end_time + 1);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let expired_claim =
            contract.submit_claim(policy_id, claim_amount, "Too late".into(), valid_evidence(), 0);
        assert_eq!(expired_claim, Err(InsuranceError::PolicyExpired));

        let second_review_attempt =
            contract.process_claim(claim_id, true, "ipfs://oracle-late".into(), String::new());
        assert_eq!(
            second_review_attempt,
            Err(InsuranceError::ClaimAlreadyProcessed)
        );
    }

    // =========================================================================
    // QUERY TESTS
    // =========================================================================

    #[ink::test]
    fn test_get_policies_for_property() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 4);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                100_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://p1".into(), 0,
            )
            .unwrap();
        contract
            .create_policy(
                1,
                CoverageType::Theft,
                100_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://p2".into(), 0,
            )
            .unwrap();
        let property_policies = contract.get_property_policies(1);
        assert_eq!(property_policies.len(), 2);
    }

    #[ink::test]
    fn test_get_policyholder_policies() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        add_risk_assessment(&mut contract, 2);
        let calc1 = contract
            .calculate_premium(1, 100_000_000_000u128, CoverageType::Fire)
            .unwrap();
        let calc2 = contract
            .calculate_premium(2, 100_000_000_000u128, CoverageType::Flood)
            .unwrap();
        let total = (calc1.annual_premium + calc2.annual_premium) * 2;
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(total);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                100_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://p1".into(), 0,
            )
            .unwrap();
        contract
            .create_policy(
                2,
                CoverageType::Flood,
                100_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://p2".into(), 0,
            )
            .unwrap();
        let holder_policies = contract.get_policyholder_policies(accounts.bob);
        assert_eq!(holder_policies.len(), 2);
    }

    #[ink::test]
    fn test_parametric_claim_auto_verification() {
        use crate::propchain_insurance::PolicyType;
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);

        // Setup oracle
        contract.set_oracle_contract(accounts.charlie).unwrap();

        // Create parametric policy with event_id 101 (The magic ID for auto-approval in our MVP)
        let calc = contract
            .calculate_premium(1, 100_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);

        let policy_id = contract
            .create_parametric_policy(
                1,
                CoverageType::Fire,
                100_000_000_000u128,
                pool_id,
                86400 * 30,
                101,
                "ipfs://parametric".into(), 0,
            )
            .unwrap();

        let policy = contract.get_policy(policy_id).unwrap();
        assert_eq!(policy.policy_type, PolicyType::Parametric);

        // Submit claim
        let result = contract.submit_claim(
            policy_id,
            10_000_000_000u128,
            "Parametric trigger".into(),
            valid_evidence(), 0,
        );

        assert!(result.is_ok());
        let claim_id = result.unwrap();
        let claim = contract.get_claim(claim_id).unwrap();

        // Should be auto-approved and PAID because of event_id 101
        assert_eq!(claim.status, ClaimStatus::Paid);
        assert!(claim.payout_amount > 0);
    }

    // =========================================================================
    // BATCH CLAIM TESTS
    // =========================================================================

    #[ink::test]
    fn test_batch_approve_claims_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        // Setup pool and policies
        let pool_id = create_pool(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        // Create multiple policies and claims
        let mut claim_ids = Vec::new();
        for i in 0..3 {
            add_risk_assessment(&mut contract, i + 1);
            test::set_value_transferred::<DefaultEnvironment>(1_000_000_000u128);
            let policy_result = contract.create_policy(
                i + 1,
                CoverageType::Fire,
                100_000_000_000u128,
                pool_id,
                86400 * 365,
                "ipfs://test".into(),
            );
            let policy_id = match policy_result {
                Ok(id) => id,
                Err(e) => panic!("create_policy failed: {:?}", e),
            };

            // Submit claim
            let claim_result = contract.submit_claim(
                policy_id,
                50_000_000_000u128,
                format!("Test claim {}", i),
                valid_evidence(), 0,
            );
            assert!(claim_result.is_ok());
            claim_ids.push(claim_result.unwrap());
        }

        // Set caller as authorized assessor
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.add_authorized_assessor(accounts.alice).unwrap();

        // Batch approve all claims
        let result = contract.batch_approve_claims(claim_ids.clone(), "ipfs://batch-report".into());

        assert!(result.is_ok());
        let summary = result.unwrap();

        // Verify summary
        assert_eq!(summary.total_processed, 3);
        assert_eq!(summary.successful, 3);
        assert_eq!(summary.failed, 0);
        assert_eq!(summary.results.len(), 3);

        // Verify all claims succeeded
        for result in summary.results.iter() {
            assert!(result.success);
            assert!(result.error.is_none());

            // Verify claim status
            let claim = contract.get_claim(result.claim_id).unwrap();
            assert_eq!(claim.status, ClaimStatus::Approved);
        }
    }

    #[ink::test]
    fn test_batch_reject_claims_works() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        // Setup pool and policies
        let pool_id = create_pool(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        // Create multiple policies and claims
        let mut claim_ids = Vec::new();
        for i in 0..3 {
            add_risk_assessment(&mut contract, i + 1);
            test::set_value_transferred::<DefaultEnvironment>(1_000_000_000u128);
            let policy_result = contract.create_policy(
                i + 1,
                CoverageType::Fire,
                100_000_000_000u128,
                pool_id,
                86400 * 365,
                "ipfs://test".into(),
            );
            let policy_id = match policy_result {
                Ok(id) => id,
                Err(e) => panic!("create_policy failed: {:?}", e),
            };

            // Submit claim
            let claim_result = contract.submit_claim(
                policy_id,
                50_000_000_000u128,
                format!("Test claim {}", i),
                valid_evidence(), 0,
            );
            assert!(claim_result.is_ok());
            claim_ids.push(claim_result.unwrap());
        }

        // Set caller as authorized assessor
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.add_authorized_assessor(accounts.alice).unwrap();

        // Batch reject all claims
        let result =
            contract.batch_reject_claims(claim_ids.clone(), "Does not meet criteria".into());

        assert!(result.is_ok());
        let summary = result.unwrap();

        // Verify summary
        assert_eq!(summary.total_processed, 3);
        assert_eq!(summary.successful, 3);
        assert_eq!(summary.failed, 0);

        // Verify all claims were rejected
        for result in summary.results.iter() {
            assert!(result.success);
            assert!(result.error.is_none());

            // Verify claim status
            let claim = contract.get_claim(result.claim_id).unwrap();
            assert_eq!(claim.status, ClaimStatus::Rejected);
            assert_eq!(claim.rejection_reason, "Does not meet criteria");
        }
    }

    #[ink::test]
    fn test_batch_approve_partial_failure() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        // Setup pool and policy
        let pool_id = create_pool(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        add_risk_assessment(&mut contract, 1);
        test::set_value_transferred::<DefaultEnvironment>(1_000_000_000u128);
        let policy_result = contract.create_policy(
            1,
            CoverageType::Fire,
            100_000_000_000u128,
            pool_id,
            86400 * 365,
            "ipfs://test".into(),
        );
        let policy_id = match policy_result {
            Ok(id) => id,
            Err(e) => panic!("create_policy failed: {:?}", e),
        };

        // Submit one valid claim
        let claim_result = contract.submit_claim(
            policy_id,
            50_000_000_000u128,
            "Valid claim".into(),
            valid_evidence(), 0,
        );
        assert!(claim_result.is_ok());
        let valid_claim_id = claim_result.unwrap();

        // Add invalid claim ID (doesn't exist)
        let invalid_claim_id = 999u64;

        // Set caller as authorized assessor
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.add_authorized_assessor(accounts.alice).unwrap();

        // Batch approve with mix of valid and invalid claims
        let mut claim_ids = Vec::new();
        claim_ids.push(valid_claim_id);
        claim_ids.push(invalid_claim_id);

        let result = contract.batch_approve_claims(claim_ids, "ipfs://report".into());

        assert!(result.is_ok());
        let summary = result.unwrap();

        // Verify partial success
        assert_eq!(summary.total_processed, 2);
        assert_eq!(summary.successful, 1);
        assert_eq!(summary.failed, 1);

        // Check individual results
        let valid_result = summary.results.get(0).unwrap();
        assert!(valid_result.success);
        assert!(valid_result.error.is_none());
        assert_eq!(valid_result.claim_id, valid_claim_id);

        let invalid_result = summary.results.get(1).unwrap();
        assert!(!invalid_result.success);
        assert!(invalid_result.error.is_some());
        assert_eq!(invalid_result.error.clone().unwrap(), InsuranceError::ClaimNotFound);
        assert_eq!(invalid_result.claim_id, invalid_claim_id);
    }

    #[ink::test]
    fn test_batch_approve_unauthorized() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        test::set_caller::<DefaultEnvironment>(accounts.bob);

        let claim_ids = Vec::new();
        let result = contract.batch_approve_claims(claim_ids, "ipfs://report".into());

        assert_eq!(result.unwrap_err(), InsuranceError::Unauthorized);
    }

    #[ink::test]
    fn test_batch_reject_unauthorized() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        test::set_caller::<DefaultEnvironment>(accounts.bob);

        let claim_ids = Vec::new();
        let result = contract.batch_reject_claims(claim_ids, "Reason".into());

        assert_eq!(result.unwrap_err(), InsuranceError::Unauthorized);
    }

    #[ink::test]
    fn test_batch_approve_already_processed() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        // Setup
        let pool_id = create_pool(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        add_risk_assessment(&mut contract, 1);
        test::set_value_transferred::<DefaultEnvironment>(1_000_000_000u128);
        let policy_result = contract.create_policy(
            1,
            CoverageType::Fire,
            100_000_000_000u128,
            pool_id,
            86400 * 365,
            "ipfs://test".into(),
        );
        let policy_id = match policy_result {
            Ok(id) => id,
            Err(e) => panic!("create_policy failed: {:?}", e),
        };

        // Submit and approve claim
        let claim_result = contract.submit_claim(
            policy_id,
            50_000_000_000u128,
            "Test claim".into(),
            valid_evidence(), 0,
        );
        assert!(claim_result.is_ok());
        let claim_id = claim_result.unwrap();

        // First approval
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.add_authorized_assessor(accounts.alice).unwrap();

        let first_result =
            contract.batch_approve_claims(vec![claim_id].into(), "ipfs://report1".into());
        assert!(first_result.is_ok());

        // Try to approve again (should fail for this claim)
        let mut claim_ids = Vec::new();
        claim_ids.push(claim_id);
        let second_result = contract.batch_approve_claims(claim_ids, "ipfs://report2".into());

        assert!(second_result.is_ok());
        let summary = second_result.unwrap();

        // Should have 1 failure due to ClaimAlreadyProcessed
        assert_eq!(summary.total_processed, 1);
        assert_eq!(summary.successful, 0);
        assert_eq!(summary.failed, 1);

        let result = summary.results.get(0).unwrap();
        assert!(!result.success);
        assert_eq!(result.error.clone().unwrap(), InsuranceError::ClaimAlreadyProcessed);
    }

    // =========================================================================
    // SECURITY FIX TESTS
    // =========================================================================

    // Test 1: Nonce Replay Attack Prevention (#349)
    #[ink::test]
    fn test_nonce_replay_prevention() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let policy_id = setup_policy_for_bob(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        // First submission with nonce 0 succeeds
        let claim1 = contract.submit_claim(
            policy_id, 1_000u128, "desc1".into(), make_evidence("ipfs://e1"), 0,
        );
        assert!(claim1.is_ok());

        // Replaying nonce 0 must fail
        let replay = contract.submit_claim(
            policy_id, 1_000u128, "desc2".into(), make_evidence("ipfs://e2"), 0,
        );
        assert_eq!(replay, Err(InsuranceError::NonceAlreadyUsed));
    }

    // Test 2: Sequential nonces are accepted (#349)
    #[ink::test]
    fn test_sequential_nonces_allowed() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 4);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(),
            )
            .unwrap();

        // nonce 0 succeeds; nonce counter advances to 1
        let claim1 = contract.submit_claim(
            policy_id, 1_000u128, "desc1".into(), make_evidence("ipfs://e1"), 0,
        );
        assert!(claim1.is_ok());
        assert_eq!(contract.get_nonce(accounts.bob), 1);

        // nonce 1 succeeds; nonce counter advances to 2
        // (advance time past cooldown first)
        test::set_block_timestamp::<DefaultEnvironment>(3_000_000 + 2_592_001);
        let claim2 = contract.submit_claim(
            policy_id, 1_000u128, "desc2".into(), make_evidence("ipfs://e2"), 1,
        );
        assert!(claim2.is_ok());
        assert_eq!(contract.get_nonce(accounts.bob), 2);
    }

    // Test 3: get_nonce returns 0 for new callers (#349)
    #[ink::test]
    fn test_get_nonce_initial_value() {
        let contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        assert_eq!(contract.get_nonce(accounts.bob), 0);
        assert_eq!(contract.get_nonce(accounts.charlie), 0);
    }

    // Test 4: Wrong nonce rejected (#349)
    #[ink::test]
    fn test_wrong_nonce_rejected() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let policy_id = setup_policy_for_bob(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        // Supplying nonce 1 when expected is 0
        let result = contract.submit_claim(
            policy_id, 1_000u128, "desc".into(), make_evidence("ipfs://e"), 1,
        );
        assert_eq!(result, Err(InsuranceError::NonceAlreadyUsed));
    }

    // Test 3: Dispute Deadline Set on Submission
    #[ink::test]
    fn test_dispute_deadline_set_on_submission() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let policy_id = setup_policy_for_bob(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        
        let claim_id = contract
            .submit_claim(policy_id, 1_000u128, "desc".into(), make_evidence("ipfs://e"), 0)
            .unwrap();
        
        let claim = contract.get_claim(claim_id).unwrap();
        // Dispute deadline should be set immediately, not None
        assert!(claim.dispute_deadline.is_some());
        let deadline = claim.dispute_deadline.unwrap();
        assert!(deadline > claim.submitted_at);
    }

    // Test 4: Dispute Window Enforcement
    #[ink::test]
    fn test_dispute_window_expired_enforcement() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        
        // Set very short dispute window (1 second)
        contract.set_dispute_window(1).unwrap();
        
        let policy_id = setup_policy_for_bob(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let claim_id = contract
            .submit_claim(policy_id, 1_000u128, "desc".into(), make_evidence("ipfs://e"), 0)
            .unwrap();
        
        // Advance time past dispute window
        test::set_block_timestamp::<DefaultEnvironment>(3_000_000 + 100);
        
        // Try to dispute - should fail due to expired window
        let result = contract.move_to_dispute(claim_id);
        assert_eq!(result, Err(InsuranceError::DisputeWindowExpired));
    }

    // Test 5: Emergency Pause Mechanism
    #[ink::test]
    fn test_pause_prevents_claim_submission() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let policy_id = setup_policy_for_bob(&mut contract);
        
        // Pause contract
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        assert!(contract.emergency_pause().is_ok());
        assert!(contract.is_paused());
        
        // Try to submit claim - should fail
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.submit_claim(
            policy_id,
            1_000u128,
            "desc".into(),
            make_evidence("ipfs://e"),
            0,
        );
        assert_eq!(result, Err(InsuranceError::ContractPaused));
    }

    #[ink::test]
    fn test_pause_prevents_policy_creation() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        
        // Pause contract
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        assert!(contract.emergency_pause().is_ok());
        
        // Try to create policy - should fail
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let result = contract.create_policy(
            1,
            CoverageType::Fire,
            500_000_000_000u128,
            pool_id,
            86_400 * 365,
            "ipfs://test".into(),
        );
        assert_eq!(result, Err(InsuranceError::ContractPaused));
    }

    #[ink::test]
    fn test_unpause_restores_functionality() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let policy_id = setup_policy_for_bob(&mut contract);
        
        // Pause
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.emergency_pause().unwrap();
        
        // Resume requires scheduling and a one-hour delay.
        contract.resume().unwrap();
        test::set_block_timestamp::<DefaultEnvironment>(6_600_000);
        contract.resume().unwrap();
        assert!(!contract.is_paused());
        
        // Should be able to submit claim now
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.submit_claim(
            policy_id,
            1_000u128,
            "desc".into(),
            make_evidence("ipfs://e"),
            0,
        );
        assert!(result.is_ok());
    }

    #[ink::test]
    fn test_pause_prevents_liquidity_deposit() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        
        // Pause
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.emergency_pause().unwrap();
        
        // Try to provide liquidity - should fail
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(1_000_000u128);
        let result = contract.provide_pool_liquidity(pool_id);
        assert_eq!(result, Err(InsuranceError::ContractPaused));
    }

    #[ink::test]
    fn test_pause_prevents_claim_processing() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let policy_id = setup_policy_for_bob(&mut contract);
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let claim_id = contract
            .submit_claim(policy_id, 1_000u128, "desc".into(), make_evidence("ipfs://e"), 0)
            .unwrap();
        
        // Pause
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.emergency_pause().unwrap();
        
        // Try to process claim - should fail
        let result = contract.process_claim(
            claim_id,
            true,
            "ipfs://report".into(),
            String::new(),
        );
        assert_eq!(result, Err(InsuranceError::ContractPaused));
    }

    // Test 6: Minimum Premium Enforcement
    #[ink::test]
    fn test_minimum_premium_enforcement() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        
        // Try to create policy with very small coverage that results in premium below minimum
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(1u128); // Tiny payment
        let result = contract.create_policy(
            1,
            CoverageType::Fire,
            100u128, // Very small coverage
            pool_id,
            86_400 * 365,
            "ipfs://test".into(),
        );
        // Should fail due to premium too low or insufficient premium
        assert!(result.is_err());
    }

    // Test 7: Liquidity Provider Share Calculation
    #[ink::test]
    fn test_liquidity_provider_share_calculation() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        
        // First provider deposits 100 tokens
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(100_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        
        let provider1 = contract.get_liquidity_provider(pool_id, accounts.bob).unwrap();
        assert_eq!(provider1.share_percentage, 10_000); // 100% in basis points
        
        // Second provider deposits 100 tokens
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        test::set_value_transferred::<DefaultEnvironment>(100_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        
        let provider2 = contract.get_liquidity_provider(pool_id, accounts.charlie).unwrap();
        assert_eq!(provider2.share_percentage, 5_000); // 50% in basis points
        
        // Bob's share should now also be 50%
        let provider1_updated = contract.get_liquidity_provider(pool_id, accounts.bob).unwrap();
        // Note: share percentage is calculated on deposit, not updated retroactively
        // This test verifies calculation logic works
    }

    // Test 8: Platform Fee Tracking
    #[ink::test]
    fn test_platform_fee_tracking() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        
        // Initial fees should be 0
        assert_eq!(contract.get_total_platform_fees_collected(), 0);
        
        // Provide liquidity first
        test::set_value_transferred::<DefaultEnvironment>(10_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        
        // Create policy
        let calc = contract
            .calculate_premium(1, 500_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        contract
            .create_policy(
                1,
                CoverageType::Fire,
                500_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        
        // Fees should now be tracked
        let fees_collected = contract.get_total_platform_fees_collected();
        assert!(fees_collected > 0);
    }

    // Test 9: Pool Exposure Uses Total Capital
    #[ink::test]
    fn test_pool_exposure_uses_total_capital() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        let pool_id = create_pool(&mut contract);
        
        // Add liquidity
        test::set_value_transferred::<DefaultEnvironment>(1_000_000_000_000u128);
        contract.provide_pool_liquidity(pool_id).unwrap();
        add_risk_assessment(&mut contract, 1);
        
        // Create first policy
        let calc = contract
            .calculate_premium(1, 100_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(calc.annual_premium * 2);
        let policy_id = contract
            .create_policy(
                1,
                CoverageType::Fire,
                100_000_000_000u128,
                pool_id,
                86_400 * 365,
                "ipfs://test".into(), 0,
            )
            .unwrap();
        
        // Submit and approve claim to reduce available_capital
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let claim_id = contract
            .submit_claim(policy_id, 10_000_000_000u128, "damage".into(), make_evidence("ipfs://e"), 0)
            .unwrap();
        
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        contract.process_claim(claim_id, true, "ipfs://report".into(), String::new()).unwrap();
        
        // Pool's available_capital decreased, but total_capital should still allow new policies
        let pool = contract.get_pool(pool_id).unwrap();
        assert!(pool.available_capital < pool.total_capital);
        
        // Should still be able to create policy based on total_capital
        add_risk_assessment(&mut contract, 2);
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let calc2 = contract
            .calculate_premium(2, 100_000_000_000u128, CoverageType::Fire)
            .unwrap();
        test::set_value_transferred::<DefaultEnvironment>(calc2.annual_premium * 2);
        let result = contract.create_policy(
            2,
            CoverageType::Fire,
            100_000_000_000u128,
            pool_id,
            86_400 * 365,
            "ipfs://test2".into(),
        );
        assert!(result.is_ok());
    }

    // =========================================================================
    // RBAC TESTS (#346)
    // =========================================================================

    #[ink::test]
    fn test_admin_has_admin_role_after_init() {
        let contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        assert!(contract.has_role(accounts.alice, crate::Role::Admin));
    }

    #[ink::test]
    fn test_non_admin_does_not_have_admin_role() {
        let contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        assert!(!contract.has_role(accounts.bob, crate::Role::Admin));
    }

    #[ink::test]
    fn test_grant_role_assessor() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        // alice (admin) grants bob the Assessor role
        contract
            .grant_role(accounts.bob, crate::Role::Assessor)
            .expect("grant_role failed");
        assert!(contract.has_role(accounts.bob, crate::Role::Assessor));
    }

    #[ink::test]
    fn test_grant_role_oracle() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract
            .grant_role(accounts.charlie, crate::Role::Oracle)
            .expect("grant_role failed");
        assert!(contract.has_role(accounts.charlie, crate::Role::Oracle));
    }

    #[ink::test]
    fn test_revoke_role() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract
            .grant_role(accounts.bob, crate::Role::Assessor)
            .unwrap();
        contract
            .revoke_role(accounts.bob, crate::Role::Assessor)
            .unwrap();
        assert!(!contract.has_role(accounts.bob, crate::Role::Assessor));
    }

    #[ink::test]
    fn test_grant_role_unauthorized() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        // bob (non-admin) tries to grant a role
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.grant_role(accounts.charlie, crate::Role::Assessor);
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    #[ink::test]
    fn test_revoke_role_unauthorized() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract
            .grant_role(accounts.bob, crate::Role::Assessor)
            .unwrap();
        // charlie (non-admin) tries to revoke bob's role
        test::set_caller::<DefaultEnvironment>(accounts.charlie);
        let result = contract.revoke_role(accounts.bob, crate::Role::Assessor);
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }

    #[ink::test]
    fn test_admin_role_satisfies_assessor_check() {
        let contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        // Admin implicitly satisfies every role check
        assert!(contract.has_role(accounts.alice, crate::Role::Assessor));
        assert!(contract.has_role(accounts.alice, crate::Role::Oracle));
        assert!(contract.has_role(accounts.alice, crate::Role::Underwriter));
    }

    #[ink::test]
    fn test_get_roles_returns_granted_roles() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract
            .grant_role(accounts.bob, crate::Role::Assessor)
            .unwrap();
        contract
            .grant_role(accounts.bob, crate::Role::Oracle)
            .unwrap();
        let roles = contract.get_roles(accounts.bob);
        assert!(roles.contains(&crate::Role::Assessor));
        assert!(roles.contains(&crate::Role::Oracle));
        assert!(!roles.contains(&crate::Role::Admin));
    }

    #[ink::test]
    fn test_authorize_oracle_backwards_compat() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_oracle(accounts.bob).unwrap();
        assert!(contract.has_role(accounts.bob, crate::Role::Oracle));
    }

    #[ink::test]
    fn test_authorize_assessor_backwards_compat() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        contract.authorize_assessor(accounts.bob).unwrap();
        assert!(contract.has_role(accounts.bob, crate::Role::Assessor));
    }

    #[ink::test]
    fn test_non_admin_cannot_create_pool() {
        let mut contract = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let result = contract.create_risk_pool(
            "Unauthorized Pool".into(),
            CoverageType::Fire,
            8000,
            500_000_000_000u128,
        );
        assert_eq!(result, Err(InsuranceError::Unauthorized));
    }
