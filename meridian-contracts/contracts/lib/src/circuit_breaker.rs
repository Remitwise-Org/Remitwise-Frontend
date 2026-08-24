//! Shared, auditable pause protocol used by every contract.

/// Delay between a governance pause request and activation.
pub const PAUSE_TIMELOCK_SECONDS: u64 = 3_600;
/// Delay between an admin resume request and activation.
pub const RESUME_TIMELOCK_SECONDS: u64 = 3_600;

#[cfg(feature = "soroban")]
#[path = "../../../common/multisig.rs"]
pub mod multisig;
#[cfg(feature = "soroban")]
pub use multisig::{verify_multisig, AdminConfig};

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CircuitBreakerError {
    InvalidDuration,
    EmergencyPauseActive,
    NotPaused,
    ResumeTimelockActive,
    TimestampOverflow,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum CircuitBreakerTransition<AccountId> {
    PauseScheduled {
        scheduled_by: AccountId,
        scheduled_at: u64,
        activates_at: u64,
        pause_until: Option<u64>,
        rescheduled_by: Option<AccountId>,
    },
    PauseActivated {
        activated_at: u64,
        pause_until: Option<u64>,
        emergency: bool,
    },
    ResumeScheduled {
        scheduled_by: AccountId,
        scheduled_at: u64,
        activates_at: u64,
    },
    ResumeActivated {
        activated_by: Option<AccountId>,
        activated_at: u64,
        automatic: bool,
    },
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CircuitBreakerState<AccountId> {
    pub pause_scheduled_at: Option<u64>,
    pub pause_activates_at: Option<u64>,
    pub pause_until: Option<u64>,
    pub rescheduled_by: Option<AccountId>,
    pub resume_scheduled_at: Option<u64>,
    pub emergency_paused: bool,
    pub activation_announced: bool,
}

impl<AccountId> Default for CircuitBreakerState<AccountId> {
    fn default() -> Self {
        Self {
            pause_scheduled_at: None,
            pause_activates_at: None,
            pause_until: None,
            rescheduled_by: None,
            resume_scheduled_at: None,
            emergency_paused: false,
            activation_announced: false,
        }
    }
}

/// Pure state machine. Host contracts provide role checks and event emission.
pub struct CircuitBreaker;

impl CircuitBreaker {
    pub fn pause<AccountId: Clone>(
        state: &mut CircuitBreakerState<AccountId>,
        now: u64,
        duration_seconds: u64,
        scheduled_by: AccountId,
    ) -> Result<CircuitBreakerTransition<AccountId>, CircuitBreakerError> {
        if duration_seconds == 0 {
            return Err(CircuitBreakerError::InvalidDuration);
        }
        if state.emergency_paused {
            return Err(CircuitBreakerError::EmergencyPauseActive);
        }

        let was_scheduled = state.pause_scheduled_at.is_some() || state.emergency_paused;
        let currently_paused = Self::is_paused(state, now);
        let activates_at = if currently_paused {
            now
        } else {
            now.checked_add(PAUSE_TIMELOCK_SECONDS)
                .ok_or(CircuitBreakerError::TimestampOverflow)?
        };
        let requested_until = activates_at
            .checked_add(duration_seconds)
            .ok_or(CircuitBreakerError::TimestampOverflow)?;
        let pause_until = if currently_paused {
            core::cmp::max(
                state.pause_until.unwrap_or(requested_until),
                requested_until,
            )
        } else {
            requested_until
        };
        let rescheduled_by = was_scheduled.then_some(scheduled_by.clone());

        state.pause_scheduled_at = Some(now);
        state.pause_activates_at = Some(activates_at);
        state.pause_until = Some(pause_until);
        state.rescheduled_by = rescheduled_by.clone();
        state.resume_scheduled_at = None;
        state.emergency_paused = false;
        if !currently_paused {
            state.activation_announced = false;
        }

        Ok(CircuitBreakerTransition::PauseScheduled {
            scheduled_by,
            scheduled_at: now,
            activates_at,
            pause_until: Some(pause_until),
            rescheduled_by,
        })
    }

    pub fn resume<AccountId: Clone>(
        state: &mut CircuitBreakerState<AccountId>,
        now: u64,
        admin: AccountId,
    ) -> Result<CircuitBreakerTransition<AccountId>, CircuitBreakerError> {
        if state.pause_scheduled_at.is_none() && !state.emergency_paused {
            return Err(CircuitBreakerError::NotPaused);
        }

        match state.resume_scheduled_at {
            None => {
                let activates_at = now
                    .checked_add(RESUME_TIMELOCK_SECONDS)
                    .ok_or(CircuitBreakerError::TimestampOverflow)?;
                state.resume_scheduled_at = Some(now);
                Ok(CircuitBreakerTransition::ResumeScheduled {
                    scheduled_by: admin,
                    scheduled_at: now,
                    activates_at,
                })
            }
            Some(scheduled_at) => {
                let activates_at = scheduled_at
                    .checked_add(RESUME_TIMELOCK_SECONDS)
                    .ok_or(CircuitBreakerError::TimestampOverflow)?;
                if now < activates_at {
                    return Err(CircuitBreakerError::ResumeTimelockActive);
                }
                Self::clear(state);
                Ok(CircuitBreakerTransition::ResumeActivated {
                    activated_by: Some(admin),
                    activated_at: now,
                    automatic: false,
                })
            }
        }
    }

    pub fn is_paused<AccountId>(state: &CircuitBreakerState<AccountId>, now: u64) -> bool {
        if state.emergency_paused {
            return true;
        }
        matches!(
            (state.pause_activates_at, state.pause_until),
            (Some(activates_at), Some(until)) if now >= activates_at && now < until
        )
    }

    pub fn emergency_pause<AccountId: Clone>(
        state: &mut CircuitBreakerState<AccountId>,
        now: u64,
        scheduled_by: AccountId,
    ) -> (
        CircuitBreakerTransition<AccountId>,
        CircuitBreakerTransition<AccountId>,
    ) {
        let rescheduled_by = (state.pause_scheduled_at.is_some() || state.emergency_paused)
            .then_some(scheduled_by.clone());
        state.pause_scheduled_at = Some(now);
        state.pause_activates_at = Some(now);
        state.pause_until = None;
        state.rescheduled_by = rescheduled_by.clone();
        state.resume_scheduled_at = None;
        state.emergency_paused = true;
        state.activation_announced = true;

        (
            CircuitBreakerTransition::PauseScheduled {
                scheduled_by,
                scheduled_at: now,
                activates_at: now,
                pause_until: None,
                rescheduled_by,
            },
            CircuitBreakerTransition::PauseActivated {
                activated_at: now,
                pause_until: None,
                emergency: true,
            },
        )
    }

    /// Materialize a due activation or automatic timed expiry for audit emission.
    pub fn sync<AccountId: Clone>(
        state: &mut CircuitBreakerState<AccountId>,
        now: u64,
    ) -> Option<CircuitBreakerTransition<AccountId>> {
        if !state.emergency_paused {
            if let Some(until) = state.pause_until {
                if now >= until {
                    Self::clear(state);
                    return Some(CircuitBreakerTransition::ResumeActivated {
                        activated_by: None,
                        activated_at: now,
                        automatic: true,
                    });
                }
            }
        }

        if Self::is_paused(state, now) && !state.activation_announced {
            state.activation_announced = true;
            return Some(CircuitBreakerTransition::PauseActivated {
                activated_at: now,
                pause_until: state.pause_until,
                emergency: state.emergency_paused,
            });
        }
        None
    }

    fn clear<AccountId>(state: &mut CircuitBreakerState<AccountId>) {
        state.pause_scheduled_at = None;
        state.pause_activates_at = None;
        state.pause_until = None;
        state.rescheduled_by = None;
        state.resume_scheduled_at = None;
        state.emergency_paused = false;
        state.activation_announced = false;
    }
}

#[cfg(feature = "ink")]
#[derive(Default)]
#[ink::storage_item]
pub struct InkCircuitBreaker {
    pub pause_scheduled_at: Option<u64>,
    pub pause_activates_at: Option<u64>,
    pub pause_until: Option<u64>,
    pub rescheduled_by: Option<ink::primitives::AccountId>,
    pub resume_scheduled_at: Option<u64>,
    pub emergency_paused: bool,
    pub activation_announced: bool,
}

#[cfg(feature = "ink")]
impl InkCircuitBreaker {
    pub fn pause(
        &mut self,
        now: u64,
        duration_seconds: u64,
        scheduled_by: ink::primitives::AccountId,
    ) -> Result<CircuitBreakerTransition<ink::primitives::AccountId>, CircuitBreakerError> {
        let mut state = self.state();
        let transition = CircuitBreaker::pause(&mut state, now, duration_seconds, scheduled_by)?;
        self.store(state);
        Ok(transition)
    }

    pub fn resume(
        &mut self,
        now: u64,
        admin: ink::primitives::AccountId,
    ) -> Result<CircuitBreakerTransition<ink::primitives::AccountId>, CircuitBreakerError> {
        let mut state = self.state();
        let transition = CircuitBreaker::resume(&mut state, now, admin)?;
        self.store(state);
        Ok(transition)
    }

    pub fn is_paused(&self, now: u64) -> bool {
        CircuitBreaker::is_paused(&self.state(), now)
    }

    pub fn emergency_pause(
        &mut self,
        now: u64,
        scheduled_by: ink::primitives::AccountId,
    ) -> (
        CircuitBreakerTransition<ink::primitives::AccountId>,
        CircuitBreakerTransition<ink::primitives::AccountId>,
    ) {
        let mut state = self.state();
        let transitions = CircuitBreaker::emergency_pause(&mut state, now, scheduled_by);
        self.store(state);
        transitions
    }

    pub fn sync(
        &mut self,
        now: u64,
    ) -> Option<CircuitBreakerTransition<ink::primitives::AccountId>> {
        let mut state = self.state();
        let transition = CircuitBreaker::sync(&mut state, now);
        self.store(state);
        transition
    }

    fn state(&self) -> CircuitBreakerState<ink::primitives::AccountId> {
        CircuitBreakerState {
            pause_scheduled_at: self.pause_scheduled_at,
            pause_activates_at: self.pause_activates_at,
            pause_until: self.pause_until,
            rescheduled_by: self.rescheduled_by.clone(),
            resume_scheduled_at: self.resume_scheduled_at,
            emergency_paused: self.emergency_paused,
            activation_announced: self.activation_announced,
        }
    }

    fn store(&mut self, state: CircuitBreakerState<ink::primitives::AccountId>) {
        self.pause_scheduled_at = state.pause_scheduled_at;
        self.pause_activates_at = state.pause_activates_at;
        self.pause_until = state.pause_until;
        self.rescheduled_by = state.rescheduled_by;
        self.resume_scheduled_at = state.resume_scheduled_at;
        self.emergency_paused = state.emergency_paused;
        self.activation_announced = state.activation_announced;
    }
}

#[cfg(feature = "soroban")]
mod soroban_impl {
    use super::{
        CircuitBreaker, CircuitBreakerError, CircuitBreakerState, CircuitBreakerTransition,
    };
    use crate::access_control::{self, AccessControlRole};
    use soroban_sdk::{contracttype, symbol_short, Address, Env, Symbol, Vec};

    use super::{verify_multisig, AdminConfig};

    #[contracttype]
    #[derive(Clone)]
    enum CircuitBreakerKey {
        State,
    }

    #[contracttype]
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct StoredCircuitBreakerState {
        pub pause_scheduled_at: Option<u64>,
        pub pause_activates_at: Option<u64>,
        pub pause_until: Option<u64>,
        pub rescheduled_by: Option<Address>,
        pub resume_scheduled_at: Option<u64>,
        pub emergency_paused: bool,
        pub activation_announced: bool,
    }

    impl Default for StoredCircuitBreakerState {
        fn default() -> Self {
            Self::from_state(CircuitBreakerState::default())
        }
    }

    pub fn init(env: &Env) {
        save(env, StoredCircuitBreakerState::default());
    }

    pub fn pause(env: &Env, governance: &Address, duration_seconds: u64) {
        governance.require_auth();
        access_control::require_role(env, governance, &AccessControlRole::Governance);
        schedule_pause(env, governance, duration_seconds);
    }

    pub fn pause_with_multisig(
        env: &Env,
        governance: &Address,
        duration_seconds: u64,
        signers: Vec<Address>,
        config: AdminConfig,
    ) {
        governance.require_auth();
        access_control::require_role(env, governance, &AccessControlRole::Governance);
        if !verify_multisig(env, signers, &config) {
            panic!("multisig threshold not met");
        }
        schedule_pause(env, governance, duration_seconds);
    }

    pub fn emergency_pause(env: &Env, governance: &Address) {
        governance.require_auth();
        access_control::require_role(env, governance, &AccessControlRole::Governance);
        let mut state = load(env).into_state();
        let transitions = CircuitBreaker::emergency_pause(
            &mut state,
            env.ledger().timestamp(),
            governance.clone(),
        );
        save(env, StoredCircuitBreakerState::from_state(state));
        emit(env, transitions.0);
        emit(env, transitions.1);
    }

    pub fn resume(env: &Env, admin: &Address) {
        admin.require_auth();
        access_control::require_role(env, admin, &AccessControlRole::Admin);
        let mut state = load(env).into_state();
        let transition =
            CircuitBreaker::resume(&mut state, env.ledger().timestamp(), admin.clone())
                .unwrap_or_else(|error| match error {
                    CircuitBreakerError::NotPaused => panic!("contract not paused"),
                    CircuitBreakerError::ResumeTimelockActive => panic!("resume timelock active"),
                    _ => panic!("invalid circuit breaker state"),
                });
        save(env, StoredCircuitBreakerState::from_state(state));
        emit(env, transition);
    }

    pub fn is_paused(env: &Env) -> bool {
        sync(env);
        CircuitBreaker::is_paused(&load(env).into_state(), env.ledger().timestamp())
    }

    pub fn require_not_paused(env: &Env) {
        if is_paused(env) {
            panic!("Contract paused");
        }
    }

    pub fn state(env: &Env) -> StoredCircuitBreakerState {
        load(env)
    }

    fn schedule_pause(env: &Env, scheduled_by: &Address, duration_seconds: u64) {
        let mut state = load(env).into_state();
        let transition = CircuitBreaker::pause(
            &mut state,
            env.ledger().timestamp(),
            duration_seconds,
            scheduled_by.clone(),
        )
        .unwrap_or_else(|_| panic!("invalid pause duration"));
        save(env, StoredCircuitBreakerState::from_state(state));
        emit(env, transition);
    }

    fn sync(env: &Env) {
        let mut state = load(env).into_state();
        if let Some(transition) = CircuitBreaker::sync(&mut state, env.ledger().timestamp()) {
            save(env, StoredCircuitBreakerState::from_state(state));
            emit(env, transition);
        }
    }

    fn load(env: &Env) -> StoredCircuitBreakerState {
        env.storage()
            .instance()
            .get(&CircuitBreakerKey::State)
            .unwrap_or_default()
    }

    fn save(env: &Env, state: StoredCircuitBreakerState) {
        env.storage()
            .instance()
            .set(&CircuitBreakerKey::State, &state);
    }

    fn emit(env: &Env, transition: CircuitBreakerTransition<Address>) {
        match transition {
            CircuitBreakerTransition::PauseScheduled {
                scheduled_by,
                scheduled_at,
                activates_at,
                pause_until,
                rescheduled_by,
            } => env.events().publish(
                (symbol_short!("CBREAK"), Symbol::new(env, "PauseScheduled")),
                (
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                    pause_until,
                    rescheduled_by,
                ),
            ),
            CircuitBreakerTransition::PauseActivated {
                activated_at,
                pause_until,
                emergency,
            } => env.events().publish(
                (symbol_short!("CBREAK"), Symbol::new(env, "PauseActivated")),
                (activated_at, pause_until, emergency),
            ),
            CircuitBreakerTransition::ResumeScheduled {
                scheduled_by,
                scheduled_at,
                activates_at,
            } => env.events().publish(
                (symbol_short!("CBREAK"), Symbol::new(env, "ResumeScheduled")),
                (scheduled_by, scheduled_at, activates_at),
            ),
            CircuitBreakerTransition::ResumeActivated {
                activated_by,
                activated_at,
                automatic,
            } => env.events().publish(
                (symbol_short!("CBREAK"), Symbol::new(env, "ResumeActivated")),
                (activated_by, activated_at, automatic),
            ),
        }
    }

    impl StoredCircuitBreakerState {
        fn into_state(self) -> CircuitBreakerState<Address> {
            CircuitBreakerState {
                pause_scheduled_at: self.pause_scheduled_at,
                pause_activates_at: self.pause_activates_at,
                pause_until: self.pause_until,
                rescheduled_by: self.rescheduled_by,
                resume_scheduled_at: self.resume_scheduled_at,
                emergency_paused: self.emergency_paused,
                activation_announced: self.activation_announced,
            }
        }

        fn from_state(state: CircuitBreakerState<Address>) -> Self {
            Self {
                pause_scheduled_at: state.pause_scheduled_at,
                pause_activates_at: state.pause_activates_at,
                pause_until: state.pause_until,
                rescheduled_by: state.rescheduled_by,
                resume_scheduled_at: state.resume_scheduled_at,
                emergency_paused: state.emergency_paused,
                activation_announced: state.activation_announced,
            }
        }
    }
}

#[cfg(feature = "soroban")]
pub use soroban_impl::*;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn pause_has_distinct_scheduled_active_and_expired_boundaries() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::pause(&mut state, 10, 100, 1u8).unwrap();
        assert!(!CircuitBreaker::is_paused(
            &state,
            10 + PAUSE_TIMELOCK_SECONDS - 1
        ));
        assert!(CircuitBreaker::is_paused(
            &state,
            10 + PAUSE_TIMELOCK_SECONDS
        ));
        assert!(!CircuitBreaker::is_paused(
            &state,
            10 + PAUSE_TIMELOCK_SECONDS + 100
        ));
    }

    #[test]
    fn resume_requires_two_calls_separated_by_timelock() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::emergency_pause(&mut state, 10, 1u8);
        assert!(matches!(
            CircuitBreaker::resume(&mut state, 20, 2u8),
            Ok(CircuitBreakerTransition::ResumeScheduled { .. })
        ));
        assert_eq!(
            CircuitBreaker::resume(&mut state, 20 + RESUME_TIMELOCK_SECONDS - 1, 2u8),
            Err(CircuitBreakerError::ResumeTimelockActive)
        );
        assert!(matches!(
            CircuitBreaker::resume(&mut state, 20 + RESUME_TIMELOCK_SECONDS, 2u8),
            Ok(CircuitBreakerTransition::ResumeActivated { .. })
        ));
        assert!(!CircuitBreaker::is_paused(&state, u64::MAX));
    }

    #[test]
    fn rescheduling_before_activation_moves_the_window() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::pause(&mut state, 100, 600, 1u8).unwrap();
        let reschedule_at = 100 + PAUSE_TIMELOCK_SECONDS - 1;
        CircuitBreaker::pause(&mut state, reschedule_at, 900, 2u8).unwrap();

        assert_eq!(state.rescheduled_by, Some(2));
        assert!(!CircuitBreaker::is_paused(
            &state,
            100 + PAUSE_TIMELOCK_SECONDS
        ));
        assert!(CircuitBreaker::is_paused(
            &state,
            reschedule_at + PAUSE_TIMELOCK_SECONDS
        ));
    }

    #[test]
    fn resume_request_cannot_bypass_either_timelock() {
        let mut state = CircuitBreakerState::default();
        CircuitBreaker::pause(&mut state, 0, 10_000, 1u8).unwrap();
        let resume_requested_at = PAUSE_TIMELOCK_SECONDS - 1;
        CircuitBreaker::resume(&mut state, resume_requested_at, 9u8).unwrap();

        assert!(CircuitBreaker::is_paused(&state, PAUSE_TIMELOCK_SECONDS));
        assert_eq!(
            CircuitBreaker::resume(
                &mut state,
                resume_requested_at + RESUME_TIMELOCK_SECONDS - 1,
                9u8,
            ),
            Err(CircuitBreakerError::ResumeTimelockActive)
        );
    }

    #[test]
    fn governance_cannot_shorten_or_replace_an_emergency_pause() {
        let mut timed = CircuitBreakerState::default();
        CircuitBreaker::pause(&mut timed, 0, 10_000, 1u8).unwrap();
        let activation = PAUSE_TIMELOCK_SECONDS;
        let original_until = timed.pause_until;
        CircuitBreaker::pause(&mut timed, activation, 1, 2u8).unwrap();
        assert_eq!(timed.pause_until, original_until);

        let mut emergency = CircuitBreakerState::default();
        CircuitBreaker::emergency_pause(&mut emergency, 10, 1u8);
        assert_eq!(
            CircuitBreaker::pause(&mut emergency, 11, 1, 2u8),
            Err(CircuitBreakerError::EmergencyPauseActive)
        );
    }
}
