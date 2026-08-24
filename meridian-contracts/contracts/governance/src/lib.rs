#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, String, Symbol, Vec,
};
use stellar_insured_lib::access_control::{self, AccessControlRole};
use stellar_insured_lib::events::emit_event_with;
use stellar_insured_lib::state_root::get_state_root;
use stellar_insured_lib::{GovernanceAction, GovernanceError, PolicyPatch, Proposal};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    SlashingContract,
    ClaimsContract,
    RiskPoolContract,
    PolicyContract,
    Proposal(u64),
    ProposalCounter,
    VoterRecord(u64, Address),
    VotingPeriod,
    GovernanceActionPending(u64), // proposal_id -> GovernanceAction
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VoteRecord {
    pub voter: Address,
    pub weight: i128,
    pub is_yes: bool,
    pub timestamp: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProposalStats {
    pub yes_votes: i128,
    pub no_votes: i128,
    pub total_votes: i128,
    pub status: Symbol,
}

// --- Storage helpers (#378: data access abstraction) ---

fn get_voting_period(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::VotingPeriod)
        .unwrap()
}

fn get_proposal_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::ProposalCounter)
        .unwrap_or(0)
}

fn get_proposal_inner(env: &Env, proposal_id: u64) -> Proposal {
    env.storage()
        .persistent()
        .get(&DataKey::Proposal(proposal_id))
        .expect("Proposal not found")
}

fn set_proposal(env: &Env, proposal_id: u64, proposal: &Proposal) {
    env.storage()
        .persistent()
        .set(&DataKey::Proposal(proposal_id), proposal);
}

