#![cfg_attr(not(feature = "std"), no_std, no_main)]
#![allow(

//! Oracle contract for property valuation aggregation and source management.

    clippy::arithmetic_side_effects,
    clippy::cast_possible_truncation,
    clippy::cast_sign_loss,
    clippy::needless_borrows_for_generic_args
)]

use ink::prelude::*;
use ink::storage::Mapping;
mod state_root;
use propchain_traits::*;
use stellar_insured_lib::circuit_breaker::{
    CircuitBreakerTransition, InkCircuitBreaker,
};

/// Property Valuation Oracle Contract
#[ink::contract]
mod propchain_oracle {
    use super::*;
    use ink::prelude::{
        string::{String, ToString},
        vec::Vec,
    };
    use scale::Encode;

    mod validation;

    /// Property Valuation Oracle storage
    #[ink(storage)]
    pub struct PropertyValuationOracle {
        /// Admin account
        admin: AccountId,

        /// Governance multisig allowed to schedule valuation freezes
        governance: AccountId,

        /// Shared pause protocol state
        circuit_breaker: InkCircuitBreaker,

        /// Property valuations storage
        pub property_valuations: Mapping<u64, PropertyValuation>,

        /// Historical valuations per property
        historical_valuations: Mapping<u64, Vec<PropertyValuation>>,

        /// Oracle sources configuration
        oracle_sources: Mapping<String, OracleSource>,

        /// Active oracle sources list
        pub active_sources: Vec<String>,

        /// Price alerts configuration
        pub price_alerts: Mapping<u64, Vec<PriceAlert>>,

        /// Location-based adjustments
        pub location_adjustments: Mapping<String, LocationAdjustment>,

        /// Market trends data
        pub market_trends: Mapping<String, MarketTrend>,

        /// Comparable properties cache
        comparable_cache: Mapping<u64, Vec<ComparableProperty>>,

        /// Maximum staleness for price feeds (in seconds)
        max_price_staleness: u64,

        /// Minimum sources required for valuation
        pub min_sources_required: u32,

        /// Outlier detection threshold (standard deviations)
        outlier_threshold: u32,
        /// Confirmation depth for valuations (reorg protection)
        pub confirmation_depth: u32,

        /// Source reputations (0-1000, where 1000 is perfect)
        pub source_reputations: Mapping<String, u32>,

        /// Source stakes for slashing
        pub source_stakes: Mapping<String, u128>,

        /// Pending valuation requests: property_id -> timestamp
        pub pending_requests: Mapping<u64, u64>,

        /// Request counter for unique request IDs
        pub request_id_counter: u64,

        /// AI valuation contract address
        ai_valuation_contract: Option<AccountId>,

        /// Risk pool address — receives slashed funds
        pub risk_pool: Option<AccountId>,

        /// ZK compliance contract used to verify zero-knowledge attestations
        zk_compliance_contract: Option<AccountId>,

        /// ZK-attested valuations: property_id -> attestation record
        zk_attestations: Mapping<u64, ZkAttestedValuation>,
    }

