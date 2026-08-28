#[cfg(test)]
mod fractional_tests {
    use ink::env::{DefaultEnvironment, test};
    use crate::property_token::{PropertyToken, PropertyMetadata, Error};
    use ink::primitives::Hash;

    fn sample_metadata() -> PropertyMetadata {
        PropertyMetadata {
            location: String::from("Fractional Ave"),
            size: 1200,
            legal_description: String::from("Fractional Property"),
            valuation: 1_000_000,
            documents_url: String::from("ipfs://docs"),
        }
    }

    #[ink::test]
    fn test_issue_and_transfer_shares() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        let token_id = contract.register_property_with_token(sample_metadata()).unwrap();

        assert!(contract.issue_shares(token_id, accounts.alice, 1_000).is_ok());
        assert_eq!(contract.total_shares(token_id), 1_000);
        assert_eq!(contract.share_balance_of(accounts.alice, token_id), 1_000);

        assert!(contract.transfer_shares(accounts.alice, accounts.bob, token_id, 400).is_ok());
        assert_eq!(contract.share_balance_of(accounts.alice, token_id), 600);
        assert_eq!(contract.share_balance_of(accounts.bob, token_id), 400);
    }

    #[ink::test]
    fn test_dividends_flow() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        let token_id = contract.register_property_with_token(sample_metadata()).unwrap();

        assert!(contract.issue_shares(token_id, accounts.alice, 1_000).is_ok());
        assert!(contract.transfer_shares(accounts.alice, accounts.bob, token_id, 500).is_ok());

        test::set_value_transferred::<DefaultEnvironment>(1_000_000);
        assert!(contract.deposit_dividends(token_id).is_ok());

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        let withdrawn = contract.withdraw_dividends(token_id).unwrap();
        assert!(withdrawn > 0);
    }

    #[ink::test]
    fn test_trading_flow() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        let token_id = contract.register_property_with_token(sample_metadata()).unwrap();
        assert!(contract.issue_shares(token_id, accounts.alice, 2_000).is_ok());

        assert!(contract.place_ask(token_id, 10, 500).is_ok());

        test::set_caller::<DefaultEnvironment>(accounts.bob);
        test::set_value_transferred::<DefaultEnvironment>(5_000);
        assert!(contract.buy_shares(token_id, accounts.alice, 500).is_ok());
        assert_eq!(contract.share_balance_of(accounts.bob, token_id), 500);
        assert_eq!(contract.get_last_trade_price(token_id), Some(10));
    }

    #[ink::test]
    fn test_governance_flow() {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);

        let mut contract = PropertyToken::new();
        let token_id = contract.register_property_with_token(sample_metadata()).unwrap();
        assert!(contract.issue_shares(token_id, accounts.alice, 1_000).is_ok());

        let proposal_id = contract.create_proposal(token_id, 600, Hash::from([2u8; 32])).unwrap();
        assert!(contract.vote(token_id, proposal_id, true).is_ok());
        let executed = contract.execute_proposal(token_id, proposal_id).unwrap();
        assert!(executed);
    }
}