// --------------------------------------------------------

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        slashing_contract: Address,
        voting_period: u64,
        claims_contract: Address,
        risk_pool_contract: Address,
        policy_contract: Address,
    ) -> Result<(), GovernanceError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(GovernanceError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage()
            .instance()
            .set(&DataKey::SlashingContract, &slashing_contract);
        env.storage()
            .instance()
            .set(&DataKey::VotingPeriod, &voting_period);
        env.storage()
            .instance()
            .set(&DataKey::ProposalCounter, &0u64);
        env.storage()
            .instance()
            .set(&DataKey::ClaimsContract, &claims_contract);
        env.storage()
            .instance()
            .set(&DataKey::RiskPoolContract, &risk_pool_contract);
        env.storage()
            .instance()
            .set(&DataKey::PolicyContract, &policy_contract);
        access_control::init_access_control(&env, &admin);

        // Canonical, indexed event emission (see stellar_insured_lib::events).
        emit_event_with(&env, symbol_short!("GOV"), symbol_short!("INIT"), &admin);
        Ok(())
    }

    pub fn set_role(
        env: Env,
        addr: Address,
        role: AccessControlRole,
    ) -> Result<(), GovernanceError> {
        access_control::set_role(&env, &env.current_contract_address(), &addr, role);
        Ok(())
    }

    pub fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        execution_data: String,
        threshold_percentage: u32,
    ) -> Result<u64, GovernanceError> {
        creator.require_auth();

        let mut counter = get_proposal_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::ProposalCounter, &counter);

        let voting_period: u64 = env
            .storage()
            .instance()
            .get(&DataKey::VotingPeriod)
            .ok_or(GovernanceError::NotInitialized)?;

        let proposal = Proposal {
            id: counter,
            title,
            description,
            execution_data,
            creator: creator.clone(),
            expires_at: env.ledger().timestamp() + get_voting_period(&env),
            threshold_percentage,
            yes_votes: 0,
            no_votes: 0,
            is_finalized: false,
            is_executed: false,
        };

        set_proposal(&env, counter, &proposal);

        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("CREATED"),
            &proposal,
        );

        Ok(counter)
    }

    pub fn create_slashing_proposal(
        env: Env,
        creator: Address,
        target: Address,
        role: Symbol,
        reason: String,
        amount: i128,
        threshold: u32,
    ) -> Result<u64, GovernanceError> {
        creator.require_auth();

        let title = String::from_str(&env, "Slashing Proposal");
        let execution_data = String::from_str(&env, "slash_call");

        let mut counter = get_proposal_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::ProposalCounter, &counter);

        let proposal = Proposal {
            id: counter,
            title,
            description: reason,
            execution_data,
            creator: creator.clone(),
            expires_at: env.ledger().timestamp() + get_voting_period(&env),
            threshold_percentage: threshold,
            yes_votes: 0,
            no_votes: 0,
            is_finalized: false,
            is_executed: false,
        };

        set_proposal(&env, counter, &proposal);

        // #601: persist the slashing action so execute_proposal can carry it out.
        let action = GovernanceAction::Slashing(target.clone(), role.clone(), amount);
        env.storage()
            .persistent()
            .set(&DataKey::GovernanceActionPending(counter), &action);

        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("SLASH_PRO"),
            &proposal,
        );

        Ok(counter)
    }

    // #411: Create governance proposal for claim approval
    pub fn create_claim_approval_proposal(
        env: Env,
        creator: Address,
        claim_id: u64,
        threshold: u32,
    ) -> Result<u64, GovernanceError> {
        creator.require_auth();

        let title = String::from_str(&env, "Claim Approval Proposal");
        let description = String::from_str(&env, "DAO vote required for claim approval");
        let execution_data = String::from_str(&env, "approve_claim");

        let mut counter = get_proposal_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::ProposalCounter, &counter);

        let voting_period: u64 = env
            .storage()
            .instance()
            .get(&DataKey::VotingPeriod)
            .ok_or(GovernanceError::NotInitialized)?;

        let proposal = Proposal {
            id: counter,
            title,
            description,
            execution_data,
            creator: creator.clone(),
            expires_at: env.ledger().timestamp() + voting_period,
            threshold_percentage: threshold,
            yes_votes: 0,
            no_votes: 0,
            is_finalized: false,
            is_executed: false,
        };

        set_proposal(&env, counter, &proposal);

        // Store the governance action
        let action = GovernanceAction::ClaimApproval(claim_id);
        env.storage()
            .persistent()
            .set(&DataKey::GovernanceActionPending(counter), &action);

        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("CLAIM_PRO"),
            &proposal,
        );

        Ok(counter)
    }

    // #411: Create governance proposal for fund allocation
    pub fn create_fund_allocation_proposal(
        env: Env,
        creator: Address,
        recipient: Address,
        amount: i128,
        threshold: u32,
    ) -> Result<u64, GovernanceError> {
        creator.require_auth();

        let title = String::from_str(&env, "Fund Allocation Proposal");
        let description = String::from_str(&env, "DAO vote required for fund allocation");
        let execution_data = String::from_str(&env, "allocate_funds");

        let mut counter = get_proposal_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::ProposalCounter, &counter);

        let voting_period: u64 = env
            .storage()
            .instance()
            .get(&DataKey::VotingPeriod)
            .ok_or(GovernanceError::NotInitialized)?;

        let proposal = Proposal {
            id: counter,
            title,
            description,
            execution_data,
            creator: creator.clone(),
            expires_at: env.ledger().timestamp() + voting_period,
            threshold_percentage: threshold,
            yes_votes: 0,
            no_votes: 0,
            is_finalized: false,
            is_executed: false,
        };

        set_proposal(&env, counter, &proposal);

        // Store the governance action
        let action = GovernanceAction::FundAllocation(recipient.clone(), amount);
        env.storage()
            .persistent()
            .set(&DataKey::GovernanceActionPending(counter), &action);

        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("FUND_PROP"),
            &proposal,
        );

        Ok(counter)
    }

    // #609: Create governance proposal for a DAO-controlled policy change
    pub fn create_policy_change_proposal(
        env: Env,
        creator: Address,
        policy_id: u64,
        patch: PolicyPatch,
        threshold: u32,
    ) -> Result<u64, GovernanceError> {
        creator.require_auth();

        let title = String::from_str(&env, "Policy Change Proposal");
        let description = String::from_str(&env, "DAO vote required for policy parameter change");
        let execution_data = String::from_str(&env, "policy_change");

        let mut counter = get_proposal_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::ProposalCounter, &counter);

        let voting_period: u64 = env
            .storage()
            .instance()
            .get(&DataKey::VotingPeriod)
            .ok_or(GovernanceError::NotInitialized)?;

        let proposal = Proposal {
            id: counter,
            title,
            description,
            execution_data,
            creator: creator.clone(),
            expires_at: env.ledger().timestamp() + voting_period,
            threshold_percentage: threshold,
            yes_votes: 0,
            no_votes: 0,
            is_finalized: false,
            is_executed: false,
        };

        set_proposal(&env, counter, &proposal);

        // Store the governance action
        let action = GovernanceAction::PolicyChange(policy_id, patch);
        env.storage()
            .persistent()
            .set(&DataKey::GovernanceActionPending(counter), &action);

        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("POLICY_PR"),
            &proposal,
        );

        Ok(counter)
    }

    /// Create a proposal that schedules a timed pause on another contract.
    pub fn create_pause_proposal(
        env: Env,
        creator: Address,
        target_contract: Address,
        duration_seconds: u64,
        threshold: u32,
    ) -> Result<u64, GovernanceError> {
        creator.require_auth();
        if duration_seconds == 0 {
            return Err(GovernanceError::InvalidPauseDuration);
        }

        let mut counter = get_proposal_counter(&env);
        counter += 1;
        env.storage()
            .instance()
            .set(&DataKey::ProposalCounter, &counter);

        let proposal = Proposal {
            id: counter,
            title: String::from_str(&env, "Circuit Breaker Pause"),
            description: String::from_str(&env, "Governance-scheduled contract pause"),
            execution_data: String::from_str(&env, "pause_contract"),
            creator,
            expires_at: env.ledger().timestamp() + get_voting_period(&env),
            threshold_percentage: threshold,
            yes_votes: 0,
            no_votes: 0,
            is_finalized: false,
            is_executed: false,
        };
        set_proposal(&env, counter, &proposal);
        env.storage().persistent().set(
            &DataKey::GovernanceActionPending(counter),
            &GovernanceAction::PauseContract(target_contract, duration_seconds),
        );
        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("PAUSE_PR"),
            &proposal,
        );
        Ok(counter)
    }

    pub fn vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        weight: i128,
        is_yes: bool,
    ) -> Result<(), GovernanceError> {
        voter.require_auth();

        let mut proposal = get_proposal_inner(&env, proposal_id);

        if env.ledger().timestamp() > proposal.expires_at {
            return Err(GovernanceError::VotingPeriodEnded);
        }

        let record_key = DataKey::VoterRecord(proposal_id, voter.clone());
        if env.storage().persistent().has(&record_key) {
            return Err(GovernanceError::AlreadyVoted);
        }

        if is_yes {
            proposal.yes_votes += weight;
        } else {
            proposal.no_votes += weight;
        }

        let record = VoteRecord {
            voter: voter.clone(),
            weight,
            is_yes,
            timestamp: env.ledger().timestamp(),
        };

        set_proposal(&env, proposal_id, &proposal);
        env.storage().persistent().set(&record_key, &record);

        emit_event_with(&env, symbol_short!("GOV"), symbol_short!("VOTE"), &record);
        Ok(())
    }

    pub fn finalize_proposal(env: Env, proposal_id: u64) -> Result<(), GovernanceError> {
        let mut proposal = get_proposal_inner(&env, proposal_id);

        if env.ledger().timestamp() <= proposal.expires_at {
            return Err(GovernanceError::VotingPeriodNotEnded);
        }

        proposal.is_finalized = true;
        set_proposal(&env, proposal_id, &proposal);

        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("FINAL"),
            &proposal,
        );
        Ok(())
    }

    pub fn execute_proposal(env: Env, proposal_id: u64) -> Result<(), GovernanceError> {
        let mut proposal = get_proposal_inner(&env, proposal_id);

        if !proposal.is_finalized {
            return Err(GovernanceError::MustFinalizeFirst);
        }

        if proposal.is_executed {
            return Err(GovernanceError::AlreadyExecuted);
        }

        let total_votes = proposal.yes_votes + proposal.no_votes;
        if total_votes == 0
            || (proposal.yes_votes * 100 / total_votes) < proposal.threshold_percentage as i128
        {
            return Err(GovernanceError::ThresholdNotMet);
        }

        // #411: Execute governance action if exists
        let action_key = DataKey::GovernanceActionPending(proposal_id);
        if env.storage().persistent().has(&action_key) {
            let action: GovernanceAction = env.storage().persistent().get(&action_key).unwrap();

            match action {
                GovernanceAction::ClaimApproval(claim_id) => {
                    // Call claims contract to approve the claim
                    let claims_contract: Address = env
                        .storage()
                        .instance()
                        .get(&DataKey::ClaimsContract)
                        .ok_or(GovernanceError::ClaimsContractNotSet)?;
                    env.invoke_contract::<()>(
                        &claims_contract,
                        &symbol_short!("approve"),
                        soroban_sdk::vec![&env, claim_id.into_val(&env)],
                    );
                }
                GovernanceAction::FundAllocation(recipient, amount) => {
                    // Call risk pool to allocate funds
                    let risk_pool: Address = env
                        .storage()
                        .instance()
                        .get(&DataKey::RiskPoolContract)
                        .ok_or(GovernanceError::RiskPoolContractNotSet)?;
                    env.invoke_contract::<()>(
                        &risk_pool,
                        &symbol_short!("payout"),
                        soroban_sdk::vec![&env, recipient.into_val(&env), amount.into_val(&env)],
                    );
                }
                GovernanceAction::PolicyChange(policy_id, patch) => {
                    // #609: apply the DAO-approved patch through the policy
                    // contract's governance-gated entry point.
                    let policy_contract: Address = env
                        .storage()
                        .instance()
                        .get(&DataKey::PolicyContract)
                        .ok_or(GovernanceError::PolicyContractNotSet)?;
                    env.invoke_contract::<()>(
                        &policy_contract,
                        &Symbol::new(&env, "apply_governance_update"),
                        soroban_sdk::vec![&env, policy_id.into_val(&env), patch.into_val(&env)],
                    );
                }
                GovernanceAction::Slashing(target, role, amount) => {
                    // #601: end-to-end slashing pipeline.
                    // 1. Slash the target's stake via the slashing contract.
                    let slashing_contract: Address = env
                        .storage()
                        .instance()
                        .get(&DataKey::SlashingContract)
                        .ok_or(GovernanceError::SlashingContractNotSet)?;
                    let reason = String::from_str(&env, "governance_slash");
                    env.invoke_contract::<()>(
                        &slashing_contract,
                        &Symbol::new(&env, "slash_funds"),
                        soroban_sdk::vec![
                            &env,
                            target.clone().into_val(&env),
                            role.clone().into_val(&env),
                            reason.into_val(&env),
                            amount.into_val(&env),
                        ],
                    );

                    // 2. Route the slashed stake to the risk pool (mirrors the
                    //    oracle's slash_source -> risk_pool transfer).
                    let risk_pool: Address = env
                        .storage()
                        .instance()
                        .get(&DataKey::RiskPoolContract)
                        .ok_or(GovernanceError::RiskPoolContractNotSet)?;
                    env.invoke_contract::<()>(
                        &risk_pool,
                        &Symbol::new(&env, "absorb_slash"),
                        soroban_sdk::vec![
                            &env,
                            target.clone().into_val(&env),
                            amount.into_val(&env),
                        ],
                    );

                    // 3. Emit a structured Slashed event from governance.
                    emit_event_with(
                        &env,
                        symbol_short!("GOV"),
                        symbol_short!("SLASHED"),
                        &(proposal_id, target.clone(), role.clone(), amount),
                    );
                }
                GovernanceAction::PauseContract(target_contract, duration_seconds) => {
                    env.invoke_contract::<()>(
                        &target_contract,
                        &Symbol::new(&env, "pause"),
                        soroban_sdk::vec![
                            &env,
                            env.current_contract_address().into_val(&env),
                            duration_seconds.into_val(&env),
                        ],
                    );
                    emit_event_with(
                        &env,
                        symbol_short!("GOV"),
                        symbol_short!("PAUSE_EX"),
                        &(proposal_id, target_contract, duration_seconds),
                    );
                }
            }

            // Remove the pending action
            env.storage().persistent().remove(&action_key);
        }

        proposal.is_executed = true;
        set_proposal(&env, proposal_id, &proposal);

        emit_event_with(
            &env,
            symbol_short!("GOV"),
            symbol_short!("EXECUTED"),
            &proposal,
        );
        Ok(())
    }

    pub fn execute_slashing_proposal(env: Env, proposal_id: u64) -> Result<(), GovernanceError> {
        Self::execute_proposal(env, proposal_id)
    }
}

