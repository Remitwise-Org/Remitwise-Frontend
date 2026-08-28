#![cfg_attr(not(feature = "std"), no_std)]
#![allow(unexpected_cfgs)]

//! Dynamic fee contract managing congestion-aware pricing and fee distribution.


use ink::prelude::string::String;
use ink::prelude::vec::Vec;
use ink::storage::Mapping;
use propchain_traits::DynamicFeeProvider;
use propchain_traits::FeeOperation;
use scale::Encode;

mod validation;
mod state_root;

/// Dynamic Fee and Market Mechanism contract for PropChain.
/// Implements congestion-based fees, premium listing auctions, validator incentives,
/// and fee transparency for network participants.
#[ink::contract]
mod propchain_fees {
    use super::*;

    /// Basis points denominator (10000 = 100%)
    const BASIS_POINTS: u128 = 10_000;

    /// Default congestion window: number of recent operations to consider
    const CONGESTION_WINDOW: u32 = 100;
    /// Max fee multiplier from congestion (e.g. 3x base)
    const MAX_CONGESTION_MULTIPLIER: u32 = 300; // 300% of base

    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct FeeConfig {
        /// Base fee per operation (in smallest unit)
        pub base_fee: u128,
        /// Minimum fee (floor)
        pub min_fee: u128,
        /// Maximum fee (floor)
        pub max_fee: u128,
        /// Congestion sensitivity (0-100, higher = more responsive to congestion)
        pub congestion_sensitivity: u32,
        /// Demand factor from recent volume (basis points of base_fee)
        pub demand_factor_bp: u32,
        /// Last update timestamp for automated adjustment
        pub last_updated: u64,
    }

    /// Single data point for congestion/demand history (reserved for future analytics)
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    #[allow(dead_code)]
    pub struct FeeHistoryEntry {
        pub timestamp: u64,
        pub operation_count: u32,
        pub total_fees_collected: u128,
    }

    /// Premium listing auction
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct PremiumAuction {
        pub property_id: u64,
        pub seller: AccountId,
        pub min_bid: u128,
        pub current_bid: u128,
        pub current_bidder: Option<AccountId>,
        pub end_time: u64,
        pub settled: bool,
        pub fee_paid: u128,
    }

    /// Bid in a premium auction
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct AuctionBid {
        pub bidder: AccountId,
        pub amount: u128,
        pub timestamp: u64,
    }

    /// Reward record for validators/participants
    #[derive(Debug, Clone, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct RewardRecord {
        pub account: AccountId,
        pub amount: u128,
        pub reason: RewardReason,
        pub timestamp: u64,
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub enum RewardReason {
        ValidatorReward,
        LiquidityProvider,
        PremiumListingFee,
        ParticipationIncentive,
    }

    /// Fee report for transparency and dashboard
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct FeeReport {
        pub config: FeeConfig,
        pub congestion_index: u32, // 0-100
        pub recommended_fee: u128,
        pub total_fees_collected: u128,
        pub total_distributed: u128,
        pub operation_count_24h: u64,
        pub premium_auctions_active: u32,
        pub timestamp: u64,
    }

    /// Fee estimate for a user (optimization recommendation)
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct FeeEstimate {
        pub operation: FeeOperation,
        pub estimated_fee: u128,
        pub min_fee: u128,
        pub max_fee: u128,
        pub congestion_level: String, // "low" | "medium" | "high"
        pub recommendation: String,
    }

    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum FeeError {
        Unauthorized,
        AuctionNotFound,
        AuctionEnded,
        AuctionNotEnded,
        BidTooLow,
        AlreadySettled,
        InvalidConfig,
        InvalidProperty,
        InvalidFeeAmount,
    }

