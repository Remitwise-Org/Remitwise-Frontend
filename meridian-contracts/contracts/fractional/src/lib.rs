#![cfg_attr(not(feature = "std"), no_std, no_main)]

//! Fractional ownership contract for share-based property participation.


#[ink::contract]
mod fractional {
    use ink::prelude::vec::Vec;
    use ink::storage::Mapping;

    #[derive(
        Debug,
        Clone,
        PartialEq,
        Eq,
        scale::Encode,
        scale::Decode,
        ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct PortfolioItem {
        pub token_id: u64,
        pub shares: u128,
        pub price_per_share: u128,
    }

    #[derive(
        Debug,
        Clone,
        PartialEq,
        Eq,
        scale::Encode,
        scale::Decode,
        ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct PortfolioAggregation {
        pub total_value: u128,
        pub positions: Vec<(u64, u128, u128)>,
    }

    #[derive(
        Debug,
        Clone,
        PartialEq,
        Eq,
        scale::Encode,
        scale::Decode,
        ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct TaxReport {
        pub total_dividends: u128,
        pub total_proceeds: u128,
        pub transactions: u64,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        InsufficientBalance,
        Unauthorized,
        KycRequired,
        InvalidAmount,
        TokenNotFound,
        Overflow,
    }

    #[ink(event)]
    pub struct Transfer {
        #[ink(topic)]
        token_id: u64,
        #[ink(topic)]
        from: Option<AccountId>,
        #[ink(topic)]
        to: Option<AccountId>,
        amount: u128,
    }

    #[ink(event)]
    pub struct Mint {
        #[ink(topic)]
        token_id: u64,
        #[ink(topic)]
        to: AccountId,
        amount: u128,
    }

    #[ink(event)]
    pub struct Burn {
        #[ink(topic)]
        token_id: u64,
        #[ink(topic)]
        from: AccountId,
        amount: u128,
    }

    #[ink(event)]
    pub struct PriceUpdated {
        #[ink(topic)]
        token_id: u64,
        price_per_share: u128,
    }

    #[ink(event)]
    pub struct KycUpdated {
        #[ink(topic)]
        account: AccountId,
        passed: bool,
    }

    #[ink(event)]
    pub struct AuthorizedMinterSet {
        #[ink(topic)]
        token_id: u64,
        minter: AccountId,
    }

    #[ink(event)]
    pub struct GovernanceContractSet {
        governance_contract: AccountId,
    }

    #[ink(storage)]
    pub struct Fractional {
        last_prices: Mapping<u64, u128>,
        balances: Mapping<(u64, AccountId), u128>,
        total_supply: Mapping<u64, u128>,
        authorized_minters: Mapping<u64, AccountId>,
        kyc_passed: Mapping<AccountId, bool>,
        dividend_per_share: Mapping<u64, u128>,
        last_claimed_dividend_per_share: Mapping<(u64, AccountId), u128>,
        governance_contract: Option<AccountId>,
        admin: AccountId,
    }

    impl Fractional {
        /// Create an empty fractional ownership ledger with the deployer as admin.
        #[ink(constructor)]
        pub fn new() -> Self {
            Self {
                last_prices: Mapping::default(),
                balances: Mapping::default(),
                total_supply: Mapping::default(),
                authorized_minters: Mapping::default(),
                kyc_passed: Mapping::default(),
                dividend_per_share: Mapping::default(),
                last_claimed_dividend_per_share: Mapping::default(),
                governance_contract: None,
                admin: Self::env().caller(),
            }
        }

        /// Store the most recent observed share price for a property token.
        #[ink(message)]
        pub fn set_last_price(&mut self, token_id: u64, price_per_share: u128) {
            self.last_prices.insert(token_id, &price_per_share);
            self.env().emit_event(PriceUpdated { token_id, price_per_share });
        }

        /// Return the latest stored share price for a property token, if one exists.
        #[ink(message)]
        pub fn get_last_price(&self, token_id: u64) -> Option<u128> {
            self.last_prices.get(token_id)
        }

        /// Calculate a portfolio value using supplied prices or the contract's last stored prices.
        #[ink(message)]
        pub fn aggregate_portfolio(&self, items: Vec<PortfolioItem>) -> PortfolioAggregation {
            let mut total: u128 = 0;
            let mut positions: Vec<(u64, u128, u128)> = Vec::new();
            for it in items.iter() {
                let price = if it.price_per_share > 0 {
                    it.price_per_share
                } else {
                    self.last_prices.get(it.token_id).unwrap_or(0)
                };
                let value = price.saturating_mul(it.shares);
                total = total.saturating_add(value);
                positions.push((it.token_id, it.shares, price));
            }
            PortfolioAggregation {
                total_value: total,
                positions,
            }
        }

        /// Summarize taxable dividend and sale proceeds into a compact report.
        #[ink(message)]
        pub fn summarize_tax(
            &self,
            dividends: Vec<(u64, u128)>,
            proceeds: Vec<(u64, u128)>,
        ) -> TaxReport {
            let mut total_dividends: u128 = 0;
            for d in dividends.iter() {
                total_dividends = total_dividends.saturating_add(d.1);
            }
            let mut total_proceeds: u128 = 0;
            for p in proceeds.iter() {
                total_proceeds = total_proceeds.saturating_add(p.1);
            }
            TaxReport {
                total_dividends,
                total_proceeds,
                transactions: (dividends.len() + proceeds.len()) as u64,
            }
        }

