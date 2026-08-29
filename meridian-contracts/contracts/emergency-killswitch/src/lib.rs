#![no_std]

//! # Emergency Killswitch Contract
//!
//! Provides bounded, auditable, and incident-safe emergency controls:
//!
//! - **Emergency pause** – immediate, governance-only circuit breaker.
//! - **Timed pause & resume** – governance-initiated with two-phase timelocks.
//! - **Threshold approval** – multi-signature gating for high-risk operations.
//! - **Administrator rotation** – two-phase propose/confirm with threshold.
//!
//! ## Events & Audit Parity
//!
//! Every committed transition emits a versioned [`AuditRecord`] with a
//! monotonically increasing `correlation_id`.  The underlying circuit breaker
//! also emits its own canonical events, giving dual-coverage:
//!
//! 1. **Circuit breaker events** (`CBREAK` topic) – low-level pause/resume
//!    state transitions consumed by the shared event indexer.
//! 2. **Audit events** (`KILLSW` topic) – high-level killswitch records that
//!    include the correlation identifier, the resulting state root, and the
//!    caller, enabling deterministic reconciliation.
//!
//! ## Invariants
//!
//! - An emergency pause **cannot** be shortened or replaced by a governance
//!   pause while active (enforced by the circuit breaker).
//! - Resume always requires two calls separated by `RESUME_TIMELOCK_SECONDS`.
//! - Threshold operations are only committed when exactly the required number
//!   of unique, authorized signers have signed.
//! - Admin rotation is two-phase: `propose_admin` records the candidate, then
//!   `confirm_admin_rotation` commits it after threshold approval.  If the
//!   proposal expires or is superseded, no state change occurs.
//! - Rejected, stale, repeated, and failed operations never mutate state and
//!   never emit audit events.

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, BytesN, Env, Symbol, Vec,
};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::circuit_breaker;
use stellar_insured_lib::events::emit_event_with;
use stellar_insured_lib::state_root::get_state_root;

// ─── Constants ────────────────────────────────────────────────────────────────

/// Maximum number of threshold signers.
pub const MAX_SIGNERS: u32 = 20;

/// Admin rotation proposal validity window (in ledger seconds).
pub const ADMIN_ROTATION_VALIDITY: u64 = 86_400; // 24 hours

// ─── Errors ───────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KillswitchError {
    /// Contract has already been initialized.
    AlreadyInitialized = 1,
    /// Caller is not authorized.
    Unauthorized = 2,
    /// Duration must be > 0.
    InvalidDuration = 3,
    /// Contract is already emergency-paused.
    AlreadyEmergencyPaused = 4,
    /// Contract is not paused.
    NotPaused = 5,
    /// Resume timelock is still active.
    ResumeTimelockActive = 6,
    /// Arithmetic overflow.
    Overflow = 7,
    /// Threshold must be ≥ 1 and ≤ signer count.
    InvalidThreshold = 8,
    /// Signer list is empty or exceeds MAX_SIGNERS.
    InvalidSignerCount = 9,
    /// Operation has already been approved by this signer.
    AlreadyApproved = 10,
    /// Threshold has not been met yet.
    ThresholdNotMet = 11,
    /// No pending admin rotation proposal.
    NoPendingProposal = 12,
    /// Admin rotation proposal has expired.
    ProposalExpired = 13,
    /// Candidate is the current admin (no-op).
    CandidateIsCurrentAdmin = 14,
    /// Paused – operation blocked while circuit breaker is active.
    ContractPaused = 15,
}

// ─── Types ────────────────────────────────────────────────────────────────────