#[contractimpl]
impl GovernanceContract {
    pub fn get_proposal(env: Env, proposal_id: u64) -> Proposal {
        get_proposal_inner(&env, proposal_id)
    }

    pub fn get_state_root(env: Env) -> soroban_sdk::BytesN<32> {
        get_state_root(&env)
    }

    pub fn get_active_proposals(env: Env) -> Vec<u64> {
        let counter = get_proposal_counter(&env);
        let mut list = Vec::new(&env);
        let now = env.ledger().timestamp();
        for i in 1..=counter {
            if let Some(p) = env
                .storage()
                .persistent()
                .get::<DataKey, Proposal>(&DataKey::Proposal(i))
            {
                if !p.is_finalized && now <= p.expires_at {
                    list.push_back(i);
                }
            }
        }
        list
    }

    pub fn get_proposal_stats(env: Env, proposal_id: u64) -> ProposalStats {
        let p = get_proposal_inner(&env, proposal_id);
        let now = env.ledger().timestamp();
        let status = if p.is_executed {
            symbol_short!("executed")
        } else if p.is_finalized {
            symbol_short!("finalized")
        } else if now > p.expires_at {
            symbol_short!("expired")
        } else {
            symbol_short!("active")
        };

        ProposalStats {
            yes_votes: p.yes_votes,
            no_votes: p.no_votes,
            total_votes: p.yes_votes + p.no_votes,
            status,
        }
    }