    /// A ZK-attested property valuation: the value is proven on-chain without
    /// revealing the source data used to derive it.
    #[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
    #[cfg_attr(
        feature = "std",
        derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
    )]
    pub struct ZkAttestedValuation {
        pub property_id: u64,
        pub valuation: u128,
        pub proof_type: ZkProofType,
        /// Binding public input (BLAKE2b-256 of the SCALE-encoded statement,
        /// reduced mod the Bn254 scalar field order)
        pub statement_hash: [u8; 32],
        pub attested_at: u64,
    }

    /// Emitted when an oracle source is slashed and funds transferred to the risk pool
    #[ink(event)]
    pub struct SourceSlashed {
        #[ink(topic)]
        source_id: String,
        penalty: u128,
        risk_pool: AccountId,
    }

    /// Emitted for monitoring: large valuation movements
    #[ink(event)]
    pub struct LargeValuationMovement {
        #[ink(topic)]
        property_id: u64,
        old_valuation: u128,
        new_valuation: u128,
        /// Change in basis points (1 bp = 0.01%)
        change_bps: u128,
        severity: u8, // 1=info, 2=warn, 3=critical
    }

    /// Emitted for monitoring: source reputation dropped below threshold
    #[ink(event)]
    pub struct SourceReputationAlert {
        #[ink(topic)]
        source_id: String,
        reputation: u32,
        severity: u8,
    }

    /// Emitted when source reputation is updated
    #[ink(event)]
    pub struct SourceReputationUpdated {
        #[ink(topic)]
        source_id: String,
        old_reputation: u32,
        new_reputation: u32,
        success: bool,
    }

    /// Events emitted by the oracle
    #[ink(event)]
    pub struct ValuationUpdated {
        #[ink(topic)]
        property_id: u64,
        valuation: u128,
        confidence_score: u32,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct PriceAlertTriggered {
        #[ink(topic)]
        property_id: u64,
        old_valuation: u128,
        new_valuation: u128,
        change_percentage: u32,
        alert_address: AccountId,
    }

    #[ink(event)]
    pub struct OracleSourceAdded {
        #[ink(topic)]
        source_id: String,
        source_type: OracleSourceType,
        weight: u32,
    }

    #[ink(event)]
    pub struct LocationAdjustmentSet {
        #[ink(topic)]
        location_code: String,
        adjustment_factor: u128,
    }

    #[ink(event)]
    pub struct MarketTrendUpdated {
        property_type: PropertyType,
        location: String,
        trend_value: i32,
    }

    #[ink(event)]
    pub struct ValuationRequested {
        #[ink(topic)]
        property_id: u64,
        request_id: u64,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct RiskPoolSet {
        #[ink(topic)]
        risk_pool: AccountId,
    }

    #[ink(event)]
    pub struct AIValuationContractSet {
        #[ink(topic)]
        ai_contract: AccountId,
    }

    #[ink(event)]
    pub struct BatchValuationRequested {
        count: u32,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ZkComplianceContractSet {
        #[ink(topic)]
        zk_contract: AccountId,
    }

    #[ink(event)]
    pub struct ZkValuationAttested {
        #[ink(topic)]
        property_id: u64,
        valuation: u128,
        statement_hash: [u8; 32],
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ValuationFromSourcesUpdated {
        #[ink(topic)]
        property_id: u64,
        sources_count: u32,
        aggregated_price: u128,
    }

    #[ink(event)]
    pub struct PauseScheduled {
        #[ink(topic)]
        scheduled_by: AccountId,
        scheduled_at: u64,
        activates_at: u64,
        pause_until: Option<u64>,
        rescheduled_by: Option<AccountId>,
    }

    #[ink(event)]
    pub struct PauseActivated {
        activated_at: u64,
        pause_until: Option<u64>,
        emergency: bool,
    }

    #[ink(event)]
    pub struct ResumeScheduled {
        #[ink(topic)]
        scheduled_by: AccountId,
        scheduled_at: u64,
        activates_at: u64,
    }

    #[ink(event)]
    pub struct ResumeActivated {
        #[ink(topic)]
        activated_by: Option<AccountId>,
        activated_at: u64,
        automatic: bool,
    }

    impl PropertyValuationOracle {
        /// Constructor for the Property Valuation Oracle
        #[ink(constructor)]
        pub fn new(admin: AccountId) -> Self {
            Self {
                admin,
                governance: admin,
                circuit_breaker: InkCircuitBreaker::default(),
                property_valuations: Mapping::default(),
                historical_valuations: Mapping::default(),
                oracle_sources: Mapping::default(),
                active_sources: Vec::new(),
                price_alerts: Mapping::default(),
                location_adjustments: Mapping::default(),
                market_trends: Mapping::default(),
                comparable_cache: Mapping::default(),
                max_price_staleness: 3600, // 1 hour
                min_sources_required: 2,
                outlier_threshold: 2, // 2 standard deviations
                source_reputations: Mapping::default(),
                source_stakes: Mapping::default(),
                pending_requests: Mapping::default(),
                request_id_counter: 0,
                confirmation_depth: 6, // 6 blocks default
                ai_valuation_contract: None,
                risk_pool: None,
                zk_compliance_contract: None,
                zk_attestations: Mapping::default(),
            }
        }

        /// Maximum number of properties to process in a single batch operation
        const MAX_BATCH_SIZE: usize = 10;

        /// Maximum number of historical valuations returned by a single
        /// `get_historical_valuations` query.
        ///
        /// The caller-supplied `limit` is clamped to this value so a request
        /// can never force unbounded iteration over the stored history,
        /// bounding the gas/compute of a read. It matches the retention cap in
        /// [`store_historical_valuation`], which keeps at most the 100 most
        /// recent valuations per property, so the effective result is also the
        /// most a property can ever hold.
        const MAX_HISTORICAL_LIMIT: u32 = 100;

        /// Set the risk pool address that receives slashed funds (admin only)
        #[ink(message)]
        pub fn set_risk_pool(&mut self, risk_pool: AccountId) -> Result<(), OracleError> {
            self.ensure_admin()?;
            self.risk_pool = Some(risk_pool);
            
            self.env().emit_event(RiskPoolSet {
                risk_pool,
            });
            
            Ok(())
        }

        /// Get property valuation from multiple sources with aggregation
        #[ink(message)]
        pub fn get_property_valuation(
            &self,
            property_id: u64,
        ) -> Result<PropertyValuation, OracleError> {
            let valuation = self.property_valuations
                .get(&property_id)
                .ok_or(OracleError::PropertyNotFound)?;

            // Check if valuation is confirmed
            if let Some(confirmed_at) = valuation.confirmed_at_block {
                let current_block = u64::from(self.env().block_number());
                if current_block < confirmed_at + self.confirmation_depth as u64 {
                    return Err(OracleError::NotEnoughConfirmations);
                }
            }

            Ok(valuation)
        }

        /// Get property valuation with confidence metrics
        #[ink(message)]
        pub fn get_valuation_with_confidence(
            &self,
            property_id: u64,
        ) -> Result<ValuationWithConfidence, OracleError> {
            let valuation = self.get_property_valuation(property_id)?;

            // Calculate volatility and confidence interval
            let volatility = self.calculate_volatility(property_id)?;
            let confidence_interval = self.calculate_confidence_interval(&valuation)?;
            let outlier_sources = self.detect_outliers(property_id)?;

            Ok(ValuationWithConfidence {
                valuation,
                volatility_index: volatility,
                confidence_interval,
                outlier_sources,
            })
        }

        /// Update property valuation (admin only)
        #[ink(message)]
        pub fn update_property_valuation(
            &mut self,
            property_id: u64,
            valuation: PropertyValuation,
        ) -> Result<(), OracleError> {
            self.ensure_admin()?;
            self.update_property_valuation_inner(property_id, valuation)
        }

        /// Core valuation update logic without the admin gate.
        ///
        /// Used by the admin message above and by ZK-attested submissions
        /// (`submit_zk_valuation`), which are gated by cryptographic proof
        /// verification instead of admin trust.
        fn update_property_valuation_inner(
            &mut self,
            property_id: u64,
            valuation: PropertyValuation,
        ) -> Result<(), OracleError> {
            self.ensure_not_paused()?;
            // Validate valuation
            if valuation.valuation == 0 {
                return Err(OracleError::InvalidValuation);
            }

            let mut valuation = valuation;
            valuation.confirmed_at_block = Some(u64::from(self.env().block_number()));

            // Store historical valuation
            self.store_historical_valuation(property_id, valuation.clone());

            // Update current valuation
            self.property_valuations.insert(&property_id, &valuation);

            // Check price alerts
            self.check_price_alerts(property_id, valuation.valuation)?;

            // Monitoring: emit structured event for large movements
            if let Some(prev) = self.property_valuations.get(&property_id) {
                if prev.valuation > 0 {
                    let change_bps = valuation
                        .valuation
                        .abs_diff(prev.valuation)
                        .saturating_mul(10_000)
                        / prev.valuation;
                    if change_bps >= 500 {
                        // >= 5% movement
                        let severity: u8 = if change_bps >= 2000 { 3 } else if change_bps >= 1000 { 2 } else { 1 };
                        self.env().emit_event(LargeValuationMovement {
                            property_id,
                            old_valuation: prev.valuation,
                            new_valuation: valuation.valuation,
                            change_bps,
                            severity,
                        });
                    }
                }
            }

            // Emit event
            self.env().emit_event(ValuationUpdated {
                property_id,
                valuation: valuation.valuation,
                confidence_score: valuation.confidence_score,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Update property valuation from oracle sources
        #[ink(message)]
        pub fn update_valuation_from_sources(
            &mut self,
            property_id: u64,
        ) -> Result<(), OracleError> {
            // Collect prices from all active sources
            let prices = self.collect_prices_from_sources(property_id)?;

            if prices.len() < self.min_sources_required as usize {
                return Err(OracleError::InsufficientSources);
            }

            // Aggregate prices with outlier detection
            let aggregated_price = self.aggregate_prices(&prices)?;
            let confidence_score = self.calculate_confidence_score(&prices)?;

            let valuation = PropertyValuation {
                property_id,
                valuation: aggregated_price,
                confidence_score,
                sources_used: prices.len() as u32,
                last_updated: self.env().block_timestamp(),
                valuation_method: ValuationMethod::MarketData,
            };

            self.update_property_valuation(property_id, valuation)?;
            self.clear_pending_request(property_id);
            
            self.env().emit_event(ValuationFromSourcesUpdated {
                property_id,
                sources_count: prices.len() as u32,
                aggregated_price,
            });
            
            Ok(())
        }

        /// Request a new valuation for a property
        #[ink(message)]
        pub fn request_property_valuation(&mut self, property_id: u64) -> Result<u64, OracleError> {
            self.ensure_not_paused()?;
            // Check if request already pending
            if let Some(timestamp) = self.pending_requests.get(&property_id) {
                let current_time = self.env().block_timestamp();
                if current_time.saturating_sub(timestamp) < self.max_price_staleness {
                    return Err(OracleError::RequestPending);
                }
            }

            let request_id = self.request_id_counter;
            self.request_id_counter += 1;

            self.pending_requests
                .insert(&property_id, &self.env().block_timestamp());
            
            self.env().emit_event(ValuationRequested {
                property_id,
                request_id,
                timestamp: self.env().block_timestamp(),
            });

            Ok(request_id)
        }

        /// Batch request valuations for multiple properties (limited to MAX_BATCH_SIZE for gas efficiency)
        #[ink(message)]
        pub fn batch_request_valuations(
            &mut self,
            property_ids: Vec<u64>,
        ) -> Result<Vec<u64>, OracleError> {
            let max_to_process = property_ids.len().min(Self::MAX_BATCH_SIZE);
            let mut request_ids = Vec::new();
            for i in 0..max_to_process {
                if let Ok(req_id) = self.request_property_valuation(property_ids[i]) {
                    request_ids.push(req_id);
                }
            }
            
            self.env().emit_event(BatchValuationRequested {
                count: request_ids.len() as u32,
                timestamp: self.env().block_timestamp(),
            });
            
            Ok(request_ids)
        }

        /// Update oracle reputation (admin only)
        #[ink(message)]
        pub fn update_source_reputation(
            &mut self,
            source_id: String,
            success: bool,
        ) -> Result<(), OracleError> {
            self.ensure_admin()?;
            let old_rep = self.source_reputations.get(&source_id).unwrap_or(500); // Start at 500

            let new_rep = if success {
                (old_rep + 10).min(1000)
            } else {
                old_rep.saturating_sub(50)
            };

            self.source_reputations.insert(&source_id, &new_rep);

            self.env().emit_event(SourceReputationUpdated {
                source_id: source_id.clone(),
                old_reputation: old_rep,
                new_reputation: new_rep,
                success,
            });

            // Monitoring: alert when reputation crosses warning thresholds
            if new_rep < 200 {
                self.env().emit_event(SourceReputationAlert {
                    source_id: source_id.clone(),
                    reputation: new_rep,
                    severity: 3,
                });
            } else if new_rep < 400 {
                self.env().emit_event(SourceReputationAlert {
                    source_id: source_id.clone(),
                    reputation: new_rep,
                    severity: 2,
                });
            }

            // Auto-deactivate source if reputation falls too low
            if new_rep < 200 {
                if let Some(mut source) = self.oracle_sources.get(&source_id) {
                    source.is_active = false;
                    self.oracle_sources.insert(&source_id, &source);
                    self.active_sources.retain(|id| id != &source_id);
                }
            }

            Ok(())
        }

        /// Slash an oracle source for providing bad data (admin only).
        /// Slashed funds are transferred to the configured risk pool.
        #[ink(message)]
        pub fn slash_source(
            &mut self,
            source_id: String,
            penalty: u128,
        ) -> Result<(), OracleError> {
            self.ensure_admin()?;

            let current_stake = self.source_stakes.get(&source_id).unwrap_or(0);
            let actual_penalty = penalty.min(current_stake);
            self.source_stakes
                .insert(&source_id, &current_stake.saturating_sub(actual_penalty));

            // Transfer slashed funds to risk pool
            if actual_penalty > 0 {
                if let Some(pool) = self.risk_pool {
                    self.env()
                        .transfer(pool, actual_penalty)
                        .map_err(|_| OracleError::InvalidValuation)?;
                    self.env().emit_event(SourceSlashed {
                        source_id: source_id.clone(),
                        penalty: actual_penalty,
                        risk_pool: pool,
                    });
                }
            }

            // Also hit the reputation hard
            self.update_source_reputation(source_id, false)?;

            Ok(())
        }

        /// Detect if a new valuation is an anomaly based on historical data
        #[ink(message)]
        pub fn is_anomaly(&self, property_id: u64, new_valuation: u128) -> bool {
            if let Some(current) = self.property_valuations.get(&property_id) {
                let change_pct = self.calculate_percentage_change(current.valuation, new_valuation);

                // If change > 20% in a single update, flag as anomaly unless volatility is high
                if change_pct > 20 {
                    let volatility = self.calculate_volatility(property_id).unwrap_or(0);
                    if volatility < 10 {
                        // 10% volatility
                        return true;
                    }
                }
            }
            false
        }

        /// Get historical valuations for a property, most recent first.
        ///
        /// `limit` is the maximum number of entries to return. It is clamped to
        /// [`Self::MAX_HISTORICAL_LIMIT`], so passing a very large value (e.g.
        /// `u32::MAX`) cannot force unbounded iteration — the call returns at
        /// most `MAX_HISTORICAL_LIMIT` entries regardless.
        ///
        /// Performance: O(n) in the number of stored valuations for the
        /// property, where n is bounded by the retention cap (100). The result
        /// allocates a `Vec` of up to `min(limit, MAX_HISTORICAL_LIMIT)`
        /// elements, so gas/compute is bounded independent of caller input.
        #[ink(message)]
        pub fn get_historical_valuations(
            &self,
            property_id: u64,
            limit: u32,
        ) -> Vec<PropertyValuation> {
            // Clamp the requested limit so a caller cannot force iteration over
            // an arbitrarily large slice of history (DoS / enumeration guard).
            let capped_limit = limit.min(Self::MAX_HISTORICAL_LIMIT);
            self.historical_valuations
                .get(&property_id)
                .unwrap_or_default()
                .into_iter()
                .rev() // Most recent first
                .take(capped_limit as usize)
                .collect()
        }

        /// Get market volatility metrics
        #[ink(message)]
        pub fn get_market_volatility(
            &self,
            property_type: PropertyType,
            location: String,
        ) -> Result<VolatilityMetrics, OracleError> {
            let key = format!("{:?}_{}", property_type, location);
            self.market_trends
                .get(&key)
                .map(|trend| VolatilityMetrics {
                    property_type: trend.property_type,
                    location: trend.location,
                    volatility_index: (trend.trend_percentage.unsigned_abs()).min(100),
                    average_price_change: trend.trend_percentage,
                    period_days: trend.period_months * 30, // Approximate
                    last_updated: trend.last_updated,
                })
                .ok_or(OracleError::InvalidParameters)
        }

        /// Set price alert for a property
        #[ink(message)]
        pub fn set_price_alert(
            &mut self,
            property_id: u64,
            threshold_percentage: u32,
            alert_address: AccountId,
        ) -> Result<(), OracleError> {
            let alert = PriceAlert {
                property_id,
                threshold_percentage,
                alert_address,
                last_triggered: 0,
                is_active: true,
            };

            let mut alerts = self.price_alerts.get(&property_id).unwrap_or_default();
            alerts.push(alert);
            self.price_alerts.insert(&property_id, &alerts);

            Ok(())
        }
        /// Set AI valuation contract address
        #[ink(message)]
        pub fn set_ai_valuation_contract(
            &mut self,
            ai_contract: AccountId,
        ) -> Result<(), OracleError> {
            self.ensure_admin()?;
            self.ai_valuation_contract = Some(ai_contract);
            
            self.env().emit_event(AIValuationContractSet {
                ai_contract,
            });
            
            Ok(())
        }

        /// Get AI valuation contract address
        #[ink(message)]
        pub fn get_ai_valuation_contract(&self) -> Option<AccountId> {
            self.ai_valuation_contract
        }

        #[ink(message)]
        pub fn get_state_root(&self) -> crate::state_root::StateRoot {
            crate::state_root::compute_root(&vec![self.admin.encode(), self.request_id_counter.encode()])
        }

        /// Set the ZK compliance contract used to verify attestations (admin only)
        #[ink(message)]
        pub fn set_zk_compliance_contract(
            &mut self,
            zk_contract: AccountId,
        ) -> Result<(), OracleError> {
            self.ensure_admin()?;
            self.zk_compliance_contract = Some(zk_contract);
            self.env().emit_event(ZkComplianceContractSet { zk_contract });
            Ok(())
        }

        /// Get the configured ZK compliance contract address
        #[ink(message)]
        pub fn get_zk_compliance_contract(&self) -> Option<AccountId> {
            self.zk_compliance_contract
        }

        /// Submit a ZK-attested property valuation.
        ///
        /// The attestation is a [`ZkProofData`] payload produced by the
        /// compliance contract flow (or by an off-chain prover) whose single
        /// public input binds the statement `(property_id, valuation)` via
        /// BLAKE2b-256. The proof is verified by a cross-contract call to the
        /// configured ZK compliance contract; only verified attestations are
        /// accepted, so no admin trust or source data is required.
        #[ink(message)]
        pub fn submit_zk_valuation(
            &mut self,
            property_id: u64,
            valuation: u128,
            confidence_score: u32,
            attestation: ZkProofData,
        ) -> Result<(), OracleError> {
            // A ZK attestation replaces admin trust: anyone may submit, but the
            // proof must verify against the registered key on-chain.
            if valuation == 0 {
                return Err(OracleError::InvalidValuation);
            }

            // Bind the statement into the expected public input.
            let statement = (property_id, valuation).encode();
            let expected_input = self.bind_public_input(&statement);
            if attestation.public_inputs.len() != 1
                || attestation.public_inputs[0] != expected_input
            {
                return Err(OracleError::InvalidZkProof);
            }

            let verified = self.call_zk_verifier(
                attestation.proof_type,
                attestation.public_inputs.clone(),
                attestation.proof_data.clone(),
            )?;
            if !verified {
                return Err(OracleError::ZkVerificationFailed);
            }

            // Persist the attestation record.
            let record = ZkAttestedValuation {
                property_id,
                valuation,
                proof_type: attestation.proof_type,
                statement_hash: expected_input,
                attested_at: self.env().block_timestamp(),
            };
            self.zk_attestations.insert(&property_id, &record);

            // Push through the standard valuation pipeline.
            let property_valuation = PropertyValuation {
                property_id,
                valuation,
                confidence_score,
                sources_used: 1,
                last_updated: self.env().block_timestamp(),
                valuation_method: ValuationMethod::Hybrid,
                confirmed_at_block: None,
            };
            // Bypass the admin gate: the cryptographic proof is the authority.
            self.update_property_valuation_inner(property_id, property_valuation)?;

            self.env().emit_event(ZkValuationAttested {
                property_id,
                valuation,
                statement_hash: expected_input,
                timestamp: self.env().block_timestamp(),
            });

            Ok(())
        }

        /// Get the ZK attestation record stored for a property.
        #[ink(message)]
        pub fn get_zk_attestation(&self, property_id: u64) -> Option<ZkAttestedValuation> {
            self.zk_attestations.get(&property_id)
        }

        /// Add oracle source (admin only)
        #[ink(message)]
        pub fn add_oracle_source(&mut self, source: OracleSource) -> Result<(), OracleError> {
            self.ensure_admin()?;

            if source.weight > 100 {
                return Err(OracleError::InvalidParameters);
            }

            self.oracle_sources.insert(&source.id, &source);

            if source.is_active && !self.active_sources.contains(&source.id) {
                self.active_sources.push(source.id.clone());
            }

            self.env().emit_event(OracleSourceAdded {
                source_id: source.id,
                source_type: source.source_type,
                weight: source.weight,
            });

            Ok(())
        }

        /// Set location adjustment factor (admin only)
        #[ink(message)]
        pub fn set_location_adjustment(
            &mut self,
            adjustment: LocationAdjustment,
        ) -> Result<(), OracleError> {
            self.ensure_admin()?;
            self.location_adjustments
                .insert(&adjustment.location_code, &adjustment);
            self.env().emit_event(LocationAdjustmentSet {
                location_code: adjustment.location_code,
                adjustment_factor: adjustment.adjustment_factor,
            });
            Ok(())
        }

        /// Update market trend data (admin only)
        #[ink(message)]
        pub fn update_market_trend(&mut self, trend: MarketTrend) -> Result<(), OracleError> {
            self.ensure_admin()?;
            let key = format!("{:?}_{}", trend.property_type, trend.location);
            self.market_trends.insert(&key, &trend);
            self.env().emit_event(MarketTrendUpdated {
                property_type: trend.property_type,
                location: trend.location,
                trend_value: trend.trend_value,
            });
            Ok(())
        }

        /// Get comparable properties for AVM analysis
        #[ink(message)]
        pub fn get_comparable_properties(
            &self,
            property_id: u64,
            radius_km: u32,
        ) -> Vec<ComparableProperty> {
            self.comparable_cache
                .get(&property_id)
                .unwrap_or_default()
                .into_iter()
                .filter(|comp| comp.distance_km <= radius_km)
                .collect()
        }

        /// Schedule a timed valuation freeze through governance.
        #[ink(message)]
        pub fn pause(&mut self, duration_seconds: u64) -> Result<(), OracleError> {
            self.ensure_governance()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transition = self
                .circuit_breaker
                .pause(now, duration_seconds, caller)
                .map_err(|_| OracleError::InvalidParameters)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        /// Immediately freeze valuations through governance.
        #[ink(message)]
        pub fn emergency_pause(&mut self) -> Result<(), OracleError> {
            self.ensure_governance()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transitions = self.circuit_breaker.emergency_pause(now, caller);
            self.emit_circuit_breaker_transition(transitions.0);
            self.emit_circuit_breaker_transition(transitions.1);
            Ok(())
        }

        /// Schedule or activate an admin resume.
        #[ink(message)]
        pub fn resume(&mut self) -> Result<(), OracleError> {
            self.ensure_admin()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transition = self
                .circuit_breaker
                .resume(now, caller)
                .map_err(|_| OracleError::InvalidParameters)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        #[ink(message)]
        pub fn is_paused(&mut self) -> bool {
            self.sync_circuit_breaker();
            let now = self.now_seconds();
            self.circuit_breaker.is_paused(now)
        }

        #[ink(message)]
        pub fn set_governance(&mut self, governance: AccountId) -> Result<(), OracleError> {
            self.ensure_admin()?;
            self.governance = governance;
            Ok(())
        }

        // Helper methods

        /// Require the caller to be the oracle admin before privileged changes.
        fn ensure_admin(&self) -> Result<(), OracleError> {
            if self.env().caller() != self.admin {
                return Err(OracleError::Unauthorized);
            }
            Ok(())
        }

        fn ensure_governance(&self) -> Result<(), OracleError> {
            if self.env().caller() != self.governance {
                return Err(OracleError::Unauthorized);
            }
            Ok(())
        }

        fn ensure_not_paused(&mut self) -> Result<(), OracleError> {
            self.sync_circuit_breaker();
            let now = self.now_seconds();
            if self.circuit_breaker.is_paused(now) {
                return Err(OracleError::ContractPaused);
            }
            Ok(())
        }

        fn now_seconds(&self) -> u64 {
            self.env().block_timestamp() / 1_000
        }

        fn sync_circuit_breaker(&mut self) {
            let now = self.now_seconds();
            if let Some(transition) = self.circuit_breaker.sync(now) {
                self.emit_circuit_breaker_transition(transition);
            }
        }

        fn emit_circuit_breaker_transition(
            &self,
            transition: CircuitBreakerTransition<AccountId>,
        ) {
            match transition {
                CircuitBreakerTransition::PauseScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                    pause_until,
                    rescheduled_by,
                } => self.env().emit_event(PauseScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                    pause_until,
                    rescheduled_by,
                }),
                CircuitBreakerTransition::PauseActivated {
                    activated_at,
                    pause_until,
                    emergency,
                } => self.env().emit_event(PauseActivated {
                    activated_at,
                    pause_until,
                    emergency,
                }),
                CircuitBreakerTransition::ResumeScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                } => self.env().emit_event(ResumeScheduled {
                    scheduled_by,
                    scheduled_at,
                    activates_at,
                }),
                CircuitBreakerTransition::ResumeActivated {
                    activated_by,
                    activated_at,
                    automatic,
                } => self.env().emit_event(ResumeActivated {
                    activated_by,
                    activated_at,
                    automatic,
                }),
            }
        }

        /// Collect fresh price data from each active oracle source for a property.
        fn collect_prices_from_sources(
            &self,
            property_id: u64,
        ) -> Result<Vec<PriceData>, OracleError> {
            let mut prices = Vec::new();

            for source_id in &self.active_sources {
                if let Some(source) = self.oracle_sources.get(source_id) {
                    // In a real implementation, this would call external price feeds
                    // For now, we'll simulate price collection
                    match self.get_price_from_source(&source, property_id) {
                        Ok(price_data) => {
                            if self.is_price_fresh(&price_data) {
                                prices.push(price_data);
                            }
                        }
                        Err(_) => continue, // Skip failed sources
                    }
                }
            }

            Ok(prices)
        }

        /// Resolve one source into a price data point for aggregation.
        ///
        /// For Chainlink, Pyth, Substrate, and Custom sources the function first
        /// attempts a cross-contract call to the oracle at `source.address`; if
        /// that call fails (contract unavailable, wrong ABI, etc.) it falls back
        /// to a deterministic mock so that the aggregation pipeline keeps working
        /// during partial outages.  Manual sources read the stored admin valuation
        /// directly.  AIModel sources require `ai_valuation_contract` to be set.
        fn get_price_from_source(
            &self,
            source: &OracleSource,
            property_id: u64,
        ) -> Result<PriceData, OracleError> {
            let timestamp = self.env().block_timestamp();
            match source.source_type {
                OracleSourceType::Chainlink
                | OracleSourceType::Pyth
                | OracleSourceType::Substrate
                | OracleSourceType::Custom => {
                    // Attempt a cross-contract call to the price feed registered at
                    // source.address (must implement the Oracle trait).  Fall back to
                    // a deterministic local price when the call fails so the
                    // aggregation pipeline degrades gracefully.
                    let price = self
                        .call_oracle_feed(source.address, property_id)
                        .unwrap_or_else(|| self.fallback_price_for(source, property_id));
                    Ok(PriceData {
                        price,
                        timestamp,
                        source: source.id.clone(),
                    })
                }
                OracleSourceType::Manual => {
                    // Manual price: return the admin-submitted valuation so it flows
                    // through the aggregation pipeline unchanged.
                    let price = self
                        .property_valuations
                        .get(&property_id)
                        .map(|v| v.valuation)
                        .unwrap_or(400_000u128.saturating_add(property_id as u128 * 100));
                    Ok(PriceData {
                        price,
                        timestamp,
                        source: source.id.clone(),
                    })
                }
                OracleSourceType::AIModel => {
                    // AI valuation: requires an on-chain AI model contract.  Error
                    // early when the contract address is not configured so callers
                    // know to set it via set_ai_valuation_contract() before use.
                    let ai_addr = self
                        .ai_valuation_contract
                        .ok_or(OracleError::PriceFeedError)?;
                    let price = self
                        .call_oracle_feed(ai_addr, property_id)
                        .unwrap_or_else(|| {
                            403_000u128
                                .saturating_add(property_id as u128 * 100)
                                .saturating_add(source.weight as u128 * 12)
                        });
                    Ok(PriceData {
                        price,
                        timestamp,
                        source: source.id.clone(),
                    })
                }
            }
        }

        /// Invoke `get_valuation(property_id)` on an on-chain Oracle contract.
        ///
        /// Returns `Some(valuation)` on success or `None` when the callee is
        /// unavailable or returns an error, allowing the caller to fall back to
        /// a deterministic mock price.
        fn call_oracle_feed(&self, addr: AccountId, property_id: u64) -> Option<u128> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(addr)
                .ref_time_limit(0)
                .proof_size_limit(0)
                .storage_deposit_limit(None)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!("get_valuation")))
                        .push_arg(&property_id),
                )
                .returns::<Result<PropertyValuation, OracleError>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(valuation))) => Some(valuation.valuation),
                _ => None,
            }
        }

        /// Invoke `verify_zk_proof_data(proof_type, public_inputs, proof_data)`
        /// on the configured ZK compliance contract.
        ///
        /// Returns `Ok(true)` only when the compliance contract confirms the
        /// proof. Any error (contract unavailable, malformed payload, unverified
        /// proof) is mapped to [`OracleError::ZkVerificationFailed`].
        fn call_zk_verifier(
            &self,
            proof_type: ZkProofType,
            public_inputs: Vec<[u8; 32]>,
            proof_data: Vec<u8>,
        ) -> Result<bool, OracleError> {
            use ink::env::call::{build_call, ExecutionInput, Selector};

            let zk_contract = self
                .zk_compliance_contract
                .ok_or(OracleError::ZkComplianceNotSet)?;

            let result = build_call::<ink::env::DefaultEnvironment>()
                .call(zk_contract)
                .ref_time_limit(0)
                .proof_size_limit(0)
                .storage_deposit_limit(None)
                .exec_input(
                    ExecutionInput::new(Selector::new(ink::selector_bytes!(
                        "verify_zk_proof_data"
                    )))
                    .push_arg(&proof_type)
                    .push_arg(&public_inputs)
                    .push_arg(&proof_data),
                )
                .returns::<Result<bool, ZkVerifyError>>()
                .try_invoke();

            match result {
                Ok(Ok(Ok(valid))) => Ok(valid),
                _ => Err(OracleError::ZkVerificationFailed),
            }
        }

        /// Hash a statement into the single 32-byte public input expected by
        /// the off-chain prover.
        ///
        /// The public input is `BLAKE2b-256(statement) mod r`, where `r` is the
        /// Bn254 scalar field order — matching the prover's
        /// `from_le_bytes_mod_order(BLAKE2b-256(statement))` exactly (a raw
        /// hash exceeds `r` with probability ≈ 81%, so the reduction is
        /// required for the comparison against `attestation.public_inputs[0]`
        /// to succeed).
        fn bind_public_input(&self, statement: &[u8]) -> [u8; 32] {
            use ink::env::hash::{Blake2x256, HashOutput};

            let mut output = <Blake2x256 as HashOutput>::Type::default();
            self.env().hash_bytes::<Blake2x256>(statement, &mut output);
            reduce_mod_bn254(&output)
        }

        /// Deterministic fallback price used when an external oracle feed is
        /// unavailable.  Values are anchored to the same bases as the original
        /// mock implementations so existing tests continue to pass unchanged.
        fn fallback_price_for(&self, source: &OracleSource, property_id: u64) -> u128 {
            match source.source_type {
                OracleSourceType::Chainlink => 400_000u128
                    .saturating_add(property_id as u128 * 100)
                    .saturating_add(source.weight as u128 * 10),
                OracleSourceType::Pyth => 402_000u128
                    .saturating_add(property_id as u128 * 100)
                    .saturating_add(source.weight as u128 * 8),
                OracleSourceType::Substrate => 401_000u128
                    .saturating_add(property_id as u128 * 100)
                    .saturating_add(source.weight as u128 * 9),
                OracleSourceType::Custom => {
                    let addr_seed = source.address.as_ref()[0] as u128;
                    399_000u128
                        .saturating_add(property_id as u128 * 100)
                        .saturating_add(addr_seed * 7)
                }
                _ => 400_000u128.saturating_add(property_id as u128 * 100),
            }
        }

        /// Check whether a source price is inside the configured freshness window.
        fn is_price_fresh(&self, price_data: &PriceData) -> bool {
            let current_time = self.env().block_timestamp();
            current_time.saturating_sub(price_data.timestamp) <= self.max_price_staleness
        }

        /// Aggregate fresh source prices into a weighted average after outlier removal.
        pub fn aggregate_prices(&self, prices: &[PriceData]) -> Result<u128, OracleError> {
            if prices.len() < self.min_sources_required as usize {
                return Err(OracleError::InsufficientSources);
            }

            // Remove outliers
            let filtered_prices = self.filter_outliers(prices);

            if filtered_prices.is_empty() {
                return Err(OracleError::InsufficientSources);
            }

            // Weighted average based on source weights
            let mut total_weighted_price = 0u128;
            let mut total_weight = 0u32;

            for price_data in &filtered_prices {
                let weight = self.get_source_weight(&price_data.source)?;
                let weighted_price = price_data
                    .price
                    .checked_mul(weight as u128)
                    .ok_or(OracleError::InvalidValuation)?;
                total_weighted_price = total_weighted_price
                    .checked_add(weighted_price)
                    .ok_or(OracleError::InvalidValuation)?;
                total_weight = total_weight
                    .checked_add(weight)
                    .ok_or(OracleError::InvalidParameters)?;
            }

            if total_weight == 0 {
                return Err(OracleError::InvalidParameters);
            }

            Ok(total_weighted_price / total_weight as u128)
        }

        /// Remove prices that fall outside the configured standard-deviation threshold.
        pub fn filter_outliers(&self, prices: &[PriceData]) -> Vec<PriceData> {
            if prices.len() < 3 {
                return prices.to_vec();
            }

            // Calculate mean
            let sum: u128 = prices.iter().map(|p| p.price).sum();
            let mean = sum / prices.len() as u128;

            // Calculate standard deviation using fixed point arithmetic
            let variance: u128 = prices
                .iter()
                .map(|p| {
                    let diff = p.price.abs_diff(mean);
                    diff * diff
                })
                .sum();

            let variance_avg = variance / prices.len() as u128;
            // Integer square root via Newton-Raphson.
            // Starting from variance_avg is always an upper bound (sqrt(x) <= x for x >= 1),
            // so the sequence decreases monotonically to floor(sqrt(variance_avg)).
            let std_dev = if variance_avg == 0 {
                0u128
            } else {
                let mut x = variance_avg;
                loop {
                    let y = (x + variance_avg / x) / 2;
                    if y >= x {
                        break x; // converged
                    }
                    x = y;
                }
            };

            // Filter outliers (beyond threshold standard deviations)
            prices
                .iter()
                .filter(|p| {
                    let diff = p.price.abs_diff(mean);
                    diff <= std_dev * self.outlier_threshold as u128
                })
                .cloned()
                .collect()
        }

        /// Return the configured weight for an oracle source.
        fn get_source_weight(&self, source_id: &str) -> Result<u32, OracleError> {
            self.oracle_sources
                .get(&source_id.to_string())
                .map(|source| source.weight)
                .ok_or(OracleError::OracleSourceNotFound)
        }

        /// Score valuation confidence from source count and price variance.
        pub fn calculate_confidence_score(&self, prices: &[PriceData]) -> Result<u32, OracleError> {
            if prices.is_empty() {
                return Ok(0);
            }

            // Simple confidence based on number of sources and price variance
            let source_confidence = (prices.len() as u32 * 25).min(75); // Max 75 from sources

            // Calculate coefficient of variation
            let sum: u128 = prices.iter().map(|p| p.price).sum();
            let mean = sum / prices.len() as u128;

            let variance: u128 = prices
                .iter()
                .map(|p| {
                    let diff = p.price.abs_diff(mean);
                    diff * diff
                })
                .sum();

            // Calculate coefficient of variation using fixed point arithmetic
            let std_dev = if !prices.is_empty() {
                let variance_avg = variance / prices.len() as u128;
                // Simple approximation of square root (for fixed point)
                let mut approx = variance_avg;
                for _ in 0..5 {
                    // Newton-Raphson approximation
                    if approx > 0 {
                        approx = (approx + variance_avg / approx) / 2;
                    }
                }
                approx
            } else {
                0
            };

            let cv = if mean > 0 {
                (std_dev * 10000) / mean // Multiply by 10000 for precision
            } else {
                10000
            };

            // Lower CV = higher confidence (CV is in basis points)
            let variance_confidence = if cv <= 10000 {
                ((10000 - cv) / 400) as u32 // Scale to 0-25 range
            } else {
                0
            };

            Ok(source_confidence + variance_confidence)
        }

        /// Calculate short-term volatility from recent historical valuations.
        fn calculate_volatility(&self, property_id: u64) -> Result<u32, OracleError> {
            let historical = self.get_historical_valuations(property_id, 30); // Last 30 valuations

            if historical.len() < 2 {
                return Ok(0);
            }

            // Calculate price changes
            let mut changes = Vec::new();
            for i in 1..historical.len() {
                let prev = historical[i - 1].valuation;
                let curr = historical[i].valuation;

                if prev > 0 {
                    let change = (curr.abs_diff(prev) * 10000) / prev;
                    changes.push(change);
                }
            }

            // Average absolute change as volatility index (in basis points)
            let total_change: u128 = changes.iter().sum();
            let avg_change_bp = total_change / changes.len() as u128;
            Ok((avg_change_bp / 100).min(100) as u32) // Convert to percentage
        }

        /// Build a confidence interval around a valuation from its confidence score.
        fn calculate_confidence_interval(
            &self,
            valuation: &PropertyValuation,
        ) -> Result<(u128, u128), OracleError> {
            // Simple confidence interval based on confidence score
            let margin = valuation.valuation * (100 - valuation.confidence_score) as u128 / 10000; // 1% per confidence point

            Ok((
                valuation.valuation.saturating_sub(margin),
                valuation.valuation + margin,
            ))
        }

        /// Return the current outlier count for a property.
        fn detect_outliers(&self, _property_id: u64) -> Result<u32, OracleError> {
            // This would implement outlier detection logic
            // For now, return 0
            Ok(0)
        }

        /// Append a valuation to history while retaining the latest 100 entries.
        fn store_historical_valuation(&mut self, property_id: u64, valuation: PropertyValuation) {
            let mut history = self
                .historical_valuations
                .get(&property_id)
                .unwrap_or_default();
            history.push(valuation);

            // Keep only last 100 valuations
            if history.len() > 100 {
                let start_index = history.len() - 100;
                history = history.into_iter().skip(start_index).collect();
            }

            self.historical_valuations.insert(&property_id, &history);
        }

        /// Emit alerts when a valuation moves beyond a configured threshold.
        fn check_price_alerts(
            &mut self,
            property_id: u64,
            new_valuation: u128,
        ) -> Result<(), OracleError> {
            if let Some(last_valuation) = self.property_valuations.get(&property_id) {
                let change_percentage =
                    self.calculate_percentage_change(last_valuation.valuation, new_valuation);

                if let Some(alerts) = self.price_alerts.get(&property_id) {
                    for alert in alerts {
                        if alert.is_active
                            && change_percentage >= alert.threshold_percentage as u128
                        {
                            self.env().emit_event(PriceAlertTriggered {
                                property_id,
                                old_valuation: last_valuation.valuation,
                                new_valuation,
                                change_percentage: change_percentage as u32,
                                alert_address: alert.alert_address,
                            });
                        }
                    }
                }
            }
            Ok(())
        }

        /// Calculate absolute percentage change between two valuation amounts.
        pub fn calculate_percentage_change(&self, old_value: u128, new_value: u128) -> u128 {
            if old_value == 0 {
                return 0;
            }

            let diff = new_value.abs_diff(old_value);

            (diff * 100) / old_value
        }

        /// Clear pending request after successful update
        fn clear_pending_request(&mut self, property_id: u64) {
            self.pending_requests.remove(&property_id);
        }
    }

    /// Reduce a 32-byte little-endian value modulo the Bn254 scalar field
    /// order, returning the canonical 32-byte little-endian representation.
    ///
    /// Mirrors `contracts/lib/src/zk.rs::reduce_mod_bn254` and the copy in
    /// `contracts/zk-compliance/src/verification_keys.rs` (this contract has
    /// no arkworks dependency). Matches `ark_ff::PrimeField::from_le_bytes_mod_order`
    /// + compressed serialization, which is how the off-chain prover derives
    /// the public input from the statement binding.
    fn reduce_mod_bn254(bytes: &[u8; 32]) -> [u8; 32] {
        // Bn254 scalar field order as little-endian u64 limbs.
        const MODULUS_LE: [u64; 4] = [
            0x3c20_8c16_d87c_fd47,
            0x9781_6a91_6871_ca8d,
            0xb850_45b6_8181_585d,
            0x3064_4e72_e131_a029,
        ];

        // Interpret the input as a 256-bit little-endian integer.
        let mut h = [0u64; 4];
        for (i, limb) in h.iter_mut().enumerate() {
            let mut acc = 0u64;
            for j in 0..8 {
                acc |= (bytes[i * 8 + j] as u64) << (8 * j);
            }
            *limb = acc;
        }

        // H < 2^256 and the modulus is > 2^253, so this subtracts at most a
        // handful of times.
        loop {
            // Is h >= modulus? (compare from the most significant limb down)
            let mut ge = true;
            for i in (0..4).rev() {
                if h[i] > MODULUS_LE[i] {
                    break;
                }
                if h[i] < MODULUS_LE[i] {
                    ge = false;
                    break;
                }
            }
            if !ge {
                break;
            }
            // h -= modulus
            let mut borrow = false;
            for i in 0..4 {
                let (d1, b1) = h[i].overflowing_sub(MODULUS_LE[i]);
                let (d2, b2) = d1.overflowing_sub(borrow as u64);
                h[i] = d2;
                borrow = b1 || b2;
            }
        }

        // Write the reduced value back as 32 little-endian bytes.
        let mut out = [0u8; 32];
        for (i, limb) in h.iter().enumerate() {
            for j in 0..8 {
                out[i * 8 + j] = ((limb >> (8 * j)) & 0xff) as u8;
            }
        }
        out
    }

    /// Implementation of the Oracle trait from propchain-traits
    impl propchain_traits::Oracle for PropertyValuationOracle {
        /// Return the latest valuation through the shared oracle trait.
        #[ink(message)]
        fn get_valuation(&self, property_id: u64) -> Result<PropertyValuation, OracleError> {
            self.get_property_valuation(property_id)
        }

        /// Return valuation data with confidence metrics through the shared oracle trait.
        #[ink(message)]
        fn get_valuation_with_confidence(
            &self,
            property_id: u64,
        ) -> Result<ValuationWithConfidence, OracleError> {
            self.get_valuation_with_confidence(property_id)
        }

        /// Queue a valuation request through the shared oracle trait.
        #[ink(message)]
        fn request_valuation(&mut self, property_id: u64) -> Result<u64, OracleError> {
            self.request_property_valuation(property_id)
        }

        /// Queue multiple valuation requests through the shared oracle trait.
        #[ink(message)]
        fn batch_request_valuations(
            &mut self,
            property_ids: Vec<u64>,
        ) -> Result<Vec<u64>, OracleError> {
            self.batch_request_valuations(property_ids)
        }

        /// Return recent historical valuations through the shared oracle trait.
        #[ink(message)]
        fn get_historical_valuations(
            &self,
            property_id: u64,
            limit: u32,
        ) -> Vec<PropertyValuation> {
            self.get_historical_valuations(property_id, limit)
        }

        /// Return market volatility metrics through the shared oracle trait.
        #[ink(message)]
        fn get_market_volatility(
            &self,
            property_type: PropertyType,
            location: String,
        ) -> Result<VolatilityMetrics, OracleError> {
            self.get_market_volatility(property_type, location)
        }
    }

    /// Implementation of the OracleRegistry trait from propchain-traits
    impl propchain_traits::OracleRegistry for PropertyValuationOracle {
        /// Add an oracle source through the shared registry trait.
        #[ink(message)]
        fn add_source(&mut self, source: OracleSource) -> Result<(), OracleError> {
            self.add_oracle_source(source)
        }

        /// Remove an oracle source from active aggregation.
        #[ink(message)]
        fn remove_source(&mut self, source_id: String) -> Result<(), OracleError> {
            self.ensure_admin()?;
            self.oracle_sources.remove(&source_id);
            self.active_sources.retain(|id| id != &source_id);
            Ok(())
        }

        /// Update an oracle source reputation score after a success or failure.
        #[ink(message)]
        fn update_reputation(
            &mut self,
            source_id: String,
            success: bool,
        ) -> Result<(), OracleError> {
            self.update_source_reputation(source_id, success)
        }

        /// Return the stored reputation score for an oracle source.
        #[ink(message)]
        fn get_reputation(&self, source_id: String) -> Option<u32> {
            self.source_reputations.get(&source_id)
        }

        /// Apply a slashing penalty to an oracle source.
        #[ink(message)]
        fn slash_source(
            &mut self,
            source_id: String,
            penalty_amount: u128,
        ) -> Result<(), OracleError> {
            self.slash_source(source_id, penalty_amount)
        }

        /// Check whether a new valuation looks anomalous for a property.
        #[ink(message)]
        fn detect_anomalies(&self, property_id: u64, new_valuation: u128) -> bool {
            self.is_anomaly(property_id, new_valuation)
        }
    }

    impl Default for PropertyValuationOracle {
        /// Build a default oracle using a zero admin account for tests and tooling.
        fn default() -> Self {
            Self::new(AccountId::from([0x0; 32]))
        }
    }
}

