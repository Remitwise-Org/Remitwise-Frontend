#![cfg_attr(not(feature = "std"), no_std)]
#![allow(dead_code)]

//! Upgradeable proxy contract for controlled implementation upgrades.


use propchain_traits::{UpgradeError, Upgradeable};

#[ink::contract]
mod propchain_proxy {

    /// Unique storage key for the proxy data to avoid collisions.
    /// bytes4(keccak256("proxy.storage")) = 0xc5f3bc7a
    #[allow(dead_code)]
    const PROXY_STORAGE_KEY: u32 = 0xC5F3BC7A;

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum Error {
        Unauthorized,
        UpgradeFailed,
    }

    #[ink(storage)]
    pub struct TransparentProxy {
        /// The code hash for the current implementation.
        code_hash: Hash,
        /// The address of the proxy admin.
        admin: AccountId,
    }

    #[ink(event)]
    pub struct Upgraded {
        #[ink(topic)]
        new_code_hash: Hash,
    }

    #[ink(event)]
    pub struct AdminChanged {
        #[ink(topic)]
        new_admin: AccountId,
    }

    impl TransparentProxy {
        /// Deploy the proxy with an initial implementation code hash and caller as admin.
        #[ink(constructor)]
        pub fn new(code_hash: Hash) -> Self {
            Self {
                code_hash,
                admin: Self::env().caller(),
            }
        }

        /// Transfer proxy administration to a new account after admin authorization.
        #[ink(message)]
        pub fn change_admin(&mut self, new_admin: AccountId) -> Result<(), Error> {
            self.ensure_admin()?;
            self.admin = new_admin;
            self.env().emit_event(AdminChanged { new_admin });
            Ok(())
        }

        /// Return the code hash for the current proxy implementation.
        #[ink(message)]
        pub fn code_hash(&self) -> Hash {
            self.code_hash
        }

        /// Return the account currently authorized to administer upgrades.
        #[ink(message)]
        pub fn admin(&self) -> AccountId {
            self.admin
        }

        /// Swap the implementation code hash and persist the new target when the admin approves.
        fn upgrade_code_hash(&mut self, new_code_hash: Hash) -> Result<(), Error> {
            self.ensure_admin()?;
            ink::env::set_code_hash(&new_code_hash).map_err(|_| Error::UpgradeFailed)?;
            self.code_hash = new_code_hash;
            self.env().emit_event(Upgraded { new_code_hash });
            Ok(())
        }

        /// Ensure the caller is the configured proxy admin before privileged operations run.
        fn ensure_admin(&self) -> Result<(), Error> {
            if self.env().caller() != self.admin {
                return Err(Error::Unauthorized);
            }
            Ok(())
        }
    }

    impl Upgradeable for TransparentProxy {
        /// Upgrade through the shared `Upgradeable` trait interface.
        #[ink(message)]
        fn upgrade_to(&mut self, new_code_hash: Hash) -> Result<(), UpgradeError> {
            self.upgrade_code_hash(new_code_hash)
                .map_err(|_| UpgradeError::UpgradeFailed)
        }

        /// Change the proxy admin through the shared `Upgradeable` trait interface.
        #[ink(message)]
        fn change_admin(&mut self, new_admin: AccountId) -> Result<(), UpgradeError> {
            self.change_admin(new_admin)
                .map_err(|err| match err {
                    Error::Unauthorized => UpgradeError::Unauthorized,
                    Error::UpgradeFailed => UpgradeError::UpgradeFailed,
                })
        }

        /// Expose the current admin through the shared `Upgradeable` trait interface.
        #[ink(message)]
        fn admin(&self) -> AccountId {
            self.admin
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use ink::env::test;
        use ink::env::DefaultEnvironment;

        fn default_accounts() -> ink::env::test::DefaultAccounts<DefaultEnvironment> {
            ink::env::test::default_accounts::<DefaultEnvironment>()
                .expect("Failed to get default accounts")
        }

        #[ink::test]
        fn admin_can_upgrade_stores_code_hash() {
            let accounts = default_accounts();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let mut proxy = TransparentProxy::new(Hash::default());
            let new_hash = Hash::from([1u8; 32]);
            assert_eq!(proxy.upgrade_to(new_hash), Ok(()));
            assert_eq!(proxy.code_hash(), new_hash);
        }

        #[ink::test]
        fn non_admin_cannot_upgrade() {
            let accounts = default_accounts();
            test::set_caller::<DefaultEnvironment>(accounts.alice);

            let mut proxy = TransparentProxy::new(Hash::default());
            test::set_caller::<DefaultEnvironment>(accounts.bob);

            let new_hash = Hash::from([1u8; 32]);
            assert_eq!(proxy.upgrade_to(new_hash), Err(UpgradeError::Unauthorized));
        }
    }
}