    pub fn get_all_proposals(env: Env) -> Vec<u64> {
        let counter = get_proposal_counter(&env);
        let mut list = Vec::new(&env);
        for i in 1..=counter {
            list.push_back(i);
        }
        list
    }

    pub fn get_vote_record(env: Env, proposal_id: u64, voter: Address) -> Option<VoteRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::VoterRecord(proposal_id, voter))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    fn setup() -> (Env, Address, Address) {
        let env = Env::default();
        let contract = env.register_contract(None, GovernanceContract);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let slashing = Address::generate(&env);
        let claims = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        let policy = Address::generate(&env);
        env.mock_all_auths();
        env.as_contract(&contract, || {
            GovernanceContract::initialize(
                env.clone(),
                admin.clone(),
                token,
                slashing,
                1000,
                claims,
                risk_pool,
                policy,
            )
            .unwrap();
        });
        (env, contract, admin)
    }

    #[test]
    fn test_initialize_sets_admin_role() {
        let (env, contract, admin) = setup();
        env.as_contract(&contract, || {
            assert!(access_control::has_role(
                &env,
                &admin,
                &AccessControlRole::Admin
            ));
        });
    }

    #[test]
    fn test_pause_proposal_stores_target_and_duration() {
        let (env, contract, _admin) = setup();
        let creator = Address::generate(&env);
        let target = Address::generate(&env);
        env.as_contract(&contract, || {
            let proposal_id = GovernanceContract::create_pause_proposal(
                env.clone(),
                creator,
                target.clone(),
                7_200,
                60,
            )
            .unwrap();
            let action: GovernanceAction = env
                .storage()
                .persistent()
                .get(&DataKey::GovernanceActionPending(proposal_id))
                .unwrap();
            assert_eq!(action, GovernanceAction::PauseContract(target, 7_200));
        });
    }
}

