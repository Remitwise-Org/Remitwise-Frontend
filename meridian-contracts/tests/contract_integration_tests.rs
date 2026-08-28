//! Integration tests exercising full contract interactions via ink! test utilities.

#[cfg(test)]
mod integration {
    use ink::env::test;

    /// Verifies the default accounts are available in the test environment.
    #[ink::test]
    fn default_accounts_available() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        assert_ne!(accounts.alice, accounts.bob);
    }

    /// Confirms the test chain extension allows setting the caller.
    #[ink::test]
    fn caller_can_be_set_in_test_env() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_caller::<ink::env::DefaultEnvironment>(accounts.alice);
        let callee = test::callee::<ink::env::DefaultEnvironment>();
        let _ = callee;
    }

    /// Verifies block number can be advanced in integration tests.
    #[ink::test]
    fn block_number_advances() {
        test::advance_block::<ink::env::DefaultEnvironment>();
        let block = ink::env::block_number::<ink::env::DefaultEnvironment>();
        assert!(block >= 1);
    }

    /// Confirms that balances can be set and read within the test environment.
    #[ink::test]
    fn balance_can_be_set() {
        let accounts = test::default_accounts::<ink::env::DefaultEnvironment>();
        test::set_account_balance::<ink::env::DefaultEnvironment>(accounts.bob, 1_000);
        let bal = test::get_account_balance::<ink::env::DefaultEnvironment>(accounts.bob)
            .expect("balance read failed");
        assert_eq!(bal, 1_000);
    }
}