    #[ink(storage)]
    pub struct FeeManager {
        admin: AccountId,
        /// Fee config per operation type (optional override; else use default)
        operation_config: Mapping<FeeOperation, FeeConfig>,
        /// Default fee config
        default_config: FeeConfig,
        /// Recent operation timestamps for congestion (ring buffer style: count per slot)
        recent_ops_count: u32,
        last_congestion_reset: u64,
        /// Premium listing auctions: auction_id -> PremiumAuction
        auctions: Mapping<u64, PremiumAuction>,
        auction_bids: Mapping<(u64, AccountId), AuctionBid>,
        auction_count: u64,
        /// Accumulated fees (to be distributed)
        fee_treasury: u128,
        /// Validator/participant rewards: account -> pending amount
        pending_rewards: Mapping<AccountId, u128>,
        /// Reward history (for reporting)
        reward_records: Mapping<u64, RewardRecord>,
        reward_record_count: u64,
        /// Total fees collected (all time)
        total_fees_collected: u128,
        /// Total distributed to validators/participants
        total_distributed: u128,
        /// Authorized validators (receive incentive share)
        validators: Mapping<AccountId, bool>,
        /// List of validator accounts for distribution (enumerable)
        validator_list: Vec<AccountId>,
        /// Distribution rate for validators (basis points of collected fees)
        validator_share_bp: u32,
        /// Distribution rate for treasury (rest)
        treasury_share_bp: u32,
    }

    #[ink(event)]
    pub struct FeeConfigUpdated {
        #[ink(topic)]
        by: AccountId,
        operation: Option<FeeOperation>,
        base_fee: u128,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct PremiumAuctionCreated {
        #[ink(topic)]
        auction_id: u64,
        #[ink(topic)]
        property_id: u64,
        #[ink(topic)]
        seller: AccountId,
        min_bid: u128,
        end_time: u64,
        fee_paid: u128,
    }

    #[ink(event)]
    pub struct PremiumAuctionBid {
        #[ink(topic)]
        auction_id: u64,
        #[ink(topic)]
        bidder: AccountId,
        amount: u128,
        outbid_previous: u128,
    }