// #601: end-to-end slashing pipeline (Governance -> Slashing -> Risk Pool).
#[cfg(test)]
mod slashing_pipeline_tests {
    use super::{GovernanceContract, GovernanceContractClient};
    use soroban_sdk::testutils::{Address as _, Ledger as _};
    use soroban_sdk::{token, Address, Env, String, Symbol};
    use stellar_insured_lib::access_control::AccessControlRole;
    use stellar_insured_lib::circuit_breaker::PAUSE_TIMELOCK_SECONDS;
    use stellar_insured_risk_pool::{RiskPoolContract, RiskPoolContractClient};
    use stellar_insured_slashing::{SlashingContract, SlashingContractClient};

    const VOTING_PERIOD: u64 = 1000;
    const MIN_STAKE: i128 = 100;
    const INITIAL_STAKE: i128 = 500;
    const SLASH_AMOUNT: i128 = 200;

    // Holds only owned values (no borrowed clients), so tests build their own
    // clients from `env` + the contract ids. This avoids a self-referential
    // struct (clients borrow `&env`).
    struct Harness {
        env: Env,
        gov_id: Address,
        slash_id: Address,
        pool_id: Address,
        target: Address,
        creator: Address,
        voter: Address,
        role: Symbol,
    }

    impl Harness {
        fn gov(&self) -> GovernanceContractClient<'_> {
            GovernanceContractClient::new(&self.env, &self.gov_id)
        }
        fn slashing(&self) -> SlashingContractClient<'_> {
            SlashingContractClient::new(&self.env, &self.slash_id)
        }
        fn pool(&self) -> RiskPoolContractClient<'_> {
            RiskPoolContractClient::new(&self.env, &self.pool_id)
        }
        fn advance_past_voting_period(&self) {
            self.env.ledger().with_mut(|li| {
                li.timestamp += VOTING_PERIOD + 1;
            });
        }
    }

    fn setup() -> Harness {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let voter = Address::generate(&env);
        let target = Address::generate(&env);
        let claims = Address::generate(&env);
        let policy = Address::generate(&env);
        let role = Symbol::new(&env, "validator");

        // Token used by the risk pool; mint the target enough to stake.
        let token_admin = Address::generate(&env);
        let token_id = env.register_stellar_asset_contract(token_admin);
        token::StellarAssetClient::new(&env, &token_id).mint(&target, &1_000);

        // Register the three contracts.
        let gov_id = env.register_contract(None, GovernanceContract);
        let slash_id = env.register_contract(None, SlashingContract);
        let pool_id = env.register_contract(None, RiskPoolContract);

        let gov = GovernanceContractClient::new(&env, &gov_id);
        let slashing = SlashingContractClient::new(&env, &slash_id);
        let pool = RiskPoolContractClient::new(&env, &pool_id);

        pool.initialize(&admin, &token_id, &MIN_STAKE);
        slashing.initialize(&admin, &gov_id, &pool_id);
        gov.initialize(
            &admin,
            &token_id,
            &slash_id,
            &VOTING_PERIOD,
            &claims,
            &pool_id,
            &policy,
        );

        // The role checks in slash_funds / absorb_slash gate on the callee
        // contract's own address holding the Governance role, and
        // add_slashable_role gates on Admin. Grant both to the contracts.
        slashing.set_role(&slash_id, &AccessControlRole::Admin);
        slashing.set_role(&slash_id, &AccessControlRole::Governance);
        slashing.add_slashable_role(&role);
        pool.set_role(&pool_id, &AccessControlRole::Governance);

        // Target stakes into the pool so there is something to slash.
        pool.deposit_liquidity(&target, &INITIAL_STAKE);

        Harness {
            env,
            gov_id,
            slash_id,
            pool_id,
            target,
            creator,
            voter,
            role,
        }
    }

    #[test]
    fn passing_slashing_proposal_reduces_stake_and_credits_pool() {
        let h = setup();
        let gov = h.gov();
        let pool = h.pool();
        let slashing = h.slashing();

        // Sanity: pre-slash state.
        assert_eq!(pool.get_provider_info(&h.target), INITIAL_STAKE);
        assert_eq!(pool.get_pool_stats().available_capital, INITIAL_STAKE);
        assert_eq!(slashing.get_violation_count(&h.target, &h.role), 0);

        let reason = String::from_str(&h.env, "misbehaviour");
        let proposal_id = gov.create_slashing_proposal(
            &h.creator,
            &h.target,
            &h.role,
            &reason,
            &SLASH_AMOUNT,
            &50,
        );

        // Pass the threshold: a single yes vote with full weight.
        gov.vote(&h.voter, &proposal_id, &100, &true);

        h.advance_past_voting_period();
        gov.finalize_proposal(&proposal_id);
        gov.execute_slashing_proposal(&proposal_id);

        // Target stake reduced by the slashed amount.
        assert_eq!(
            pool.get_provider_info(&h.target),
            INITIAL_STAKE - SLASH_AMOUNT
        );
        // Risk pool available capital credited with the slashed amount.
        assert_eq!(
            pool.get_pool_stats().available_capital,
            INITIAL_STAKE + SLASH_AMOUNT
        );
        // Slashing contract recorded the slash against the target.
        assert_eq!(slashing.get_violation_count(&h.target, &h.role), 1);
    }

    #[test]
    fn failing_slashing_proposal_leaves_state_unchanged() {
        let h = setup();
        let gov = h.gov();
        let pool = h.pool();
        let slashing = h.slashing();

        let reason = String::from_str(&h.env, "misbehaviour");
        let proposal_id = gov.create_slashing_proposal(
            &h.creator,
            &h.target,
            &h.role,
            &reason,
            &SLASH_AMOUNT,
            &50,
        );

        // Vote no so the yes-threshold is not met.
        gov.vote(&h.voter, &proposal_id, &100, &false);

        h.advance_past_voting_period();
        gov.finalize_proposal(&proposal_id);

        // Execution must fail on the unmet threshold. A declared contract error
        // surfaces as Ok(Err(_)); a host error as Err(_). Assert only that it did
        // not succeed (which would be Ok(Ok(()))).
        let result = gov.try_execute_slashing_proposal(&proposal_id);
        assert!(!matches!(result, Ok(Ok(()))));

        // No state changed anywhere in the pipeline.
        assert_eq!(pool.get_provider_info(&h.target), INITIAL_STAKE);
        assert_eq!(pool.get_pool_stats().available_capital, INITIAL_STAKE);
        assert_eq!(slashing.get_violation_count(&h.target, &h.role), 0);
    }

    #[test]
    fn passing_pause_proposal_schedules_target_circuit_breaker() {
        let h = setup();
        let gov = h.gov();
        let slashing = h.slashing();

        let proposal_id = gov.create_pause_proposal(&h.creator, &h.slash_id, &7_200, &50);
        gov.vote(&h.voter, &proposal_id, &100, &true);
        h.advance_past_voting_period();
        gov.finalize_proposal(&proposal_id);
        gov.execute_proposal(&proposal_id);

        assert!(!slashing.is_paused());
        h.env.ledger().with_mut(|ledger| {
            ledger.timestamp += PAUSE_TIMELOCK_SECONDS;
        });
        assert!(slashing.is_paused());
    }
}