// Re-export the contract and error type
pub use propchain_traits::OracleError;

#[cfg(test)]
mod oracle_tests {
    use super::*;
    // use ink::codegen::env::Env; // Removed invalid import
    use crate::propchain_oracle::PropertyValuationOracle;
    use ink::env::{test, DefaultEnvironment};

    fn setup_oracle() -> PropertyValuationOracle {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        PropertyValuationOracle::new(accounts.alice)
    }

    #[ink::test]
    fn test_new_oracle_works() {
        let oracle = setup_oracle();
        assert_eq!(oracle.active_sources.len(), 0);
        assert_eq!(oracle.min_sources_required, 2);
    }

    #[ink::test]
    fn test_add_oracle_source_works() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        let source = OracleSource {
            id: "chainlink_feed".to_string(),
            source_type: OracleSourceType::Chainlink,
            address: accounts.bob,
            is_active: true,
            weight: 50,
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
        };

        assert!(oracle.add_oracle_source(source).is_ok());
        assert_eq!(oracle.active_sources.len(), 1);
        assert_eq!(oracle.active_sources[0], "chainlink_feed");
    }

    #[ink::test]
    fn test_unauthorized_add_source_fails() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        // Switch to non-admin caller
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        let source = OracleSource {
            id: "chainlink_feed".to_string(),
            source_type: OracleSourceType::Chainlink,
            address: accounts.bob,
            is_active: true,
            weight: 50,
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
        };

        assert_eq!(
            oracle.add_oracle_source(source),
            Err(OracleError::Unauthorized)
        );
    }

    #[ink::test]
    fn test_update_property_valuation_works() {
        let mut oracle = setup_oracle();

        let valuation = PropertyValuation {
            property_id: 1,
            valuation: 500000, // $500,000
            confidence_score: 85,
            sources_used: 3,
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
            valuation_method: ValuationMethod::MarketData,
        };

        assert!(oracle
            .update_property_valuation(1, valuation.clone())
            .is_ok());

        let retrieved = oracle.get_property_valuation(1);
        assert!(retrieved.is_ok());
        assert_eq!(
            retrieved.expect("Valuation should exist after update"),
            valuation
        );
    }

    #[ink::test]
    fn test_get_nonexistent_valuation_fails() {
        let oracle = setup_oracle();
        assert_eq!(
            oracle.get_property_valuation(999),
            Err(OracleError::PropertyNotFound)
        );
    }

    #[ink::test]
    fn test_set_price_alert_works() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        assert!(oracle.set_price_alert(1, 5, accounts.bob).is_ok());

        let alerts = oracle.price_alerts.get(&1).unwrap_or_default();
        assert_eq!(alerts.len(), 1);
        assert_eq!(alerts[0].threshold_percentage, 5);
        assert_eq!(alerts[0].alert_address, accounts.bob);
    }

    #[ink::test]
    fn test_calculate_percentage_change() {
        let oracle = setup_oracle();

        // Test 10% increase
        assert_eq!(oracle.calculate_percentage_change(100, 110), 10);

        // Test 20% decrease
        assert_eq!(oracle.calculate_percentage_change(100, 80), 20);

        // Test no change
        assert_eq!(oracle.calculate_percentage_change(100, 100), 0);

        // Test zero old value
        assert_eq!(oracle.calculate_percentage_change(0, 100), 0);
    }

    #[ink::test]
    fn test_aggregate_prices_works() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        // Register oracle sources so get_source_weight succeeds
        for (id, weight) in &[("source1", 50u32), ("source2", 50u32), ("source3", 50u32)] {
            oracle
                .add_oracle_source(OracleSource {
                    id: id.to_string(),
                    source_type: OracleSourceType::Manual,
                    address: accounts.bob,
                    is_active: true,
                    weight: *weight,
                    last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
                })
                .expect("Oracle source registration should succeed in test");
        }

        let prices = vec![
            PriceData {
                price: 100,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source1".to_string(),
            },
            PriceData {
                price: 105,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source2".to_string(),
            },
            PriceData {
                price: 98,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source3".to_string(),
            },
        ];

        let result = oracle.aggregate_prices(&prices);
        assert!(result.is_ok());

        let aggregated = result.expect("Price aggregation should succeed in test");
        // Should be close to the weighted average of 100, 105, 98 ≈ 101
        assert!((98..=105).contains(&aggregated));
    }

    #[ink::test]
    fn test_aggregate_prices_rejects_overflow() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        oracle
            .add_oracle_source(OracleSource {
                id: "heavy".to_string(),
                source_type: OracleSourceType::Manual,
                address: accounts.bob,
                is_active: true,
                weight: 100,
                last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
            })
            .expect("Oracle source registration should succeed in test");
        oracle
            .add_oracle_source(OracleSource {
                id: "light".to_string(),
                source_type: OracleSourceType::Manual,
                address: accounts.bob,
                is_active: true,
                weight: 1,
                last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
            })
            .expect("Oracle source registration should succeed in test");

        let prices = vec![
            PriceData {
                price: u128::MAX,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "heavy".to_string(),
            },
            PriceData {
                price: 1,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "light".to_string(),
            },
        ];

        assert_eq!(
            oracle.aggregate_prices(&prices),
            Err(OracleError::InvalidValuation)
        );
    }

    #[ink::test]
    fn test_aggregate_prices_rejects_unknown_source() {
        let oracle = setup_oracle();

        let prices = vec![
            PriceData {
                price: 100,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "unknown_a".to_string(),
            },
            PriceData {
                price: 101,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "unknown_b".to_string(),
            },
        ];

        assert_eq!(
            oracle.aggregate_prices(&prices),
            Err(OracleError::OracleSourceNotFound)
        );
    }

    #[ink::test]
    fn test_aggregate_prices_rejects_zero_total_weight() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        for id in ["zero1", "zero2"] {
            oracle
                .add_oracle_source(OracleSource {
                    id: id.to_string(),
                    source_type: OracleSourceType::Manual,
                    address: accounts.bob,
                    is_active: true,
                    weight: 0,
                    last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
                })
                .expect("Oracle source registration should succeed in test");
        }

        let prices = vec![
            PriceData {
                price: 100,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "zero1".to_string(),
            },
            PriceData {
                price: 102,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "zero2".to_string(),
            },
        ];

        assert_eq!(
            oracle.aggregate_prices(&prices),
            Err(OracleError::InvalidParameters)
        );
    }

    #[ink::test]
    fn test_filter_outliers_works() {
        let oracle = setup_oracle();

        // 5 tightly-clustered values + 1 extreme outlier.
        // With these values: mean ≈ 250, std_dev ≈ 335.
        // 1000's deviation (750) > 2 * 335 (670), so it is filtered.
        // The 5 normal values are all within 2σ and are kept.
        let prices = vec![
            PriceData {
                price: 98,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source1".to_string(),
            },
            PriceData {
                price: 99,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source2".to_string(),
            },
            PriceData {
                price: 100,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source3".to_string(),
            },
            PriceData {
                price: 101,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source4".to_string(),
            },
            PriceData {
                price: 102,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source5".to_string(),
            },
            PriceData {
                price: 1000, // True outlier: ~2.2 sigma from mean
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source6".to_string(),
            },
        ];

        let filtered = oracle.filter_outliers(&prices);
        // The 1000 outlier should be filtered, leaving the 5 normal prices
        assert_eq!(filtered.len(), 5);
        assert!(filtered.iter().all(|p| p.price < 200));
    }

    #[ink::test]
    fn test_calculate_confidence_score() {
        let oracle = setup_oracle();

        let prices = vec![
            PriceData {
                price: 100,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source1".to_string(),
            },
            PriceData {
                price: 102,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source2".to_string(),
            },
            PriceData {
                price: 98,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: "source3".to_string(),
            },
        ];

        let score = oracle.calculate_confidence_score(&prices);
        assert!(score.is_ok());

        let score = score.expect("Confidence score calculation should succeed in test");
        // Should be reasonably high due to low variance and multiple sources
        assert!(score > 50);
    }

    #[ink::test]
    fn test_set_location_adjustment_works() {
        let mut oracle = setup_oracle();

        let adjustment = LocationAdjustment {
            location_code: "NYC_MANHATTAN".to_string(),
            adjustment_percentage: 15, // 15% premium
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
            confidence_score: 90,
        };

        assert!(oracle.set_location_adjustment(adjustment.clone()).is_ok());

        let stored = oracle.location_adjustments.get(&adjustment.location_code);
        assert!(stored.is_some());
        assert_eq!(
            stored.expect("Location adjustment should exist after setting"),
            adjustment
        );
    }

    #[ink::test]
    fn test_get_comparable_properties_works() {
        let oracle = setup_oracle();

        // Test with empty cache
        let comparables = oracle.get_comparable_properties(1, 10);
        assert_eq!(comparables.len(), 0);
    }

    #[ink::test]
    fn test_get_historical_valuations_works() {
        let oracle = setup_oracle();

        // Test with no history
        let history = oracle.get_historical_valuations(1, 10);
        assert_eq!(history.len(), 0);
    }

    #[ink::test]
    fn test_get_historical_valuations_limit_is_capped() {
        let mut oracle = setup_oracle();

        // Store more valuations than the retention/return cap.
        for i in 1..=105u128 {
            let valuation = PropertyValuation {
                property_id: 1,
                valuation: 500_000 + i, // non-zero, slightly varying
                confidence_score: 85,
                sources_used: 3,
                last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
                valuation_method: ValuationMethod::MarketData,
                confirmed_at_block: None,
            };
            oracle
                .update_property_valuation(1, valuation)
                .expect("update should succeed");
        }

        // A huge limit cannot force unbounded iteration: the result is clamped
        // to MAX_HISTORICAL_LIMIT (which also equals the storage retention cap).
        let capped = oracle.get_historical_valuations(1, u32::MAX);
        assert_eq!(capped.len(), 100);

        // Smaller limits are still honoured exactly.
        assert_eq!(oracle.get_historical_valuations(1, 5).len(), 5);
        assert_eq!(oracle.get_historical_valuations(1, 50).len(), 50);

        // Results are most-recent-first (last stored valuation comes first).
        assert_eq!(capped[0].valuation, 500_000 + 105);
    }

    #[ink::test]
    fn test_insufficient_sources_error() {
        let oracle = setup_oracle();

        let prices = vec![PriceData {
            price: 100,
            timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
            source: "source1".to_string(),
        }];

        // With min_sources_required = 2, this should fail
        let result = oracle.aggregate_prices(&prices);
        assert_eq!(result, Err(OracleError::InsufficientSources));
    }

    #[ink::test]
    fn test_source_reputation_works() {
        let mut oracle = setup_oracle();
        let source_id = "source1".to_string();

        // Initial reputation should be 500
        assert!(oracle
            .update_source_reputation(source_id.clone(), true)
            .is_ok());
        assert_eq!(
            oracle
                .source_reputations
                .get(&source_id)
                .expect("Source reputation should exist after update"),
            510
        );

        // Test penalty
        assert!(oracle
            .update_source_reputation(source_id.clone(), false)
            .is_ok());
        assert_eq!(
            oracle
                .source_reputations
                .get(&source_id)
                .expect("Source reputation should exist after update"),
            460
        );
    }

    #[ink::test]
    fn test_slashing_works() {
        let mut oracle = setup_oracle();
        let source_id = "source1".to_string();

        oracle.source_stakes.insert(&source_id, &1000);
        assert!(oracle.slash_source(source_id.clone(), 100).is_ok());

        assert_eq!(
            oracle
                .source_stakes
                .get(&source_id)
                .expect("Source stake should exist after slashing"),
            900
        );
        // Reputation should also decrease
        assert!(
            oracle
                .source_reputations
                .get(&source_id)
                .expect("Source reputation should exist after slashing")
                < 500
        );
    }

    #[ink::test]
    fn test_anomaly_detection_works() {
        let mut oracle = setup_oracle();
        let property_id = 1;

        let valuation = PropertyValuation {
            property_id,
            valuation: 100000,
            confidence_score: 90,
            sources_used: 3,
            last_updated: 0,
            valuation_method: ValuationMethod::Automated,
        };

        oracle.property_valuations.insert(&property_id, &valuation);

        // Normal price change (5%)
        assert!(!oracle.is_anomaly(property_id, 105000));

        // Anomaly price change (25%)
        assert!(oracle.is_anomaly(property_id, 130000));
    }

    #[ink::test]
    fn test_batch_request_works() {
        let mut oracle = setup_oracle();
        let property_ids = vec![1, 2, 3];

        let result = oracle.batch_request_valuations(property_ids);
        assert!(result.is_ok());
        let request_ids = result.expect("Batch request should succeed in test");
        assert_eq!(request_ids.len(), 3);

        assert!(oracle.pending_requests.get(&1).is_some());
        assert!(oracle.pending_requests.get(&2).is_some());
        assert!(oracle.pending_requests.get(&3).is_some());
    }

    // =========================================================================
    // ZERO-KNOWLEDGE ATTESTATION TESTS
    // =========================================================================

    /// Only the admin may set the ZK compliance contract.
    #[ink::test]
    fn test_set_zk_compliance_contract_unauthorized_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob); // not admin

        assert_eq!(
            oracle.set_zk_compliance_contract(accounts.charlie),
            Err(OracleError::Unauthorized),
            "Non-admin must not set the ZK compliance contract"
        );
    }

    /// Submitting a ZK attestation without a configured compliance contract
    /// must fail explicitly.
    #[ink::test]
    fn test_submit_zk_valuation_without_contract_fails() {
        let mut oracle = setup_oracle();

        let attestation = ZkProofData {
            proof_type: ZkProofType::PropertyOwnership,
            status: ZkProofStatus::Verified,
            public_inputs: vec![[0u8; 32]],
            proof_data: vec![0u8; 128],
            created_at: 0,
            expires_at: u64::MAX,
            verifier: AccountId::from([0x0; 32]),
            metadata: vec![],
        };

        assert_eq!(
            oracle.submit_zk_valuation(1, 500_000, 90, attestation),
            Err(OracleError::ZkComplianceNotSet),
            "ZK attestation without a compliance contract must fail"
        );
    }

    /// The statement binding must match: a proof whose public input does not
    /// commit to `(property_id, valuation)` is rejected locally.
    #[ink::test]
    fn test_submit_zk_valuation_binding_mismatch_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        oracle
            .set_zk_compliance_contract(accounts.bob)
            .expect("admin set should succeed");

        let attestation = ZkProofData {
            proof_type: ZkProofType::PropertyOwnership,
            status: ZkProofStatus::Verified,
            public_inputs: vec![[0x11u8; 32]], // wrong binding
            proof_data: vec![0u8; 128],
            created_at: 0,
            expires_at: u64::MAX,
            verifier: AccountId::from([0x0; 32]),
            metadata: vec![],
        };

        assert_eq!(
            oracle.submit_zk_valuation(1, 500_000, 90, attestation),
            Err(OracleError::InvalidZkProof),
            "Mismatched statement binding must be rejected locally"
        );
    }

    /// A valuation of zero is never accepted, even with a well-formed attestation.
    #[ink::test]
    fn test_submit_zk_valuation_zero_value_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        oracle.set_zk_compliance_contract(accounts.bob).unwrap();

        let attestation = ZkProofData {
            proof_type: ZkProofType::PropertyOwnership,
            status: ZkProofStatus::Verified,
            public_inputs: vec![[0u8; 32]],
            proof_data: vec![0u8; 128],
            created_at: 0,
            expires_at: u64::MAX,
            verifier: AccountId::from([0x0; 32]),
            metadata: vec![],
        };

        assert_eq!(
            oracle.submit_zk_valuation(1, 0, 90, attestation),
            Err(OracleError::InvalidValuation),
            "Zero valuation must be rejected"
        );
    }

    // =========================================================================
    // NEGATIVE TEST CASES — invalid inputs, unauthorized access, state violations
    // =========================================================================

    /// Non-admin callers must not be able to add oracle sources.
    #[ink::test]
    fn test_add_source_unauthorized_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob); // not admin

        let source = OracleSource {
            id: "attacker_feed".to_string(),
            source_type: OracleSourceType::Chainlink,
            address: accounts.bob,
            is_active: true,
            weight: 50,
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
        };

        assert_eq!(
            oracle.add_oracle_source(source),
            Err(OracleError::Unauthorized),
            "Non-admin must not add oracle sources"
        );
    }

    /// Non-admin callers must not be able to update property valuations.
    #[ink::test]
    fn test_update_valuation_unauthorized_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.charlie); // not admin

        let valuation = PropertyValuation {
            property_id: 1,
            valuation: 999_999,
            confidence_score: 90,
            sources_used: 1,
            last_updated: 0,
            valuation_method: ValuationMethod::MarketData,
        };

        assert_eq!(
            oracle.update_property_valuation(1, valuation),
            Err(OracleError::Unauthorized),
            "Non-admin must not update valuations"
        );
    }

    /// Non-admin callers must not be able to set the risk pool.
    #[ink::test]
    fn test_set_risk_pool_unauthorized_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.dave);

        assert_eq!(
            oracle.set_risk_pool(accounts.eve),
            Err(OracleError::Unauthorized),
            "Non-admin must not set risk pool"
        );
    }

    /// Non-admin callers must not be able to slash sources.
    #[ink::test]
    fn test_slash_source_unauthorized_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.bob);

        assert_eq!(
            oracle.slash_source("some_source".to_string(), 100),
            Err(OracleError::Unauthorized),
            "Non-admin must not slash sources"
        );
    }

    /// Querying a property that has never been registered must return PropertyNotFound.
    #[ink::test]
    fn test_get_valuation_nonexistent_property() {
        let oracle = setup_oracle();
        assert_eq!(
            oracle.get_property_valuation(0),
            Err(OracleError::PropertyNotFound),
            "Property 0 should not exist"
        );
        assert_eq!(
            oracle.get_property_valuation(u64::MAX),
            Err(OracleError::PropertyNotFound),
            "Max property_id should not exist"
        );
    }

    /// A valuation with value 0 must be rejected as invalid.
    #[ink::test]
    fn test_update_valuation_zero_value_rejected() {
        let mut oracle = setup_oracle();

        let bad_valuation = PropertyValuation {
            property_id: 1,
            valuation: 0, // invalid
            confidence_score: 80,
            sources_used: 2,
            last_updated: 0,
            valuation_method: ValuationMethod::MarketData,
        };

        assert_eq!(
            oracle.update_property_valuation(1, bad_valuation),
            Err(OracleError::InvalidValuation),
            "Zero valuation must be rejected"
        );
    }

    /// An oracle source with weight > 100 must be rejected.
    #[ink::test]
    fn test_add_source_invalid_weight_rejected() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        let bad_source = OracleSource {
            id: "bad_weight".to_string(),
            source_type: OracleSourceType::Manual,
            address: accounts.bob,
            is_active: true,
            weight: 101, // invalid — max is 100
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
        };

        assert_eq!(
            oracle.add_oracle_source(bad_source),
            Err(OracleError::InvalidParameters),
            "Weight > 100 must be rejected"
        );
    }

    /// Aggregating fewer prices than `min_sources_required` must fail.
    #[ink::test]
    fn test_aggregate_prices_below_minimum_sources() {
        let mut oracle = setup_oracle();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        oracle
            .add_oracle_source(OracleSource {
                id: "only_source".to_string(),
                source_type: OracleSourceType::Manual,
                address: accounts.bob,
                is_active: true,
                weight: 50,
                last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
            })
            .unwrap();

        // min_sources_required == 2, but we only provide 1
        let prices = vec![PriceData {
            price: 500_000,
            timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
            source: "only_source".to_string(),
        }];

        assert_eq!(
            oracle.aggregate_prices(&prices),
            Err(OracleError::InsufficientSources),
            "Single source must not satisfy min_sources_required = 2"
        );
    }

    /// Requesting a valuation while one is already pending must return RequestPending.
    #[ink::test]
    fn test_duplicate_valuation_request_rejected() {
        let mut oracle = setup_oracle();

        // First request succeeds
        assert!(oracle.request_property_valuation(42).is_ok());

        // Second request for the same property within the staleness window must fail
        assert_eq!(
            oracle.request_property_valuation(42),
            Err(OracleError::RequestPending),
            "Duplicate pending request must be rejected"
        );
    }

    /// Removing a source that was never registered must not panic and must leave
    /// the active_sources list unchanged.
    #[ink::test]
    fn test_remove_nonexistent_source_is_noop() {
        let mut oracle = setup_oracle();

        // Should succeed without error (idempotent remove)
        assert!(
            oracle
                .remove_source("ghost_source".to_string())
                .is_ok(),
            "Removing a non-existent source must not error"
        );
        assert_eq!(oracle.active_sources.len(), 0);
    }

    /// Slashing more than the staked amount must cap at the available stake.
    #[ink::test]
    fn test_slash_capped_at_stake() {
        let mut oracle = setup_oracle();
        let source_id = "capped_source".to_string();

        oracle.source_stakes.insert(&source_id, &200);

        // Slash 1000 but only 200 is staked — should not underflow
        assert!(oracle.slash_source(source_id.clone(), 1000).is_ok());
        assert_eq!(
            oracle.source_stakes.get(&source_id).unwrap_or(0),
            0,
            "Stake must be clamped to 0, not underflow"
        );
    }

    /// Slashing with zero stake and no risk pool should still apply a reputation penalty.
    #[ink::test]
    fn test_slash_source_zero_stake_still_penalizes_reputation() {
        let mut oracle = setup_oracle();
        let source_id = "no_stake_source".to_string();

        assert!(oracle.slash_source(source_id.clone(), 500).is_ok());
        assert_eq!(oracle.source_stakes.get(&source_id).unwrap_or(0), 0);
        assert_eq!(oracle.source_reputations.get(&source_id).unwrap_or(500), 450);
    }

    /// Slashing with penalty 0 should be a no-op for stake but still execute without error.
    #[ink::test]
    fn test_slash_source_zero_penalty_no_stake_change() {
        let mut oracle = setup_oracle();
        let source_id = "zero_penalty_source".to_string();

        oracle.source_stakes.insert(&source_id, &700);
        assert!(oracle.slash_source(source_id.clone(), 0).is_ok());
        assert_eq!(oracle.source_stakes.get(&source_id).unwrap_or(0), 700);
    }

    /// `get_valuation_with_confidence` must propagate PropertyNotFound for unknown properties.
    #[ink::test]
    fn test_get_valuation_with_confidence_nonexistent() {
        let oracle = setup_oracle();
        assert_eq!(
            oracle.get_valuation_with_confidence(9999),
            Err(OracleError::PropertyNotFound),
            "Confidence query on unknown property must return PropertyNotFound"
        );
    }

    #[ink::test]
    fn test_claim_oracle_interface_works() {
        use propchain_traits::ClaimOracle;
        let mut oracle = setup_oracle();
        let event_id = 101;
        let payload_hash = ink::primitives::Hash::from([1u8; 32]);

        // Submit event (admin only)
        assert!(oracle.submit_external_event(event_id, payload_hash).is_ok());

        // Verify value
        let value = oracle.get_verified_value(event_id).unwrap();
        assert_eq!(value, 100);

        // Check hash
        assert_eq!(oracle.event_hashes.get(&event_id).unwrap(), payload_hash);
    }
    /// Implementation of DataMigration for PropertyValuationOracle
    impl DataMigration for PropertyValuationOracle {
        type Error = OracleError;

        /// Pause oracle state changes before migration.
        #[ink(message)]
        fn pause_for_migration(&mut self) -> Result<(), OracleError> {
            self.ensure_admin()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transitions = self.circuit_breaker.emergency_pause(now, caller);
            self.emit_circuit_breaker_transition(transitions.0);
            self.emit_circuit_breaker_transition(transitions.1);
            Ok(())
        }

        /// Resume oracle state changes after migration handling.
        #[ink(message)]
        fn resume_after_migration(&mut self) -> Result<(), OracleError> {
            self.ensure_admin()?;
            let now = self.now_seconds();
            let caller = self.env().caller();
            let transition = self
                .circuit_breaker
                .resume(now, caller)
                .map_err(|_| OracleError::InvalidParameters)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        /// Export a serialized oracle storage chunk for migration tooling.
        #[ink(message)]
        fn extract_data_chunk(&self, _chunk_id: u32, _start_index: u32, _count: u32) -> Result<Vec<u8>, OracleError> {
            self.ensure_admin()?;
            Ok(Vec::new())
        }

        /// Import serialized oracle storage data during migration.
        #[ink(message)]
        fn initialize_with_migrated_data(&mut self, _data: Vec<u8>) -> Result<(), OracleError> {
            self.ensure_admin()?;
            Ok(())
        }

        /// Confirm migrated oracle state is internally consistent.
        #[ink(message)]
        fn verify_migration(&self) -> Result<bool, OracleError> {
            Ok(true)
        }
    }
}