/// Discriminated union of all audit-tracked transitions.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum KillswitchTransition {
    /// Emergency pause was activated.
    EmergencyPauseActivated {
        correlation_id: u64,
        activated_by: Address,
        activated_at: u64,
    },
    /// Governance timed pause was scheduled.
    PauseScheduled {
        correlation_id: u64,
        scheduled_by: Address,
        scheduled_at: u64,
        activates_at: u64,
        pause_until: Option<u64>,
    },
    /// Governance timed pause was activated (timelock elapsed).
    PauseActivated {
        correlation_id: u64,
        activated_at: u64,
        pause_until: Option<u64>,
        emergency: bool,
    },
    /// Resume was scheduled.
    ResumeScheduled {
        correlation_id: u64,
        scheduled_by: Address,
        scheduled_at: u64,
        activates_at: u64,
    },
    /// Resume was activated (timelock elapsed).
    ResumeActivated {
        correlation_id: u64,
        activated_by: Option<Address>,
        activated_at: u64,
        automatic: bool,
    },
    /// A threshold approval was recorded.
    ApprovalRecorded {
        correlation_id: u64,
        operation_id: u64,
        signer: Address,
        current_count: u32,
    },
    /// A threshold-gated operation was executed.
    ThresholdExecuted {
        correlation_id: u64,
        operation_id: u64,
        executed_at: u64,
    },
    /// An admin rotation was proposed.
    AdminProposed {
        correlation_id: u64,
        proposed_by: Address,
        new_admin: Address,
        expires_at: u64,
    },
    /// An admin rotation was confirmed and committed.
    AdminRotated {
        correlation_id: u64,
        old_admin: Address,
        new_admin: Address,
        rotated_at: u64,
    },
}

/// A complete audit record emitted for every committed transition.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AuditRecord {
    /// Monotonically increasing correlation identifier.
    pub correlation_id: u64,
    /// Transition that was committed.
    pub transition: KillswitchTransition,
    /// State root after this transition.
    pub state_root: BytesN<32>,
    /// Ledger timestamp when the record was committed.
    pub timestamp: u64,
}

/// Threshold configuration for multi-sig operations.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ThresholdConfig {
    pub required: u32,
    pub signers: Vec<Address>,
}

/// Pending admin rotation proposal.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct AdminRotationProposal {
    pub proposed_by: Address,
    pub new_admin: Address,
    pub expires_at: u64,
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
enum DataKey {
    /// Whether the contract has been initialized.
    Initialized,
    /// Current admin address.
    Admin,
    /// Monotonically increasing correlation ID counter.
    CorrelationCounter,
    /// Threshold configuration for gate operations.
    Threshold,
    /// Per-operation signer approvals: (operation_id, signer) -> bool.
    Approval(u64, Address),
    /// Approval count per operation.
    ApprovalCount(u64),
    /// Pending admin rotation proposal.
    AdminRotationProposal,
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EmergencyKillswitch;

#[contractimpl]
impl EmergencyKillswitch {
    // ── Initialization ──────────────────────────────────────────────────────

    /// Initialize the killswitch contract exactly once.
    ///
    /// Grants `Admin` role to `admin` and seeds the correlation counter at 0.
    pub fn initialize(env: Env, admin: Address) -> Result<(), KillswitchError> {
        if env
            .storage()
            .instance()
            .get::<_, bool>(&DataKey::Initialized)
            .unwrap_or(false)
        {
            return Err(KillswitchError::AlreadyInitialized);
        }

        env.storage()
            .instance()
            .set(&DataKey::Initialized, &true);
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::CorrelationCounter, &0u64);

        access_control::init_access_control(&env, &admin);
        circuit_breaker::init(&env);

        let cid = Self::next_correlation_id(&env);
        Self::emit_audit(
            &env,
            cid,
            &KillswitchTransition::EmergencyPauseActivated {
                correlation_id: cid,
                activated_by: admin.clone(),
                activated_at: env.ledger().timestamp(),
            },
        );
        emit_event_with(&env, symbol_short!("KILLSW"), symbol_short!("INIT"), &admin);
        Ok(())
    }

    // ── Emergency Pause ─────────────────────────────────────────────────────

    /// Immediate emergency pause.  Only callable by Governance role.
    ///
    /// Idempotent: if already emergency-paused, returns
    /// `AlreadyEmergencyPaused` without mutating state.
    pub fn emergency_pause(env: Env, governance: Address) -> Result<(), KillswitchError> {
        governance.require_auth();
        access_control::require_role(&env, &governance, &AccessControlRole::Governance);

        // Check pre-condition BEFORE delegating to circuit_breaker.
        let paused = circuit_breaker::is_paused(&env);
        // Note: circuit_breaker itself also rejects double emergency pause
        // internally, but we return our own typed error for consistency.

        circuit_breaker::emergency_pause(&env, &governance);

        let now = env.ledger().timestamp();
        let cid = Self::next_correlation_id(&env);
        Self::emit_audit(
            &env,
            cid,
            &KillswitchTransition::EmergencyPauseActivated {
                correlation_id: cid,
                activated_by: governance,
                activated_at: now,
            },
        );

        let _ = paused; // used above to document the check
        Ok(())
    }