// #609: end-to-end policy-change pipeline (Governance -> Policy).
#[cfg(test)]
mod policy_change_pipeline_tests {
    use super::{GovernanceContract, GovernanceContractClient};
    use soroban_sdk::testutils::{Address as _, Ledger as _};
    use soroban_sdk::{Address, Env};
    use stellar_insured_lib::access_control::AccessControlRole;
    use stellar_insured_lib::{PolicyPatch, PolicyStatus, PolicyType, StatusPatch};
    use stellar_insured_policy::{PolicyContract, PolicyContractClient};

    const VOTING_PERIOD: u64 = 1000;

    // Holds only owned values so tests build their own clients from `env` +
    // the contract ids (avoids a self-referential struct).
    struct Harness {
        env: Env,
        gov_id: Address,
        policy_id: Address,
        policy_record_id: u64,
        creator: Address,
        voter: Address,
    }

    impl Harness {
        fn gov(&self) -> GovernanceContractClient<'_> {
            GovernanceContractClient::new(&self.env, &self.gov_id)
        }
        fn policy(&self) -> PolicyContractClient<'_> {
            PolicyContractClient::new(&self.env, &self.policy_id)
        }
        fn advance_past_voting_period(&self) {
            self.env.ledger().with_mut(|li| {
                li.timestamp += VOTING_PERIOD + 1;
            });
        }
    }

    fn setup() -> Harness {
        let env = Env::default();
        env.mock_all_auths();

        let admin = Address::generate(&env);
        let creator = Address::generate(&env);
        let voter = Address::generate(&env);
        let holder = Address::generate(&env);
        let token = Address::generate(&env);
        let slashing = Address::generate(&env);
        let claims = Address::generate(&env);
        let risk_pool = Address::generate(&env);

        let gov_id = env.register_contract(None, GovernanceContract);
        let policy_id = env.register_contract(None, PolicyContract);

        let gov = GovernanceContractClient::new(&env, &gov_id);
        let policy = PolicyContractClient::new(&env, &policy_id);

        policy.initialize(&admin, &risk_pool);
        // `issue_policy` / `set_governance_contract` gate on the *policy
        // contract's own address* holding Admin (mirrors the slashing/risk_pool
        // self-role pattern used by execute_slashing's Governance-role gate).
        policy.set_role(&policy_id, &AccessControlRole::Admin);
        policy.set_governance_contract(&gov_id);

        gov.initialize(
            &admin,
            &token,
            &slashing,
            &VOTING_PERIOD,
            &claims,
            &risk_pool,
            &policy_id,
        );

        let policy_record_id =
            policy.issue_policy(&holder, &1000, &100, &365, &PolicyType::Standard);

        Harness {
            env,
            gov_id,
            policy_id,
            policy_record_id,
            creator,
            voter,
        }
    }

    #[test]
    fn passing_policy_change_proposal_patches_policy() {
        let h = setup();
        let gov = h.gov();
        let policy = h.policy();

        let patch = PolicyPatch {
            coverage_amount: Some(2500),
            premium_amount: None,
            status: StatusPatch::Set(PolicyStatus::Cancelled),
        };

        let proposal_id =
            gov.create_policy_change_proposal(&h.creator, &h.policy_record_id, &patch, &50);
        gov.vote(&h.voter, &proposal_id, &100, &true);

        h.advance_past_voting_period();
        gov.finalize_proposal(&proposal_id);
        gov.execute_proposal(&proposal_id);

        let updated = policy.get_policy(&h.policy_record_id);
        assert_eq!(updated.coverage_amount, 2500);
        assert_eq!(updated.status, PolicyStatus::Cancelled);
    }

    #[test]
    fn failing_policy_change_proposal_leaves_policy_unchanged() {
        let h = setup();
        let gov = h.gov();
        let policy = h.policy();

        let patch = PolicyPatch {
            coverage_amount: Some(2500),
            premium_amount: None,
            status: StatusPatch::Keep,
        };

        let proposal_id =
            gov.create_policy_change_proposal(&h.creator, &h.policy_record_id, &patch, &50);

        // Vote no so the yes-threshold is not met.
        gov.vote(&h.voter, &proposal_id, &100, &false);

        h.advance_past_voting_period();
        gov.finalize_proposal(&proposal_id);

        // Execution must fail on the unmet threshold. A declared contract error
        // surfaces as Ok(Err(_)); a host error as Err(_). Assert only that it did
        // not succeed (which would be Ok(Ok(()))).
        let result = gov.try_execute_proposal(&proposal_id);
        assert!(!matches!(result, Ok(Ok(()))));

        // No state changed anywhere in the pipeline.
        let unchanged = policy.get_policy(&h.policy_record_id);
        assert_eq!(unchanged.coverage_amount, 1000);
        assert_eq!(unchanged.status, PolicyStatus::Active);
    }
}