    #[ink(event)]
    pub struct PremiumAuctionSettled {
        #[ink(topic)]
        auction_id: u64,
        #[ink(topic)]
        property_id: u64,
        #[ink(topic)]
        winner: AccountId,
        amount: u128,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct RewardsDistributed {
        #[ink(topic)]
        recipient: AccountId,
        amount: u128,
        reason: RewardReason,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ValidatorAdded {
        #[ink(topic)]
        account: AccountId,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ValidatorRemoved {
        #[ink(topic)]
        account: AccountId,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct DistributionRatesSet {
        validator_share_bp: u32,
        treasury_share_bp: u32,
        timestamp: u64,
    }

    /// Dynamic fee calculation: base * (1 + congestion_factor + demand_factor)
    fn compute_dynamic_fee(
        config: &FeeConfig,
        congestion_index: u32,
        demand_factor_bp: u32,
    ) -> u128 {
        // Congestion multiplier: 0-100 -> 0% to (MAX_CONGESTION_MULTIPLIER-100)%
        let congestion_bp = (congestion_index as u128)
            .saturating_mul(config.congestion_sensitivity as u128)
            .saturating_mul((MAX_CONGESTION_MULTIPLIER - 100) as u128)
            / 10_000;
        let demand_bp = demand_factor_bp.min(5000); // Cap demand at 50%
        let total_multiplier_bp = 10_000u128
            .saturating_add(congestion_bp)
            .saturating_add(demand_bp as u128);
        let fee = config
            .base_fee
            .saturating_mul(total_multiplier_bp)
            .saturating_div(BASIS_POINTS);
        fee.clamp(config.min_fee, config.max_fee)
    }

    impl FeeManager {
        /// Initialize fee policy bounds and set the deployer as fee administrator.
        #[ink(constructor)]
        pub fn new(base_fee: u128, min_fee: u128, max_fee: u128) -> Self {
            let caller = Self::env().caller();
            let timestamp = Self::env().block_timestamp();
            let default_config = FeeConfig {
                base_fee,
                min_fee,
                max_fee,
                congestion_sensitivity: 80,
                demand_factor_bp: 500,
                last_updated: timestamp,
            };
            Self {
                admin: caller,
                operation_config: Mapping::default(),
                default_config,
                recent_ops_count: 0,
                last_congestion_reset: timestamp,
                auctions: Mapping::default(),
                auction_bids: Mapping::default(),
                auction_count: 0,
                fee_treasury: 0,
                pending_rewards: Mapping::default(),
                reward_records: Mapping::default(),
                reward_record_count: 0,
                total_fees_collected: 0,
                total_distributed: 0,
                validators: Mapping::default(),
                validator_list: Vec::new(),
                validator_share_bp: 5000, // 50% to validators
                treasury_share_bp: 5000,  // 50% to treasury
            }
        }

        /// Require the caller to be the fee administrator before privileged changes.
        fn ensure_admin(&self) -> Result<(), FeeError> {
            if self.env().caller() != self.admin {
                return Err(FeeError::Unauthorized);
            }
            Ok(())
        }

        /// Get config for operation (operation-specific or default)
        fn get_config(&self, op: FeeOperation) -> FeeConfig {
            self.operation_config
                .get(op)
                .unwrap_or(self.default_config.clone())
        }

        /// Compute current congestion index (0-100) from recent activity
        fn congestion_index(&self) -> u32 {
            let now = self.env().block_timestamp();
            let window_secs = 3600u64; // 1 hour window
            if now.saturating_sub(self.last_congestion_reset) > window_secs {
                return 0; // Reset after window
            }
            let count = self.recent_ops_count;
            // Normalize to 0-100: CONGESTION_WINDOW ops = 100
            (count.saturating_mul(100).saturating_div(CONGESTION_WINDOW)).min(100)
        }

        /// Demand factor in basis points (from recent volume)
        fn demand_factor_bp(&self) -> u32 {
            let ci = self.congestion_index();
            self.default_config
                .demand_factor_bp
                .saturating_mul(ci)
                .saturating_div(100)
        }

        // ========== Dynamic fee calculation ==========

        /// Calculate dynamic fee for an operation (read-only)
        #[ink(message)]
        pub fn calculate_fee(&self, operation: FeeOperation) -> u128 {
            let config = self.get_config(operation);
            let congestion = self.congestion_index();
            let demand_bp = self.demand_factor_bp();
            compute_dynamic_fee(&config, congestion, demand_bp)
        }

        /// Record that a fee was collected (called by registry or self after charging)
        #[ink(message)]
        pub fn record_fee_collected(
            &mut self,
            _operation: FeeOperation,
            amount: u128,
            from: AccountId,
        ) -> Result<(), FeeError> {
            let _ = from;
            self.recent_ops_count = self
                .recent_ops_count
                .saturating_add(1)
                .min(CONGESTION_WINDOW);
            let now = self.env().block_timestamp();
            if now.saturating_sub(self.last_congestion_reset) > 3600 {
                self.last_congestion_reset = now;
                self.recent_ops_count = 1;
            }
            self.fee_treasury = self.fee_treasury.saturating_add(amount);
            self.total_fees_collected = self.total_fees_collected.saturating_add(amount);
            Ok(())
        }

        // ========== Automated fee adjustment ==========

        /// Automated fee adjustment based on recent utilization vs target
        #[ink(message)]
        pub fn update_fee_params(&mut self) -> Result<(), FeeError> {
            self.ensure_admin()?;
            let now = self.env().block_timestamp();
            let congestion = self.congestion_index();
            let mut config = self.default_config.clone();
            if congestion > 70 {
                config.base_fee = config
                    .base_fee
                    .saturating_mul(105)
                    .saturating_div(100)
                    .min(config.max_fee);
            } else if congestion < 30 {
                config.base_fee = config
                    .base_fee
                    .saturating_mul(95)
                    .saturating_div(100)
                    .max(config.min_fee);
            }
            config.last_updated = now;
            self.default_config = config.clone();
            self.env().emit_event(FeeConfigUpdated {
                by: self.env().caller(),
                operation: None,
                base_fee: config.base_fee,
                timestamp: now,
            });
            Ok(())
        }

        /// Set fee config for an operation (admin)
        #[ink(message)]
        pub fn set_operation_config(
            &mut self,
            operation: FeeOperation,
            config: FeeConfig,
        ) -> Result<(), FeeError> {
            self.ensure_admin()?;
            if config.min_fee > config.max_fee || config.base_fee < config.min_fee {
                return Err(FeeError::InvalidConfig);
            }
            self.operation_config.insert(operation, &config);
            self.env().emit_event(FeeConfigUpdated {
                by: self.env().caller(),
                operation: Some(operation),
                base_fee: config.base_fee,
                timestamp: self.env().block_timestamp(),
            });
            Ok(())
        }

        // ========== Auction mechanism for premium listings ==========

        /// Create premium listing auction (pay fee; fee goes to treasury)
        #[ink(message)]
        pub fn create_premium_auction(
            &mut self,
            property_id: u64,
            min_bid: u128,
            duration_seconds: u64,
        ) -> Result<u64, FeeError> {
            let caller = self.env().caller();
            let now = self.env().block_timestamp();
            let fee = self.calculate_fee(FeeOperation::PremiumListingBid);
            if fee > 0 {
                self.fee_treasury = self.fee_treasury.saturating_add(fee);
                self.total_fees_collected = self.total_fees_collected.saturating_add(fee);
            }
            self.auction_count += 1;
            let auction_id = self.auction_count;
            let auction = PremiumAuction {
                property_id,
                seller: caller,
                min_bid,
                current_bid: 0,
                current_bidder: None,
                end_time: now.saturating_add(duration_seconds),
                settled: false,
                fee_paid: fee,
            };
            self.auctions.insert(auction_id, &auction);
            self.env().emit_event(PremiumAuctionCreated {
                auction_id,
                property_id,
                seller: caller,
                min_bid,
                end_time: auction.end_time,
                fee_paid: fee,
            });
            Ok(auction_id)
        }

        /// Place or increase bid (bid must be > current_bid and >= min_bid)
        #[ink(message)]
        pub fn place_bid(&mut self, auction_id: u64, amount: u128) -> Result<(), FeeError> {
            let caller = self.env().caller();
            let now = self.env().block_timestamp();
            let mut auction = self
                .auctions
                .get(auction_id)
                .ok_or(FeeError::AuctionNotFound)?;
            if auction.settled {
                return Err(FeeError::AlreadySettled);
            }
            if now >= auction.end_time {
                return Err(FeeError::AuctionEnded);
            }
            if amount < auction.min_bid {
                return Err(FeeError::BidTooLow);
            }
            if amount <= auction.current_bid {
                return Err(FeeError::BidTooLow);
            }
            let outbid = auction.current_bid;
            auction.current_bid = amount;
            auction.current_bidder = Some(caller);
            self.auctions.insert(auction_id, &auction);
            self.auction_bids.insert(
                (auction_id, caller),
                &AuctionBid {
                    bidder: caller,
                    amount,
                    timestamp: now,
                },
            );
            self.env().emit_event(PremiumAuctionBid {
                auction_id,
                bidder: caller,
                amount,
                outbid_previous: outbid,
            });
            Ok(())
        }

        /// Settle auction after end_time; winner is current_bidder
        #[ink(message)]
        pub fn settle_auction(&mut self, auction_id: u64) -> Result<(), FeeError> {
            let now = self.env().block_timestamp();
            let mut auction = self
                .auctions
                .get(auction_id)
                .ok_or(FeeError::AuctionNotFound)?;
            if auction.settled {
                return Err(FeeError::AlreadySettled);
            }
            if now < auction.end_time {
                return Err(FeeError::AuctionNotEnded);
            }
            let winner = auction.current_bidder.ok_or(FeeError::AuctionNotFound)?;
            let amount = auction.current_bid;
            auction.settled = true;
            self.auctions.insert(auction_id, &auction);
            // fee_paid was already added to fee_treasury at auction creation
            self.env().emit_event(PremiumAuctionSettled {
                auction_id,
                property_id: auction.property_id,
                winner,
                amount,
                timestamp: now,
            });
            Ok(())
        }

        /// Return a premium auction by ID when it has been created.
        #[ink(message)]
        pub fn get_auction(&self, auction_id: u64) -> Option<PremiumAuction> {
            self.auctions.get(auction_id)
        }

        /// Return the total number of premium auctions created.
        #[ink(message)]
        pub fn get_auction_count(&self) -> u64 {
            self.auction_count
        }

        #[ink(message)]
        pub fn get_state_root(&self) -> crate::state_root::StateRoot {
            crate::state_root::compute_root(&vec![self.auction_count.encode(), self.total_fees_collected.encode()])
        }

        // ========== Incentives and distribution ==========

        /// Add a validator to the fee distribution set if it is not already present.
        #[ink(message)]
        pub fn add_validator(&mut self, account: AccountId) -> Result<(), FeeError> {
            self.ensure_admin()?;
            if self.validators.get(account).unwrap_or(false) {
                return Ok(());
            }
            self.validators.insert(account, &true);
            self.validator_list.push(account);
            
            self.env().emit_event(ValidatorAdded {
                account,
                timestamp: self.env().block_timestamp(),
            });
            
            Ok(())
        }

        /// Remove a validator from future fee distributions.
        #[ink(message)]
        pub fn remove_validator(&mut self, account: AccountId) -> Result<(), FeeError> {
            self.ensure_admin()?;
            self.validators.remove(account);
            self.validator_list.retain(|&a| a != account);
            
            self.env().emit_event(ValidatorRemoved {
                account,
                timestamp: self.env().block_timestamp(),
            });
            
            Ok(())
        }

        /// Configure how accumulated fees are split between validators and treasury.
        #[ink(message)]
        pub fn set_distribution_rates(
            &mut self,
            validator_share_bp: u32,
            treasury_share_bp: u32,
        ) -> Result<(), FeeError> {
            self.ensure_admin()?;
            if validator_share_bp.saturating_add(treasury_share_bp) > 10_000 {
                return Err(FeeError::InvalidConfig);
            }
            self.validator_share_bp = validator_share_bp;
            self.treasury_share_bp = treasury_share_bp;
            
            self.env().emit_event(DistributionRatesSet {
                validator_share_bp,
                treasury_share_bp,
                timestamp: self.env().block_timestamp(),
            });
            
            Ok(())
        }

        /// Distribute accumulated fees: validator share to validators, rest to treasury
        #[ink(message)]
        pub fn distribute_fees(&mut self) -> Result<(), FeeError> {
            self.ensure_admin()?;
            let amount = self.fee_treasury;
            if amount == 0 {
                return Ok(());
            }
            let validator_total = amount
                .saturating_mul(self.validator_share_bp as u128)
                .saturating_div(BASIS_POINTS);
            let validator_list = self.validator_list.clone();
            let validator_count = validator_list.len() as u32;
            if validator_count > 0 && validator_total > 0 {
                let per_validator = validator_total.saturating_div(validator_count as u128);
                for acc in validator_list {
                    let current = self.pending_rewards.get(acc).unwrap_or(0);
                    self.pending_rewards
                        .insert(acc, &current.saturating_add(per_validator));
                    self.record_reward(acc, per_validator, RewardReason::ValidatorReward);
                    self.total_distributed = self.total_distributed.saturating_add(per_validator);
                    self.env().emit_event(RewardsDistributed {
                        recipient: acc,
                        amount: per_validator,
                        reason: RewardReason::ValidatorReward,
                        timestamp: self.env().block_timestamp(),
                    });
                }
            }
            self.fee_treasury = 0;
            Ok(())
        }

        /// Record a pending reward entry for audit and later claiming.
        fn record_reward(&mut self, account: AccountId, amount: u128, reason: RewardReason) {
            self.reward_record_count += 1;
            self.reward_records.insert(
                self.reward_record_count,
                &RewardRecord {
                    account,
                    amount,
                    reason,
                    timestamp: self.env().block_timestamp(),
                },
            );
        }

        /// Claim pending rewards for a participant
        #[ink(message)]
        pub fn claim_rewards(&mut self) -> Result<u128, FeeError> {
            let caller = self.env().caller();
            let amount = self.pending_rewards.get(caller).unwrap_or(0);
            if amount == 0 {
                return Ok(0);
            }
            self.pending_rewards.remove(caller);
            self.env().emit_event(RewardsDistributed {
                recipient: caller,
                amount,
                reason: RewardReason::ValidatorReward,
                timestamp: self.env().block_timestamp(),
            });
            Ok(amount)
        }

        /// Return the currently claimable reward balance for an account.
        #[ink(message)]
        pub fn pending_reward(&self, account: AccountId) -> u128 {
            self.pending_rewards.get(account).unwrap_or(0)
        }

        // ========== Market-based price discovery & transparency ==========

        /// Recommended fee for an operation (market-based price discovery)
        #[ink(message)]
        pub fn get_recommended_fee(&self, operation: FeeOperation) -> u128 {
            self.calculate_fee(operation)
        }

        /// Fee estimate with optimization recommendation
        #[ink(message)]
        pub fn get_fee_estimate(&self, operation: FeeOperation) -> FeeEstimate {
            let config = self.get_config(operation);
            let congestion = self.congestion_index();
            let demand_bp = self.demand_factor_bp();
            let estimated = compute_dynamic_fee(&config, congestion, demand_bp);
            let congestion_level = if congestion < 33 {
                "low"
            } else if congestion < 66 {
                "medium"
            } else {
                "high"
            };
            let recommendation = if congestion >= 70 {
                "Consider batching operations or submitting during off-peak."
            } else if congestion < 30 {
                "Good time to submit; fees are below average."
            } else {
                "Fees are at typical levels."
            };
            FeeEstimate {
                operation,
                estimated_fee: estimated,
                min_fee: config.min_fee,
                max_fee: config.max_fee,
                congestion_level: congestion_level.into(),
                recommendation: recommendation.into(),
            }
        }

        /// Full fee report for transparency and dashboard
        #[ink(message)]
        pub fn get_fee_report(&self) -> FeeReport {
            let now = self.env().block_timestamp();
            let recommended = self.calculate_fee(FeeOperation::RegisterProperty);
            let mut active_auctions = 0u32;
            for id in 1..=self.auction_count {
                if let Some(a) = self.auctions.get(id) {
                    if !a.settled && now < a.end_time {
                        active_auctions += 1;
                    }
                }
            }
            FeeReport {
                config: self.default_config.clone(),
                congestion_index: self.congestion_index(),
                recommended_fee: recommended,
                total_fees_collected: self.total_fees_collected,
                total_distributed: self.total_distributed,
                operation_count_24h: self.recent_ops_count as u64,
                premium_auctions_active: active_auctions,
                timestamp: now,
            }
        }

        /// Fee optimization recommendations for users
        #[ink(message)]
        pub fn get_fee_recommendations(&self) -> Vec<String> {
            let mut rec = Vec::new();
            let c = self.congestion_index();
            if c >= 70 {
                rec.push("High congestion: use batch operations to reduce total fee.".into());
                rec.push("Consider submitting during off-peak hours.".into());
            } else if c < 30 {
                rec.push("Low congestion: current fees are favorable.".into());
            }
            rec.push("Premium listings: use auctions for better price discovery.".into());
            rec.push("Check get_fee_estimate before each operation type.".into());
            rec
        }

        /// Return the account that can administer fee settings.
        #[ink(message)]
        pub fn admin(&self) -> AccountId {
            self.admin
        }

        /// Return the default fee configuration used when an operation has no override.
        #[ink(message)]
        pub fn default_config(&self) -> FeeConfig {
            self.default_config.clone()
        }

        /// Return the undistributed fee balance held in treasury accounting.
        #[ink(message)]
        pub fn fee_treasury(&self) -> u128 {
            self.fee_treasury
        }
    }

    impl DynamicFeeProvider for FeeManager {
        /// Provide the dynamic recommended fee through the shared fee trait.
        #[ink(message)]
        fn get_recommended_fee(&self, operation: FeeOperation) -> u128 {
            self.calculate_fee(operation)
        }

        /// Collect fee for an operation. Should be called with transferred value.
        #[ink(message, payable)]
        fn collect_fee(
            &mut self,
            operation: FeeOperation,
            from: AccountId,
            amount: u128,
        ) -> Result<(), String> {
            let recommended_fee = self.calculate_fee(operation);
            let transferred_value = self.env().transferred_value();

            if transferred_value < amount {
                return Err(String::from("Insufficient fee transferred"));
            }

            // Note: We don't necessarily require amount == recommended_fee
            // as users might want to overpay or there might be batching logic
            // but we should at least check against some minimum if needed.

            self.record_fee_collected(operation, amount, from)
                .map_err(|_| String::from("Failed to record fee collection"))?;

            Ok(())
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn test_dynamic_fee_calculation() {
            let contract = FeeManager::new(1000, 100, 100_000);
            let fee = contract.calculate_fee(FeeOperation::RegisterProperty);
            assert!(fee >= 100 && fee <= 100_000);
        }

        #[ink::test]
        fn test_premium_auction_flow() {
            let mut contract = FeeManager::new(100, 10, 10_000);
            let auction_id = contract
                .create_premium_auction(1, 500, 3600)
                .expect("create auction");
            assert_eq!(auction_id, 1);
            let auction = contract.get_auction(auction_id).unwrap();
            assert_eq!(auction.property_id, 1);
            assert_eq!(auction.min_bid, 500);
            assert!(!auction.settled);

            assert!(contract.place_bid(auction_id, 600).is_ok());
            let auction = contract.get_auction(auction_id).unwrap();
            assert_eq!(auction.current_bid, 600);
        }

        #[ink::test]
        fn test_fee_report() {
            let contract = FeeManager::new(1000, 100, 50_000);
            let report = contract.get_fee_report();
            assert_eq!(report.total_fees_collected, 0);
            assert!(report.recommended_fee >= 100);
        }

        #[ink::test]
        fn test_fee_estimate_recommendation() {
            let contract = FeeManager::new(1000, 100, 50_000);
            let est = contract.get_fee_estimate(FeeOperation::TransferProperty);
            assert!(!est.recommendation.is_empty());
            assert!(!est.congestion_level.is_empty());
        }

        #[ink::test]
        fn test_collect_fee() {
            let mut contract = FeeManager::new(1000, 100, 50_000);
            let caller = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().alice;

            // Set transferred value for the test
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(1000);

            let result = contract.collect_fee(FeeOperation::RegisterProperty, caller, 1000);
            assert!(result.is_ok());
            assert_eq!(contract.get_fee_report().total_fees_collected, 1000);
        }

        #[ink::test]
        fn test_collect_insufficient_fee() {
            let mut contract = FeeManager::new(1000, 100, 50_000);
            let caller = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>().alice;

            // Set transferred value less than the amount we try to collect
            ink::env::test::set_value_transferred::<ink::env::DefaultEnvironment>(500);

            let result = contract.collect_fee(FeeOperation::RegisterProperty, caller, 1000);
            assert!(result.is_err());
            assert_eq!(result.unwrap_err(), "Insufficient fee transferred");
        }
    }
}