        /// Mint fractional shares for an authorized token minter.
        #[ink(message)]
        pub fn mint(&mut self, token_id: u64, to: AccountId, amount: u128) -> Result<(), Error> {
            let caller = self.env().caller();
            let minter = self.authorized_minters.get(token_id).ok_or(Error::Unauthorized)?;
            if caller != minter {
                return Err(Error::Unauthorized);
            }
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let current_balance = self.balances.get((token_id, to)).unwrap_or(0);
            let new_balance = current_balance.checked_add(amount).ok_or(Error::Overflow)?;
            self.balances.insert((token_id, to), &new_balance);
            let current_supply = self.total_supply.get(token_id).unwrap_or(0);
            let new_supply = current_supply.checked_add(amount).ok_or(Error::Overflow)?;
            self.total_supply.insert(token_id, &new_supply);
            self.env().emit_event(Mint { token_id, to, amount });
            Ok(())
        }

        /// Burn fractional shares from an account controlled by the caller or admin.
        #[ink(message)]
        pub fn burn(&mut self, token_id: u64, from: AccountId, amount: u128) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != from && caller != self.admin {
                return Err(Error::Unauthorized);
            }
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let current_balance = self.balances.get((token_id, from)).unwrap_or(0);
            if current_balance < amount {
                return Err(Error::InsufficientBalance);
            }
            let new_balance = current_balance - amount;
            self.balances.insert((token_id, from), &new_balance);
            let current_supply = self.total_supply.get(token_id).unwrap_or(0);
            let new_supply = current_supply - amount;
            self.total_supply.insert(token_id, &new_supply);
            self.env().emit_event(Burn { token_id, from, amount });
            Ok(())
        }

        /// Transfer fractional shares between KYC-approved accounts.
        #[ink(message)]
        pub fn transfer(&mut self, token_id: u64, to: AccountId, amount: u128) -> Result<(), Error> {
            let from = self.env().caller();
            if !self.kyc_passed.get(from).unwrap_or(false) || !self.kyc_passed.get(to).unwrap_or(false) {
                return Err(Error::KycRequired);
            }
            if amount == 0 {
                return Err(Error::InvalidAmount);
            }
            let from_balance = self.balances.get((token_id, from)).unwrap_or(0);
            if from_balance < amount {
                return Err(Error::InsufficientBalance);
            }
            let to_balance = self.balances.get((token_id, to)).unwrap_or(0);
            let new_from_balance = from_balance - amount;
            let new_to_balance = to_balance.checked_add(amount).ok_or(Error::Overflow)?;
            self.balances.insert((token_id, from), &new_from_balance);
            self.balances.insert((token_id, to), &new_to_balance);
            self.env().emit_event(Transfer { token_id, from: Some(from), to: Some(to), amount });
            Ok(())
        }

        /// Return the fractional share balance for an account and token.
        #[ink(message)]
        pub fn balance_of(&self, token_id: u64, account: AccountId) -> u128 {
            self.balances.get((token_id, account)).unwrap_or(0)
        }

        /// Return the total fractional supply minted for a token.
        #[ink(message)]
        pub fn total_supply_of(&self, token_id: u64) -> u128 {
            self.total_supply.get(token_id).unwrap_or(0)
        }

        /// Add distributable dividends for a token based on current supply.
        #[ink(message)]
        pub fn distribute_dividends(&mut self, token_id: u64, total_dividend: u128) -> Result<(), Error> {
            let caller = self.env().caller();
            let minter = self.authorized_minters.get(token_id).ok_or(Error::Unauthorized)?;
            if caller != minter {
                return Err(Error::Unauthorized);
            }
            let supply = self.total_supply.get(token_id).unwrap_or(0);
            if supply == 0 {
                return Err(Error::InvalidAmount);
            }
            let dividend_per_share_add = total_dividend / supply;
            let current_dividend_per_share = self.dividend_per_share.get(token_id).unwrap_or(0);
            let new_dividend_per_share = current_dividend_per_share.checked_add(dividend_per_share_add).ok_or(Error::Overflow)?;
            self.dividend_per_share.insert(token_id, &new_dividend_per_share);
            Ok(())
        }

        /// Claim the caller's unclaimed dividends for a token.
        #[ink(message)]
        pub fn claim_dividends(&mut self, token_id: u64) -> Result<u128, Error> {
            let account = self.env().caller();
            let balance = self.balances.get((token_id, account)).unwrap_or(0);
            if balance == 0 {
                return Ok(0);
            }
            let current_dividend_per_share = self.dividend_per_share.get(token_id).unwrap_or(0);
            let last_claimed = self.last_claimed_dividend_per_share.get((token_id, account)).unwrap_or(0);
            let dividend_per_share = current_dividend_per_share.saturating_sub(last_claimed);
            let total_dividend = dividend_per_share.saturating_mul(balance);
            self.last_claimed_dividend_per_share.insert((token_id, account), &current_dividend_per_share);
            Ok(total_dividend)
        }

        /// Update KYC eligibility for an account; only the admin may call this.
        #[ink(message)]
        pub fn set_kyc(&mut self, account: AccountId, passed: bool) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }
            self.kyc_passed.insert(account, &passed);
            self.env().emit_event(KycUpdated { account, passed });
            Ok(())
        }

        /// Assign the account allowed to mint shares for a token.
        #[ink(message)]
        pub fn set_authorized_minter(&mut self, token_id: u64, minter: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }
            self.authorized_minters.insert(token_id, &minter);
            self.env().emit_event(AuthorizedMinterSet { token_id, minter });
            Ok(())
        }

        /// Store the governance contract that coordinates fractional ownership decisions.
        #[ink(message)]
        pub fn set_governance_contract(&mut self, gov_contract: AccountId) -> Result<(), Error> {
            let caller = self.env().caller();
            if caller != self.admin {
                return Err(Error::Unauthorized);
            }
            self.governance_contract = Some(gov_contract);
            self.env().emit_event(GovernanceContractSet { governance_contract: gov_contract });
            Ok(())
        }
    }
}