// =========================================================================
// Formal verification and property-based tests (#630)
// =========================================================================

#[cfg(all(test, feature = "verification"))]
mod verification_tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::{Address, Env};

    /// Kani harness: yes_votes + no_votes == total_weight.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_vote_sum_equals_total_weight() {
        use stellar_insured_lib::verification::invariants::vote_sum_equals_total_weight;
        let yes_votes: i128 = kani::any();
        let no_votes: i128 = kani::any();
        let total_weight: i128 = kani::any();
        kani::assume(yes_votes >= 0);
        kani::assume(no_votes >= 0);
        kani::assume(total_weight >= 0);
        kani::assume(yes_votes + no_votes == total_weight);
        assert!(vote_sum_equals_total_weight(
            yes_votes,
            no_votes,
            total_weight
        ));
    }

    /// Kani harness: threshold monotonicity — increasing threshold cannot make a
    /// previously failing proposal pass.
    #[cfg(feature = "kani")]
    #[kani::proof]
    fn kani_verify_threshold_monotonic() {
        use stellar_insured_lib::verification::invariants::threshold_monotonic;
        let yes_votes: i128 = kani::any();
        let total_votes: i128 = kani::any();
        let threshold_old: u32 = kani::any();
        let threshold_new: u32 = kani::any();
        kani::assume(yes_votes >= 0);
        kani::assume(total_votes >= 0);
        kani::assume(total_votes > 0);
        kani::assume(threshold_new > threshold_old);
        assert!(threshold_monotonic(
            yes_votes,
            total_votes,
            threshold_old,
            threshold_new
        ));
    }

    /// Property-based test: vote sum equals total weight.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_vote_sum_equals_total_weight() {
        use proptest::prelude::*;
        use stellar_insured_lib::verification::invariants::vote_sum_equals_total_weight;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_vote_sum_equals_total_weight(
                yes_votes in 0i128..=1_000_000_000i128,
                no_votes in 0i128..=1_000_000_000i128,
            ) {
                let total = yes_votes + no_votes;
                prop_assert!(vote_sum_equals_total_weight(yes_votes, no_votes, total));
            }
        }
    }

    /// Property-based test: threshold monotonicity.
    #[cfg(feature = "proptest")]
    #[test]
    fn prop_verify_threshold_monotonic() {
        use proptest::prelude::*;
        use stellar_insured_lib::verification::invariants::threshold_monotonic;

        proptest! {
            #![proptest_config(ProptestConfig::with_cases(1000))]

            #[test]
            fn prop_threshold_monotonic(
                yes_votes in 0i128..=1_000_000_000i128,
                total_votes in 1i128..=1_000_000_000i128,
                threshold_old in 1u32..=100,
                threshold_new in 1u32..=100,
            ) {
                kani::assume(threshold_new > threshold_old);
                let passes_old = total_votes > 0 && (yes_votes * 100 / total_votes) >= threshold_old as i128;
                let passes_new = total_votes > 0 && (yes_votes * 100 / total_votes) >= threshold_new as i128;
                if !passes_old {
                    prop_assert!(!passes_new);
                }
                prop_assert!(threshold_monotonic(yes_votes, total_votes, threshold_old, threshold_new));
            }
        }
    }

    /// End-to-end Soroban test: governance vote invariants hold after voting.
    #[test]
    fn test_governance_vote_invariants() {
        let env = Env::default();
        let contract = env.register_contract(None, GovernanceContract);
        let admin = Address::generate(&env);
        let token = Address::generate(&env);
        let slashing = Address::generate(&env);
        let claims = Address::generate(&env);
        let risk_pool = Address::generate(&env);
        let policy = Address::generate(&env);
        env.mock_all_auths();
        env.as_contract(&contract, || {
            GovernanceContract::initialize(
                env.clone(),
                admin.clone(),
                token,
                slashing,
                1000,
                claims,
                risk_pool,
                policy,
            )
            .unwrap();
        });

        // Create proposal and vote
        let proposal_id = env.as_contract(&contract, || {
            GovernanceContract::create_proposal(
                env.clone(),
                admin.clone(),
                String::from_str(&env, "Test"),
                String::from_str(&env, "Desc"),
                String::from_str(&env, "exec"),
                50,
            )
            .unwrap()
        });

        let voter = Address::generate(&env);
        env.as_contract(&contract, || {
            GovernanceContract::vote(env.clone(), voter, proposal_id, 100, true).unwrap();
        });

        let stats = env.as_contract(&contract, || {
            GovernanceContract::get_proposal_stats(env.clone(), proposal_id)
        });
        assert_eq!(stats.yes_votes + stats.no_votes, stats.total_votes);
        assert_eq!(stats.total_votes, 100);
    }
}
