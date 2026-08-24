//! Role-Based Access Control (RBAC) module for the insurance contract.
//!
//! Defines roles and provides helpers for permission checks.
//! Addresses issue #346 – Missing Access Control Roles.

use ink::prelude::vec::Vec;
use ink::storage::Mapping;

/// All roles recognised by the insurance contract.
///
/// Roles are additive: a caller may hold multiple roles simultaneously.
/// `Admin` is the super-role and implicitly satisfies every other role check.
#[derive(
    Debug,
    Clone,
    Copy,
    PartialEq,
    Eq,
    scale::Encode,
    scale::Decode,
    ink::storage::traits::StorageLayout,
)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum Role {
    /// Full administrative control (pool creation, pausing, admin transfer, …).
    Admin,
    /// Can review, approve, and reject claims.
    Assessor,
    /// Can submit oracle reports and verify parametric triggers.
    Oracle,
    /// Can underwrite (issue) policies on behalf of the platform.
    Underwriter,
    /// Regular policyholder – can submit claims and manage own policies.
    Policyholder,
    /// Governance multisig allowed to schedule and activate emergency pauses.
    Governance,
}

/// Compact on-chain role store.
///
/// Stored as a flat `Mapping<(AccountId, u8), bool>` where the `u8` is the
/// discriminant of [`Role`], keeping storage layout simple and gas-efficient.
#[derive(Default)]
#[ink::storage_item]
pub struct RoleManager {
    /// `(account, role_discriminant) -> has_role`
    roles: Mapping<(ink::primitives::AccountId, u8), bool>,
}

impl RoleManager {
    /// Assign `role` to `account`.
    pub fn grant(&mut self, account: ink::primitives::AccountId, role: Role) {
        self.roles.insert(&(account, role as u8), &true);
    }

    /// Remove `role` from `account`.
    pub fn revoke(&mut self, account: ink::primitives::AccountId, role: Role) {
        self.roles.remove(&(account, role as u8));
    }

    /// Return `true` if `account` holds `role` **or** the `Admin` role.
    pub fn has_role(&self, account: ink::primitives::AccountId, role: Role) -> bool {
        // Admin satisfies every role check.
        if role != Role::Admin
            && self
                .roles
                .get(&(account, Role::Admin as u8))
                .unwrap_or(false)
        {
            return true;
        }
        self.roles.get(&(account, role as u8)).unwrap_or(false)
    }

    /// Return true only when the account was explicitly granted `role`.
    pub fn has_exact_role(&self, account: ink::primitives::AccountId, role: Role) -> bool {
        self.roles.get(&(account, role as u8)).unwrap_or(false)
    }

    /// Return all roles currently held by `account`.
    pub fn roles_of(&self, account: ink::primitives::AccountId) -> Vec<Role> {
        let all = [
            Role::Admin,
            Role::Governance,
            Role::Assessor,
            Role::Oracle,
            Role::Underwriter,
            Role::Policyholder,
        ];
        all.iter()
            .filter(|&&r| {
                self.roles
                    .get(&(account, r as u8))
                    .unwrap_or(false)
            })
            .copied()
            .collect()
    }
}