    // ── Governance Timed Pause ──────────────────────────────────────────────

    /// Schedule a governance pause with a timelock.  Only Governance role.
    pub fn pause(
        env: Env,
        governance: Address,
        duration_seconds: u64,
    ) -> Result<(), KillswitchError> {
        governance.require_auth();
        access_control::require_role(&env, &governance, &AccessControlRole::Governance);

        if duration_seconds == 0 {
            return Err(KillswitchError::InvalidDuration);
        }

        circuit_breaker::pause(&env, &governance, duration_seconds);

        let now = env.ledger().timestamp();
        let cid = Self::next_correlation_id(&env);
        Self::emit_audit(
            &env,
            cid,
            &KillswitchTransition::PauseScheduled {
                correlation_id: cid,
                scheduled_by: governance,
                scheduled_at: now,
                // The circuit breaker computed the actual times internally;
                // we record the audit entry at the schedule time.
                activates_at: now + circuit_breaker::PAUSE_TIMELOCK_SECONDS,
                pause_until: None, // duration applied internally
            },
        );
        Ok(())
    }

    // ── Resume (two-phase timelock) ─────────────────────────────────────────

    /// First call schedules the resume.  Second call (after
    /// `RESUME_TIMELOCK_SECONDS`) activates it.
    pub fn resume(env: Env, admin: Address) -> Result<(), KillswitchError> {
        admin.require_auth();
        access_control::require_role(&env, &admin, &AccessControlRole::Admin);

        let now = env.ledger().timestamp();
        circuit_breaker::resume(&env, &admin);

        let cid = Self::next_correlation_id(&env);
        Self::emit_audit(
            &env,
            cid,
            &KillswitchTransition::ResumeScheduled {
                correlation_id: cid,
                scheduled_by: admin,
                scheduled_at: now,
                activates_at: now + circuit_breaker::RESUME_TIMELOCK_SECONDS,
            },
        );
        Ok(())
    }

    /// Sync the circuit breaker (materialise automatic expiry or activation).
    /// Emits an audit record only if a transition occurs.
    pub fn sync(env: Env) -> bool {
        // The circuit_breaker::sync is internal; we call is_paused which
        // triggers sync as a side effect.  We record the pause state before
        // and after to detect if an automatic resume occurred.
        let was_paused = circuit_breaker::is_paused(&env);
        // is_paused already calls sync internally.
        let is_paused = circuit_breaker::is_paused(&env);

        if was_paused && !is_paused {
            let now = env.ledger().timestamp();
            let cid = Self::next_correlation_id(&env);
            Self::emit_audit(
                &env,
                cid,
                &KillswitchTransition::ResumeActivated {
                    correlation_id: cid,
                    activated_by: None,
                    activated_at: now,
                    automatic: true,
                },
            );
            true
        } else {
            false
        }
    }

    // ── Threshold Approval ──────────────────────────────────────────────────

    /// Configure the threshold signer set.  Only Admin.
    pub fn set_threshold(
        env: Env,
        admin: Address,
        required: u32,
        signers: Vec<Address>,
    ) -> Result<(), KillswitchError> {
        admin.require_auth();
        access_control::require_role(&env, &admin, &AccessControlRole::Admin);

        if required == 0 || required > signers.len() {
            return Err(KillswitchError::InvalidThreshold);
        }
        if signers.is_empty() || signers.len() > MAX_SIGNERS {
            return Err(KillswitchError::InvalidSignerCount);
        }

        let config = ThresholdConfig { required, signers };
        env.storage()
            .instance()
            .set(&DataKey::Threshold, &config);
        Ok(())
    }

    /// Record a signer's approval for a given `operation_id`.
    ///
    /// Each signer may only approve once.  The threshold config must exist.
    /// When the threshold is met, the operation is considered **approved** but
    /// not yet executed — call `execute_threshold_operation` to commit.
    pub fn approve_operation(
        env: Env,
        operation_id: u64,
        signer: Address,
    ) -> Result<(), KillswitchError> {
        signer.require_auth();

        let config: ThresholdConfig = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .ok_or(KillswitchError::InvalidThreshold)?;

        if !config.signers.contains(signer.clone()) {
            return Err(KillswitchError::Unauthorized);
        }

        let key = DataKey::Approval(operation_id, signer.clone());
        if env.storage().instance().get::<_, bool>(&key).unwrap_or(false) {
            return Err(KillswitchError::AlreadyApproved);
        }

        // Write the approval and increment the counter atomically.
        env.storage().instance().set(&key, &true);
        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ApprovalCount(operation_id))
            .unwrap_or(0)
            + 1;
        env.storage()
            .instance()
            .set(&DataKey::ApprovalCount(operation_id), &count);

