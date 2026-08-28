#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(
    clippy::arithmetic_side_effects,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::needless_borrows_for_generic_args
)]

//! Property insurance contract module wiring, types, and delegated implementations.

use ink::storage::Mapping;
use scale::Encode;
use stellar_insured_lib::circuit_breaker::{
    CircuitBreakerError, CircuitBreakerTransition, InkCircuitBreaker,
};

mod rbac;
mod state_root;
pub use rbac::{Role, RoleManager};

/// Decentralized Property Insurance Platform
#[ink::contract]
mod propchain_insurance {
    use super::*;
    use ink::prelude::{string::String, vec::Vec};
    use crate::{Role, RoleManager};

    pub use crate::types::{
        ActuarialModel, BatchClaimResult, BatchClaimSummary, ClaimStatus, CoverageType,
        EvidenceItem, EvidenceMetadata, EvidenceVerification, InsuranceClaim, InsuranceError,
        InsurancePolicy, InsuranceToken, PolicyStatus, PolicyType, PoolLiquidityProvider,
        PremiumCalculation, ReinsuranceAgreement, RiskAssessment, RiskLevel, RiskPool,
        UnderwritingCriteria, REWARD_PRECISION,
    };

    use propchain_traits::{DynamicFeeProvider, FeeOperation, ZkProofType};

    // =========================================================================
    // EVENTS  (single source of truth: events.rs; included here so ink! macros
    // can see the definitions — do NOT re-declare events below this line, #352)
    // =========================================================================
    include!("events.rs");

    // All domain types (enums, structs) live exclusively in types.rs and are
    // brought into scope via `pub use crate::types::*` above.  Defining them
    // again here would create duplicate symbols and risk serialization drift
    // across contract versions (#358).

    // =========================================================================
    // STORAGE
    // =========================================================================

    #[ink(storage)]
    pub struct PropertyInsurance {
        admin: AccountId,

        // Role-based access control
        role_manager: RoleManager,

        // Policies
        policies: Mapping<u64, InsurancePolicy>,
        policy_count: u64,
        policyholder_policies: Mapping<AccountId, Vec<u64>>,
        property_policies: Mapping<u64, Vec<u64>>,

        // Claims
        claims: Mapping<u64, InsuranceClaim>,
        claim_count: u64,
        policy_claims: Mapping<u64, Vec<u64>>,

        // Risk Pools
        pools: Mapping<u64, RiskPool>,
        pool_count: u64,

        // Risk Assessments
        risk_assessments: Mapping<u64, RiskAssessment>,

        // Reinsurance
        reinsurance_agreements: Mapping<u64, ReinsuranceAgreement>,
        reinsurance_count: u64,

        // Insurance Tokens (secondary market)
        insurance_tokens: Mapping<u64, InsuranceToken>,
        token_count: u64,
        token_listings: Vec<u64>,

        // Actuarial Models
        actuarial_models: Mapping<u64, ActuarialModel>,
        model_count: u64,

        // Underwriting
        underwriting_criteria: Mapping<u64, UnderwritingCriteria>,

        // Liquidity providers
        liquidity_providers: Mapping<(u64, AccountId), PoolLiquidityProvider>,
        pool_providers: Mapping<u64, Vec<AccountId>>,

        // Oracle addresses
        authorized_oracles: Mapping<AccountId, bool>,

        // Assessors
        authorized_assessors: Mapping<AccountId, bool>,

        // Claim cooldown: property_id -> last_claim_timestamp
        claim_cooldowns: Mapping<u64, u64>,
        // Rate limiting: caller -> last_submit_claim_timestamp
        caller_last_claim: Mapping<AccountId, u64>,

        // Evidence tracking
        evidence_count: u64,
        evidence_items: Mapping<u64, EvidenceItem>,
        claim_evidence: Mapping<u64, Vec<u64>>,
        evidence_verifications: Mapping<u64, Vec<EvidenceVerification>>,

        // Oracle contract for parametric claims
        oracle_contract: Option<AccountId>,

        // Platform settings
        platform_fee_rate: u32,
        claim_cooldown_period: u64,
        min_pool_capital: u128,
        dispute_window_seconds: u64,
        arbiter: Option<AccountId>,

        // Security: track used evidence nonces to prevent replay attacks
        used_evidence_nonces: Mapping<(u64, String), bool>, // (property_id, nonce) -> bool
        
        // Per-caller monotonic nonce counter for replay protection (#349)
        // Callers must supply their current nonce; it is incremented on each accepted submit_claim.
        caller_nonces: Mapping<AccountId, u64>,
        
        // Shared circuit breaker state
        circuit_breaker: InkCircuitBreaker,
        // Time-lock for admin transfers
        pending_admin: Option<AccountId>,
        pending_admin_after: Option<u64>,
        admin_timelock_delay: u64,

        // Fee tracking
        total_platform_fees_collected: u128,

        // Minimum premium to prevent rounding exploits
        min_premium_amount: u128,

        // Fee manager contract for dynamic fees
        fee_manager: Option<AccountId>,

        // ZK compliance contract used to gate policyholders on verified proofs
        zk_compliance_contract: Option<AccountId>,
    }

    // =========================================================================
    // IMPLEMENTATION  (extracted to insurance_impl.rs)
    // =========================================================================

    // Core contract behavior is extracted to keep the root module focused on types and wiring.
    include!("insurance_impl.rs");

    impl Default for PropertyInsurance {
        /// Build a default instance with a zero admin for tests and tooling.
        fn default() -> Self {
            Self::new(AccountId::from([0x0; 32]))
        }
    }

    impl PropertyInsurance {
        #[ink(message)]
        pub fn get_state_root(&self) -> crate::state_root::StateRoot {
            crate::state_root::compute_root(&vec![self.admin.encode()])
        }
    }
}

pub use crate::propchain_insurance::{InsuranceError, PropertyInsurance};

#[cfg(test)]
mod insurance_tests {
    include!("insurance_tests.rs");
}

#[cfg(all(test, feature = "verification"))]
mod verification_tests {
    include!("verification_tests.rs");
}