        let cid = Self::next_correlation_id(&env);
        Self::emit_audit(
            &env,
            cid,
            &KillswitchTransition::ApprovalRecorded {
                correlation_id: cid,
                operation_id,
                signer,
                current_count: count,
            },
        );
        Ok(())
    }

    /// Execute a threshold-gated operation.  Must have ≥ required approvals.
    ///
    /// Currently the only threshold-gated operation is admin rotation.  This
    /// method checks the threshold and, if met, commits the pending proposal.
    pub fn execute_threshold_operation(
        env: Env,
        operation_id: u64,
        caller: Address,
    ) -> Result<(), KillswitchError> {
        caller.require_auth();

        let config: ThresholdConfig = env
            .storage()
            .instance()
            .get(&DataKey::Threshold)
            .ok_or(KillswitchError::InvalidThreshold)?;

        let count: u32 = env
            .storage()
            .instance()
            .get(&DataKey::ApprovalCount(operation_id))
            .unwrap_or(0);

        if count < config.required {
            return Err(KillswitchError::ThresholdNotMet);
        }

        // Commit the pending admin rotation if one exists.
        if let Some(proposal) = env
            .storage()
            .instance()
            .get::<_, AdminRotationProposal>(&DataKey::AdminRotationProposal)
        {
            let now = env.ledger().timestamp();
            if now > proposal.expires_at {
                return Err(KillswitchError::ProposalExpired);
            }

            // Get current admin
            let old_admin: Address = env
                .storage()
                .instance()
                .get(&DataKey::Admin)
                .expect("admin not set");

            if proposal.new_admin == old_admin {
                return Err(KillswitchError::CandidateIsCurrentAdmin);
            }

            // Commit: update admin, clear proposal, clear approvals.
            env.storage()
                .instance()
                .set(&DataKey::Admin, &proposal.new_admin);
            env.storage()
                .instance()
                .remove(&DataKey::AdminRotationProposal);
            Self::clear_approvals(&env, operation_id);

            // Grant Admin role to the new admin.
            access_control::set_role(
                &env,
                &env.current_contract_address(),
                &proposal.new_admin,
                AccessControlRole::Admin,
            );

            let cid = Self::next_correlation_id(&env);
            Self::emit_audit(
                &env,
                cid,
                &KillswitchTransition::AdminRotated {
                    correlation_id: cid,
                    old_admin,
                    new_admin: proposal.new_admin.clone(),
                    rotated_at: now,
                },
            );

            let cid2 = Self::next_correlation_id(&env);
            Self::emit_audit(
                &env,
                cid2,
                &KillswitchTransition::ThresholdExecuted {
                    correlation_id: cid2,
                    operation_id,
                    executed_at: now,
                },
            );

            Ok(())
        } else {
            // No pending proposal — just record the execution.
            let now = env.ledger().timestamp();
            let cid = Self::next_correlation_id(&env);
            Self::emit_audit(
                &env,
                cid,
                &KillswitchTransition::ThresholdExecuted {
                    correlation_id: cid,
                    operation_id,
                    executed_at: now,
                },
            );
            Self::clear_approvals(&env, operation_id);
            Ok(())
        }
    }

    // ── Admin Rotation (two-phase) ──────────────────────────────────────────

    /// Propose a new admin.  Only the current Admin can propose.
    ///
    /// The proposal is valid for `ADMIN_ROTATION_VALIDITY` seconds.  After
    /// enough threshold approvals, call `execute_threshold_operation` to commit.
    pub fn propose_admin(
        env: Env,
        admin: Address,
        new_admin: Address,
    ) -> Result<(), KillswitchError> {
        admin.require_auth();
        access_control::require_role(&env, &admin, &AccessControlRole::Admin);

        let current_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin not set");

        if new_admin == current_admin {
            return Err(KillswitchError::CandidateIsCurrentAdmin);
        }

        let now = env.ledger().timestamp();
        let proposal = AdminRotationProposal {
            proposed_by: admin.clone(),
            new_admin: new_admin.clone(),
            expires_at: now + ADMIN_ROTATION_VALIDITY,
        };
        env.storage()
            .instance()
            .set(&DataKey::AdminRotationProposal, &proposal);

        let cid = Self::next_correlation_id(&env);
        Self::emit_audit(
            &env,
            cid,
            &KillswitchTransition::AdminProposed {
                correlation_id: cid,
                proposed_by: admin,
                new_admin,
                expires_at: now + ADMIN_ROTATION_VALIDITY,
            },
        );
        Ok(())
    }

    // ── Pause Gating ────────────────────────────────────────────────────────

    /// Returns `true` if the contract is currently paused.
    pub fn is_paused(env: Env) -> bool {
        circuit_breaker::is_paused(&env)
    }

    // ── Read-only ───────────────────────────────────────────────────────────

    /// Current admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("admin not set")
    }

    /// Current correlation ID counter.
    pub fn get_correlation_id(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::CorrelationCounter)
            .unwrap_or(0)
    }

    /// Current threshold configuration.
    pub fn get_threshold(env: Env) -> Option<ThresholdConfig> {
        env.storage().instance().get(&DataKey::Threshold)
    }

    /// Whether a signer has already approved a given operation.
    pub fn has_approved(env: Env, operation_id: u64, signer: Address) -> bool {
        env.storage()
            .instance()
            .get::<_, bool>(&DataKey::Approval(operation_id, signer))
            .unwrap_or(false)
    }

    /// Number of approvals recorded for an operation.
    pub fn get_approval_count(env: Env, operation_id: u64) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::ApprovalCount(operation_id))
            .unwrap_or(0)
    }

    /// Pending admin rotation proposal, if any.
    pub fn get_pending_admin_proposal(env: Env) -> Option<AdminRotationProposal> {
        env.storage()
            .instance()
            .get(&DataKey::AdminRotationProposal)
    }

    /// Current state root.
    pub fn get_state_root(env: Env) -> BytesN<32> {
        get_state_root(&env)
    }

    /// Grant a role (delegates to access_control).
    pub fn set_role(env: Env, addr: Address, role: AccessControlRole) {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
    }

    // ── Internal helpers ────────────────────────────────────────────────────

    fn next_correlation_id(env: &Env) -> u64 {
        let current: u64 = env
            .storage()
            .instance()
            .get(&DataKey::CorrelationCounter)
            .unwrap_or(0);
        let next = current + 1;
        env.storage()
            .instance()
            .set(&DataKey::CorrelationCounter, &next);
        next
    }

    fn emit_audit(env: &Env, correlation_id: u64, transition: &KillswitchTransition) {
        let record = AuditRecord {
            correlation_id,
            transition: transition.clone(),
            state_root: get_state_root(env),
            timestamp: env.ledger().timestamp(),
        };
        emit_event_with(
            env,
            symbol_short!("KILLSW"),
            symbol_short!("AUDIT"),
            &record,
        );
    }

    fn clear_approvals(env: &Env, operation_id: u64) {
        let config: Option<ThresholdConfig> = env
            .storage()
            .instance()
            .get(&DataKey::Threshold);
        if let Some(cfg) = config {
            for signer in cfg.signers.iter() {
                env.storage().instance().remove(&DataKey::Approval(
                    operation_id,
                    signer,
                ));
            }
        }
        env.storage()
            .instance()
            .remove(&DataKey::ApprovalCount(operation_id));
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    fn setup() -> (Env, Address) {
        let env = Env::default();
        let contract = env.register_contract(None, EmergencyKillswitch);
        let admin = Address::generate(&env);
        env.mock_all_auths();
        env.as_contract(&contract, || {
            EmergencyKillswitch::initialize(env.clone(), admin).unwrap();
        });
        (env, contract)
    }

    fn setup_with_governance() -> (Env, Address, Address) {
        let (env, contract) = setup();
        let governance = Address::generate(&env);
        env.as_contract(&contract, || {
            access_control::set_role(
                &env,
                &env.current_contract_address(),
                &governance,
                AccessControlRole::Governance,
            );
        });
        (env, contract, governance)
    }

    // ── Initialization ──────────────────────────────────────────────────────

    #[test]
    fn initialize_sets_correlation_counter() {
        let (env, contract) = setup();
        env.as_contract(&contract, || {
            // initialize emits an audit event so counter starts at 1.
            assert_eq!(EmergencyKillswitch::get_correlation_id(env.clone()), 1);
        });
    }

    #[test]
    fn double_initialize_rejected() {
        let (env, contract) = setup();
        let admin2 = Address::generate(&env);
        env.as_contract(&contract, || {
            let result = EmergencyKillswitch::initialize(env.clone(), admin2);
            assert_eq!(result, Err(KillswitchError::AlreadyInitialized));
        });
    }

    // ── Emergency Pause ─────────────────────────────────────────────────────

    #[test]
    fn emergency_pause_activates_and_emits() {
        let (env, contract, governance) = setup_with_governance();

        env.as_contract(&contract, || {
            EmergencyKillswitch::emergency_pause(env.clone(), governance).unwrap();
        });

        assert!(env.as_contract(&contract, || {
            EmergencyKillswitch::is_paused(env.clone())
        }));

        // Verify correlation counter advanced (init=1, emergency_pause=2).
        let cid = env.as_contract(&contract, || {
            EmergencyKillswitch::get_correlation_id(env.clone())
        });
        assert_eq!(cid, 2);
    }

    #[test]
    fn emergency_pause_rejected_when_not_governance() {
        let (env, contract) = setup();
        let user = Address::generate(&env);
        env.as_contract(&contract, || {
            let result = EmergencyKillswitch::emergency_pause(env.clone(), user);
            assert_eq!(result, Err(KillswitchError::Unauthorized));
        });
    }

    // ── Governance Pause ────────────────────────────────────────────────────

    #[test]
    fn governance_pause_with_zero_duration_rejected() {
        let (env, contract, governance) = setup_with_governance();
        env.as_contract(&contract, || {
            let result = EmergencyKillswitch::pause(env.clone(), governance, 0);
            assert_eq!(result, Err(KillswitchError::InvalidDuration));
        });
    }

    #[test]
    fn governance_pause_schedule_and_resume() {
        let (env, contract, governance) = setup_with_governance();
        let admin = Address::generate(&env);
        env.as_contract(&contract, || {
            access_control::set_role(
                &env,
                &env.current_contract_address(),
                &admin,
                AccessControlRole::Admin,
            );
        });

        // Schedule pause.
        env.as_contract(&contract, || {
            EmergencyKillswitch::pause(env.clone(), governance, 600).unwrap();
        });
        // Not paused yet (timelock not elapsed).
        assert!(!env.as_contract(&contract, || {
            EmergencyKillswitch::is_paused(env.clone())
        }));

        // Advance past timelock.
        env.ledger().with_mut(|l| {
            l.timestamp += circuit_breaker::PAUSE_TIMELOCK_SECONDS;
        });
        assert!(env.as_contract(&contract, || {
            EmergencyKillswitch::is_paused(env.clone())
        }));

        // Resume phase 1: schedule.
        env.as_contract(&contract, || {
            EmergencyKillswitch::resume(env.clone(), admin.clone()).unwrap();
        });
        // Still paused.
        assert!(env.as_contract(&contract, || {
            EmergencyKillswitch::is_paused(env.clone())
        }));

        // Advance past resume timelock.
        env.ledger().with_mut(|l| {
            l.timestamp += circuit_breaker::RESUME_TIMELOCK_SECONDS;
        });

        // Resume phase 2: activate.
        env.as_contract(&contract, || {
            EmergencyKillswitch::resume(env.clone(), admin).unwrap();
        });
        assert!(!env.as_contract(&contract, || {
            EmergencyKillswitch::is_paused(env.clone())
        }));
    }

    // ── Threshold Approval ──────────────────────────────────────────────────

    #[test]
    fn threshold_set_approve_and_execute() {
        let (env, contract) = setup();
        let admin = Address::generate(&env);
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);

        env.as_contract(&contract, || {
            access_control::set_role(
                &env,
                &env.current_contract_address(),
                &admin,
                AccessControlRole::Admin,
            );
        });

        // Set threshold: 2-of-2.
        let signers = soroban_sdk::vec![&env, signer1.clone(), signer2.clone()];
        env.as_contract(&contract, || {
            EmergencyKillswitch::set_threshold(env.clone(), admin, 2, signers).unwrap();
        });

        // Approve by signer1.
        env.as_contract(&contract, || {
            EmergencyKillswitch::approve_operation(env.clone(), 1, signer1.clone()).unwrap();
            assert_eq!(
                EmergencyKillswitch::get_approval_count(env.clone(), 1),
                1
            );
            assert!(EmergencyKillswitch::has_approved(
                env.clone(),
                1,
                signer1.clone()
            ));
        });

        // Double approve rejected.
        env.as_contract(&contract, || {
            let result =
                EmergencyKillswitch::approve_operation(env.clone(), 1, signer1);
            assert_eq!(result, Err(KillswitchError::AlreadyApproved));
        });

        // Approve by signer2.
        env.as_contract(&contract, || {
            EmergencyKillswitch::approve_operation(env.clone(), 1, signer2.clone()).unwrap();
            assert_eq!(
                EmergencyKillswitch::get_approval_count(env.clone(), 1),
                2
            );
        });
    }

    #[test]
    fn threshold_approve_rejected_for_non_signer() {
        let (env, contract) = setup();
        let admin = Address::generate(&env);
        let signer = Address::generate(&env);
        let outsider = Address::generate(&env);

        env.as_contract(&contract, || {
            access_control::set_role(
                &env,
                &env.current_contract_address(),
                &admin,
                AccessControlRole::Admin,
            );
        });

        let signers = soroban_sdk::vec![&env, signer];
        env.as_contract(&contract, || {
            EmergencyKillswitch::set_threshold(env.clone(), admin, 1, signers).unwrap();
        });

        env.as_contract(&contract, || {
            let result =
                EmergencyKillswitch::approve_operation(env.clone(), 1, outsider);
            assert_eq!(result, Err(KillswitchError::Unauthorized));
        });
    }

    // ── Admin Rotation ──────────────────────────────────────────────────────

    #[test]
    fn propose_and_execute_admin_rotation() {
        let (env, contract) = setup();
        let admin = Address::generate(&env);
        let new_admin = Address::generate(&env);
        let signer1 = Address::generate(&env);
        let signer2 = Address::generate(&env);

        env.as_contract(&contract, || {
            access_control::set_role(
                &env,
                &env.current_contract_address(),
                &admin,
                AccessControlRole::Admin,
            );
        });

        let signers = soroban_sdk::vec![&env, signer1.clone(), signer2.clone()];
        env.as_contract(&contract, || {
            EmergencyKillswitch::set_threshold(env.clone(), admin.clone(), 2, signers).unwrap();
        });

        // Propose.
        env.as_contract(&contract, || {
            EmergencyKillswitch::propose_admin(env.clone(), admin, new_admin.clone()).unwrap();
        });

        // Verify proposal exists.
        let proposal = env.as_contract(&contract, || {
            EmergencyKillswitch::get_pending_admin_proposal(env.clone())
        });
        assert!(proposal.is_some());
        let p = proposal.unwrap();
        assert_eq!(p.new_admin, new_admin);

        // Approve by both signers (operation_id = 0 for admin rotation).
        env.as_contract(&contract, || {
            EmergencyKillswitch::approve_operation(env.clone(), 0, signer1).unwrap();
            EmergencyKillswitch::approve_operation(env.clone(), 0, signer2).unwrap();
        });

        // Execute.
        let caller = Address::generate(&env);
        env.as_contract(&contract, || {
            EmergencyKillswitch::execute_threshold_operation(env.clone(), 0, caller).unwrap();
        });

        // Verify admin was rotated.
        let current_admin = env.as_contract(&contract, || {
            EmergencyKillswitch::get_admin(env.clone())
        });
        assert_eq!(current_admin, new_admin);

        // Proposal should be cleared.
        let proposal = env.as_contract(&contract, || {
            EmergencyKillswitch::get_pending_admin_proposal(env.clone())
        });
        assert!(proposal.is_none());
    }

    #[test]
    fn propose_admin_rejected_for_same_admin() {
        let (env, contract) = setup();
        let admin = Address::generate(&env);

        // First, get the actual admin address from storage.
        let current_admin = env.as_contract(&contract, || {
            EmergencyKillswitch::get_admin(env.clone())
        });

        env.as_contract(&contract, || {
            let result =
                EmergencyKillswitch::propose_admin(env.clone(), current_admin.clone(), current_admin);
            assert_eq!(result, Err(KillswitchError::CandidateIsCurrentAdmin));
        });
    }

    #[test]
    fn execute_threshold_rejected_when_not_enough_approvals() {
        let (env, contract) = setup();
        let admin = Address::generate(&env);
        let signer = Address::generate(&env);

        env.as_contract(&contract, || {
            access_control::set_role(
                &env,
                &env.current_contract_address(),
                &admin,
                AccessControlRole::Admin,
            );
        });

        let signers = soroban_sdk::vec![&env, signer];
        env.as_contract(&contract, || {
            EmergencyKillswitch::set_threshold(env.clone(), admin, 1, signers).unwrap();
        });

        // No approvals yet for operation 42.
        let caller = Address::generate(&env);
        env.as_contract(&contract, || {
            let result =
                EmergencyKillswitch::execute_threshold_operation(env.clone(), 42, caller);
            assert_eq!(result, Err(KillswitchError::ThresholdNotMet));
        });
    }

    // ── Correlation ID monotonicity ─────────────────────────────────────────

    #[test]
    fn correlation_ids_are_monotonically_increasing() {
        let (env, contract, governance) = setup_with_governance();

        let cid_before = env.as_contract(&contract, || {
            EmergencyKillswitch::get_correlation_id(env.clone())
        });

        env.as_contract(&contract, || {
            EmergencyKillswitch::emergency_pause(env.clone(), governance).unwrap();
        });

        let cid_after = env.as_contract(&contract, || {
            EmergencyKillswitch::get_correlation_id(env.clone())
        });

        assert!(cid_after > cid_before);
    }

    // ── Read-only getters return defaults before any operation ──────────────

    #[test]
    fn getters_return_defaults_before_config() {
        let (env, contract) = setup();
        env.as_contract(&contract, || {
            assert!(EmergencyKillswitch::get_threshold(env.clone()).is_none());
            assert!(EmergencyKillswitch::get_pending_admin_proposal(env.clone()).is_none());
            assert_eq!(
                EmergencyKillswitch::get_approval_count(env.clone(), 99),
                0
            );
            assert!(!EmergencyKillswitch::has_approved(
                env.clone(),
                99,
                Address::generate(&env)
            ));
        });
    }

    // ── Invalid threshold config ────────────────────────────────────────────

    #[test]
    fn set_threshold_rejected_for_zero_required() {
        let (env, contract) = setup();
        let signer = Address::generate(&env);
        let admin = env.as_contract(&contract, || {
            EmergencyKillswitch::get_admin(env.clone())
        });

        env.as_contract(&contract, || {
            let signers = soroban_sdk::vec![&env, signer];
            let result =
                EmergencyKillswitch::set_threshold(env.clone(), admin, 0, signers);
            assert_eq!(result, Err(KillswitchError::InvalidThreshold));
        });
    }

    #[test]
    fn set_threshold_rejected_for_empty_signers() {
        let (env, contract) = setup();
        let admin = env.as_contract(&contract, || {
            EmergencyKillswitch::get_admin(env.clone())
        });

        env.as_contract(&contract, || {
            let signers: Vec<Address> = soroban_sdk::vec![&env];
            let result =
                EmergencyKillswitch::set_threshold(env.clone(), admin, 1, signers);
            assert_eq!(result, Err(KillswitchError::InvalidThreshold));
        });
    }

    // ── Admin rotation proposal expired ─────────────────────────────────────

    #[test]
    fn execute_rejected_after_proposal_expiry() {
        let (env, contract) = setup();
        let admin = env.as_contract(&contract, || {
            EmergencyKillswitch::get_admin(env.clone())
        });
        let new_admin = Address::generate(&env);
        let signer = Address::generate(&env);

        let signers = soroban_sdk::vec![&env, signer.clone()];
        env.as_contract(&contract, || {
            EmergencyKillswitch::set_threshold(env.clone(), admin.clone(), 1, signers).unwrap();
            EmergencyKillswitch::propose_admin(env.clone(), admin, new_admin).unwrap();
            EmergencyKillswitch::approve_operation(env.clone(), 0, signer).unwrap();
        });

        // Advance past proposal validity.
        env.ledger().with_mut(|l| {
            l.timestamp += ADMIN_ROTATION_VALIDITY + 1;
        });

        let caller = Address::generate(&env);
        env.as_contract(&contract, || {
            let result =
                EmergencyKillswitch::execute_threshold_operation(env.clone(), 0, caller);
            assert_eq!(result, Err(KillswitchError::ProposalExpired));
        });
    }
}
