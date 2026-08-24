#![cfg_attr(not(feature = "std"), no_std, no_main)]

//! AI valuation contract integrating model pipelines for property price estimation.


pub mod ml_pipeline;
#[cfg(test)]
mod tests;

use ink::prelude::vec::Vec;
use ink::prelude::string::String;
use ink::storage::Mapping;
mod state_root;
use ink::env::Environment;
use propchain_traits::*;
use stellar_insured_lib::circuit_breaker::{
    CircuitBreakerTransition, InkCircuitBreaker,
};
use ml_pipeline::*;
use scale::Encode;

mod validation;

// Zero-knowledge proof of model execution — compiled with the `zk` feature.
#[cfg(feature = "zk")]
use ark_bn254::{Bn254, Fr};
#[cfg(feature = "zk")]
use ark_ff::PrimeField;
#[cfg(feature = "zk")]
use ark_groth16::{Groth16, PreparedVerifyingKey, Proof, VerifyingKey};
#[cfg(feature = "zk")]
use ark_serialize::CanonicalDeserialize;
#[cfg(feature = "zk")]
use ark_snark::SNARK;

/// Deserialize a compressed Groth16 verification key (zk feature only).
#[cfg(feature = "zk")]
fn deserialize_vk(bytes: &[u8]) -> core::result::Result<VerifyingKey<Bn254>, ()> {
    VerifyingKey::<Bn254>::deserialize_compressed(bytes).map_err(|_| ())
}

/// Deserialize a compressed Groth16 proof (zk feature only).
#[cfg(feature = "zk")]
fn deserialize_proof(bytes: &[u8]) -> core::result::Result<Proof<Bn254>, ()> {
    Proof::<Bn254>::deserialize_compressed(bytes).map_err(|_| ())
}

/// AI-powered property valuation engine
#[ink::contract]
mod ai_valuation {
    use super::*;

    /// AI model types supported by the valuation engine
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub enum AIModelType {
        LinearRegression,
        RandomForest,
        NeuralNetwork,
        GradientBoosting,
        EnsembleModel,
    }

    /// Feature vector for property valuation
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct PropertyFeatures {
        pub location_score: u32,      // 0-1000 location desirability
        pub size_sqm: u64,           // Property size in square meters
        pub age_years: u32,          // Property age in years
        pub condition_score: u32,    // 0-100 property condition
        pub amenities_score: u32,    // 0-100 amenities rating
        pub market_trend: i32,       // -100 to 100 market trend
        pub comparable_avg: u128,    // Average price of comparables
        pub economic_indicators: u32, // 0-100 economic health score
    }

    /// AI model metadata and versioning
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct AIModel {
        pub model_id: String,
        pub model_type: AIModelType,
        pub version: u32,
        pub accuracy_score: u32,     // 0-100 model accuracy
        pub training_data_size: u64,
        pub last_updated: u64,       // Timestamp
        pub is_active: bool,
        pub weight: u32,             // 0-100 weight in ensemble
    }
    /// AI valuation prediction with confidence metrics
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct AIPrediction {
        pub predicted_value: u128,
        pub confidence_score: u32,    // 0-100
        pub uncertainty_range: (u128, u128), // (min, max) prediction interval
        pub model_id: String,
        pub features_used: PropertyFeatures,
        pub bias_score: u32,         // 0-100, lower is better
        pub fairness_score: u32,     // 0-100, higher is better
    }

    /// Ensemble prediction combining multiple models
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct EnsemblePrediction {
        pub final_valuation: u128,
        pub ensemble_confidence: u32,
        pub individual_predictions: Vec<AIPrediction>,
        pub consensus_score: u32,    // 0-100, agreement between models
        pub explanation: String,     // Human-readable explanation
    }

    /// Training data point for model updates
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct TrainingDataPoint {
        pub property_id: u64,
        pub features: PropertyFeatures,
        pub actual_value: u128,
        pub timestamp: u64,
        pub data_source: String,
    }

    /// Model performance metrics
    #[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
    pub struct ModelPerformance {
        pub model_id: String,
        pub mae: u128,               // Mean Absolute Error
        pub rmse: u128,              // Root Mean Square Error
        pub mape: u32,               // Mean Absolute Percentage Error (0-10000 for 0-100%)
        pub r_squared: u32,          // R-squared * 10000 (0-10000 for 0-1)
        pub prediction_count: u64,
        pub last_evaluated: u64,
    }
    /// AI Valuation Engine Contract
    #[ink(storage)]
    pub struct AIValuationEngine {
        /// Contract administrator
        admin: AccountId,
        /// Governance multisig allowed to schedule pause windows
        governance: AccountId,
        /// Registered AI models
        models: Mapping<String, AIModel>,
        /// Model performance tracking
        performance: Mapping<String, ModelPerformance>,
        /// Property feature cache
        property_features: Mapping<u64, PropertyFeatures>,
        /// Historical predictions for validation
        predictions: Mapping<u64, Vec<AIPrediction>>,
        /// Training data storage
        training_data: Vec<TrainingDataPoint>,
        /// ML pipelines for model training
        ml_pipelines: Mapping<String, MLPipeline>,
        /// Model versions and lifecycle
        model_versions: Mapping<String, Vec<ModelVersion>>,
        /// A/B testing configurations
        ab_tests: Mapping<String, ABTestConfig>,
        /// Drift detection results
        drift_results: Mapping<String, Vec<DriftDetectionResult>>,
        /// Oracle contract for market data
        oracle_contract: Option<AccountId>,
        /// Property registry for metadata
        property_registry: Option<AccountId>,
        /// Model update threshold (accuracy drop %)
        update_threshold: u32,
        /// Minimum confidence score for predictions
        min_confidence: u32,
        /// Maximum age for cached features (seconds)
        feature_cache_ttl: u64,
        /// Bias detection threshold
        bias_threshold: u32,
        /// Shared pause protocol state
        circuit_breaker: InkCircuitBreaker,
        /// Hash commitment of the registered model weights (per model id)
        model_commitments: Mapping<String, [u8; 32]>,
        /// Groth16 verification keys for model-execution proofs (per model id)
        model_vks: Mapping<String, VerificationKeyRecord>,
    }

    /// Events emitted by the AI Valuation Engine
    #[ink(event)]
    pub struct ModelRegistered {
        #[ink(topic)]
        model_id: String,
        model_type: AIModelType,
        version: u32,
    }

    #[ink(event)]
    pub struct PredictionGenerated {
        #[ink(topic)]
        property_id: u64,
        predicted_value: u128,
        confidence_score: u32,
        model_id: String,
    }

    #[ink(event)]
    pub struct ModelExecutionVerified {
        #[ink(topic)]
        property_id: u64,
        model_id: String,
        predicted_value: u128,
        timestamp: u64,
    }

    #[ink(event)]
    pub struct ModelUpdated {
        #[ink(topic)]
        model_id: String,
        old_version: u32,
        new_version: u32,
        accuracy_improvement: i32,
    }
    #[ink(event)]
    pub struct BiasDetected {
        #[ink(topic)]
        model_id: String,
        bias_score: u32,
        affected_properties: Vec<u64>,
    }

    #[ink(event)]
    pub struct TrainingDataAdded {
        #[ink(topic)]
        property_id: u64,
        data_points_count: u64,
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

    /// AI Valuation Engine errors
    #[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub enum AIValuationError {
        /// Unauthorized access
        Unauthorized,
        /// Model not found
        ModelNotFound,
        /// Property not found
        PropertyNotFound,
        /// Invalid model configuration
        InvalidModel,
        /// Insufficient training data
        InsufficientData,
        /// Prediction confidence too low
        LowConfidence,
        /// Bias threshold exceeded
        BiasDetected,
        /// Contract is paused
        ContractPaused,
        /// Oracle contract not set
        OracleNotSet,
        /// Property registry not set
        PropertyRegistryNotSet,
        /// Feature extraction failed
        FeatureExtractionFailed,
        /// Model prediction failed
        PredictionFailed,
        /// Invalid parameters
        InvalidParameters,
        /// Zero-knowledge backend unavailable (contract built without `zk` feature)
        ZkUnavailable,
        /// Zero-knowledge proof verification failed
        ZkVerificationFailed,
        /// No verification key registered for this model
        VerificationKeyNotFound,
    }

    impl AIValuationEngine {
        /// Create a new AI Valuation Engine
        #[ink(constructor)]
        pub fn new(admin: AccountId) -> Self {
            Self {
                admin,
                governance: admin,
                models: Mapping::default(),
                performance: Mapping::default(),
                property_features: Mapping::default(),
                predictions: Mapping::default(),
                training_data: Vec::new(),
                ml_pipelines: Mapping::default(),
                model_versions: Mapping::default(),
                ab_tests: Mapping::default(),
                drift_results: Mapping::default(),
                oracle_contract: None,
                property_registry: None,
                update_threshold: 500, // 5% accuracy drop
                min_confidence: 7000,  // 70% minimum confidence
                feature_cache_ttl: 3600, // 1 hour
                bias_threshold: 2000,  // 20% bias threshold
                circuit_breaker: InkCircuitBreaker::default(),
                model_commitments: Mapping::default(),
                model_vks: Mapping::default(),
            }
        }
        /// Set oracle contract address
        #[ink(message)]
        pub fn set_oracle(&mut self, oracle: AccountId) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.oracle_contract = Some(oracle);
            Ok(())
        }

        /// Set property registry contract address
        #[ink(message)]
        pub fn set_property_registry(&mut self, registry: AccountId) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.property_registry = Some(registry);
            Ok(())
        }

        /// Register a new AI model
        #[ink(message)]
        pub fn register_model(&mut self, model: AIModel) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            if model.model_id.is_empty() || model.accuracy_score > 10000 {
                return Err(AIValuationError::InvalidModel);
            }

            self.models.insert(&model.model_id, &model);
            
            self.env().emit_event(ModelRegistered {
                model_id: model.model_id.clone(),
                model_type: model.model_type,
                version: model.version,
            });

            Ok(())
        }

        /// Update an existing model
        #[ink(message)]
        pub fn update_model(&mut self, model_id: String, new_model: AIModel) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            let old_model = self.models.get(&model_id).ok_or(AIValuationError::ModelNotFound)?;
            
            // Calculate accuracy improvement
            let accuracy_improvement = new_model.accuracy_score as i32 - old_model.accuracy_score as i32;
            
            self.models.insert(&model_id, &new_model);

            self.env().emit_event(ModelUpdated {
                model_id: model_id.clone(),
                old_version: old_model.version,
                new_version: new_model.version,
                accuracy_improvement,
            });

            Ok(())
        }
        /// Extract features from property metadata
        #[ink(message)]
        pub fn extract_features(&mut self, property_id: u64) -> Result<PropertyFeatures, AIValuationError> {
            self.ensure_not_paused()?;

            // Check cache first
            if let Some(cached_features) = self.property_features.get(&property_id) {
                // For simplicity, assume features are still valid (in production, check timestamp)
                return Ok(cached_features);
            }

            // For testing and demo purposes, generate mock features
            // In production, this would extract real features from property metadata
            let features = self.generate_mock_features(property_id)?;
            
            // Cache the features
            self.property_features.insert(&property_id, &features);
            
            Ok(features)
        }

        /// Generate AI prediction for a property
        #[ink(message)]
        pub fn predict_valuation(&mut self, property_id: u64, model_id: String) -> Result<AIPrediction, AIValuationError> {
            self.ensure_not_paused()?;

            let model = self.models.get(&model_id).ok_or(AIValuationError::ModelNotFound)?;
            
            if !model.is_active {
                return Err(AIValuationError::ModelNotFound);
            }

            // Extract features
            let features = self.extract_features(property_id)?;
            
            // Generate prediction using the model
            let prediction = self.generate_prediction(&model, &features, property_id)?;
            
            // Check confidence threshold
            if prediction.confidence_score < self.min_confidence {
                return Err(AIValuationError::LowConfidence);
            }

            // Check for bias
            if prediction.bias_score > self.bias_threshold {
                self.env().emit_event(BiasDetected {
                    model_id: model_id.clone(),
                    bias_score: prediction.bias_score,
                    affected_properties: vec![property_id],
                });
                return Err(AIValuationError::BiasDetected);
            }

            // Store prediction for validation
            let mut property_predictions = self.predictions.get(&property_id).unwrap_or_default();
            property_predictions.push(prediction.clone());
            self.predictions.insert(&property_id, &property_predictions);

            self.env().emit_event(PredictionGenerated {
                property_id,
                predicted_value: prediction.predicted_value,
                confidence_score: prediction.confidence_score,
                model_id: model_id.clone(),
            });

            Ok(prediction)
        }
        /// Generate ensemble prediction using multiple models
        #[ink(message)]
        pub fn ensemble_predict(&mut self, property_id: u64) -> Result<EnsemblePrediction, AIValuationError> {
            self.ensure_not_paused()?;

            let features = self.extract_features(property_id)?;
            let mut individual_predictions = Vec::new();
            let mut weighted_sum = 0u128;
            let mut total_weight = 0u32;

            // Get all active models
            // Note: In a real implementation, we'd iterate over all models
            // For this example, we'll simulate with a few models
            let model_ids = vec!["linear_reg_v1".to_string(), "random_forest_v2".to_string(), "neural_net_v1".to_string()];
            
            for model_id in model_ids {
                if let Some(model) = self.models.get(&model_id) {
                    if model.is_active {
                        match self.generate_prediction(&model, &features, property_id) {
                            Ok(prediction) => {
                                if prediction.confidence_score >= self.min_confidence {
                                    weighted_sum += prediction.predicted_value * model.weight as u128;
                                    total_weight += model.weight;
                                    individual_predictions.push(prediction);
                                }
                            }
                            Err(_) => continue, // Skip failed predictions
                        }
                    }
                }
            }

            if individual_predictions.is_empty() {
                return Err(AIValuationError::InsufficientData);
            }

            // Calculate ensemble metrics
            let final_valuation = if total_weight > 0 {
                weighted_sum / total_weight as u128
            } else {
                // Simple average if no weights
                individual_predictions.iter().map(|p| p.predicted_value).sum::<u128>() / individual_predictions.len() as u128
            };

            let ensemble_confidence = self.calculate_ensemble_confidence(&individual_predictions);
            let consensus_score = self.calculate_consensus_score(&individual_predictions);
            let explanation = self.generate_explanation(&individual_predictions, final_valuation);

            Ok(EnsemblePrediction {
                final_valuation,
                ensemble_confidence,
                individual_predictions,
                consensus_score,
                explanation,
            })
        }

        /// Add training data for model improvement
        #[ink(message)]
        pub fn add_training_data(&mut self, data_point: TrainingDataPoint) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            self.training_data.push(data_point.clone());

            self.env().emit_event(TrainingDataAdded {
                property_id: data_point.property_id,
                data_points_count: self.training_data.len() as u64,
            });

            Ok(())
        }
        /// Update model performance metrics
        #[ink(message)]
        pub fn update_model_performance(&mut self, model_id: String, performance: ModelPerformance) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            // Verify model exists
            self.models.get(&model_id).ok_or(AIValuationError::ModelNotFound)?;
            
            self.performance.insert(&model_id, &performance);
            Ok(())
        }

        /// Get model performance metrics
        #[ink(message)]
        pub fn get_model_performance(&self, model_id: String) -> Option<ModelPerformance> {
            self.performance.get(&model_id)
        }

        /// Detect bias in model predictions
        #[ink(message)]
        pub fn detect_bias(&self, model_id: String, property_ids: Vec<u64>) -> Result<u32, AIValuationError> {
            let model = self.models.get(&model_id).ok_or(AIValuationError::ModelNotFound)?;
            
            // Simplified bias detection - in practice, this would be more sophisticated
            let mut bias_scores = Vec::new();
            
            for property_id in property_ids {
                if let Some(predictions) = self.predictions.get(&property_id) {
                    for prediction in predictions {
                        if prediction.model_id == model_id {
                            bias_scores.push(prediction.bias_score);
                        }
                    }
                }
            }

            if bias_scores.is_empty() {
                return Ok(0);
            }

            // Calculate average bias score
            let avg_bias = bias_scores.iter().sum::<u32>() / bias_scores.len() as u32;
            Ok(avg_bias)
        }

        /// Get explanation for a valuation
        #[ink(message)]
        pub fn explain_valuation(&self, property_id: u64, model_id: String) -> Result<String, AIValuationError> {
            let model = self.models.get(&model_id).ok_or(AIValuationError::ModelNotFound)?;
            let features = self.property_features.get(&property_id).ok_or(AIValuationError::PropertyNotFound)?;
            
            // Generate human-readable explanation
            let explanation = format!(
                "Valuation based on {} model: Location score: {}, Size: {}sqm, Age: {} years, Condition: {}/100, Market trend: {}",
                model_id,
                features.location_score,
                features.size_sqm,
                features.age_years,
                features.condition_score,
                features.market_trend
            );
            
            Ok(explanation)
        }
        /// Schedule a timed pause. Governance should be a multisig account.
        #[ink(message)]
        pub fn pause(&mut self, duration_seconds: u64) -> Result<(), AIValuationError> {
            self.ensure_governance()?;
            let caller = self.env().caller();
            let now = self.now_seconds();
            let transition = self
                .circuit_breaker
                .pause(now, duration_seconds, caller)
                .map_err(|_| AIValuationError::InvalidParameters)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        /// Schedule or activate a resume after the resume timelock.
        #[ink(message)]
        pub fn resume(&mut self) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            let caller = self.env().caller();
            let now = self.now_seconds();
            let transition = self
                .circuit_breaker
                .resume(now, caller)
                .map_err(|_| AIValuationError::InvalidParameters)?;
            self.emit_circuit_breaker_transition(transition);
            Ok(())
        }

        /// Immediately freeze valuations through the governance multisig.
        #[ink(message)]
        pub fn emergency_pause(&mut self) -> Result<(), AIValuationError> {
            self.ensure_governance()?;
            let caller = self.env().caller();
            let now = self.now_seconds();
            let transitions = self
                .circuit_breaker
                .emergency_pause(now, caller);
            self.emit_circuit_breaker_transition(transitions.0);
            self.emit_circuit_breaker_transition(transitions.1);
            Ok(())
        }

        #[ink(message)]
        pub fn is_paused(&mut self) -> bool {
            self.sync_circuit_breaker();
            let now = self.now_seconds();
            self.circuit_breaker.is_paused(now)
        }

        #[ink(message)]
        pub fn set_governance(&mut self, governance: AccountId) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.governance = governance;
            Ok(())
        }

        /// Get contract admin
        #[ink(message)]
        pub fn admin(&self) -> AccountId {
            self.admin
        }

        /// Change contract admin
        #[ink(message)]
        pub fn change_admin(&mut self, new_admin: AccountId) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.admin = new_admin;
            Ok(())
        }

        /// Get model information
        #[ink(message)]
        pub fn get_model(&self, model_id: String) -> Option<AIModel> {
            self.models.get(&model_id)
        }

        /// Get property features
        #[ink(message)]
        pub fn get_property_features(&self, property_id: u64) -> Option<PropertyFeatures> {
            self.property_features.get(&property_id)
        }

        /// Get prediction history for a property
        #[ink(message)]
        pub fn get_prediction_history(&self, property_id: u64) -> Vec<AIPrediction> {
            self.predictions.get(&property_id).unwrap_or_default()
        }

        /// Get training data count
        #[ink(message)]
        pub fn get_training_data_count(&self) -> u64 {
            self.training_data.len() as u64
        }

        #[ink(message)]
        pub fn get_state_root(&self) -> crate::state_root::StateRoot {
            crate::state_root::compute_root(&vec![self.admin.encode(), self.training_data.len().encode()])
        }

        /// Create ML pipeline for model training
        #[ink(message)]
        pub fn create_ml_pipeline(&mut self, pipeline: MLPipeline) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            if pipeline.pipeline_id.is_empty() {
                return Err(AIValuationError::InvalidParameters);
            }

            self.ml_pipelines.insert(&pipeline.pipeline_id, &pipeline);
            Ok(())
        }

        /// Update ML pipeline status
        #[ink(message)]
        pub fn update_pipeline_status(&mut self, pipeline_id: String, status: PipelineStatus) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            let mut pipeline = self.ml_pipelines.get(&pipeline_id).ok_or(AIValuationError::InvalidParameters)?;
            pipeline.status = status;
            pipeline.last_run = Some(self.env().block_timestamp());
            
            self.ml_pipelines.insert(&pipeline_id, &pipeline);
            Ok(())
        }

        /// Add model version
        #[ink(message)]
        pub fn add_model_version(&mut self, model_id: String, version: ModelVersion) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            let mut versions = self.model_versions.get(&model_id).unwrap_or_default();
            versions.push(version);
            self.model_versions.insert(&model_id, &versions);
            Ok(())
        }

        /// Detect data drift
        #[ink(message)]
        pub fn detect_data_drift(&mut self, model_id: String, detection_method: DriftDetectionMethod) -> Result<DriftDetectionResult, AIValuationError> {
            self.ensure_not_paused()?;

            // Simplified drift detection - in production, this would analyze actual data distributions
            let drift_score = (self.env().block_timestamp() % 100) as u32; // Mock drift score
            let drift_detected = drift_score > 50;
            
            let recommendation = if drift_detected {
                if drift_score > 80 {
                    DriftRecommendation::RetrainModel
                } else {
                    DriftRecommendation::MonitorClosely
                }
            } else {
                DriftRecommendation::NoAction
            };

            let result = DriftDetectionResult {
                drift_detected,
                drift_score,
                affected_features: vec!["location_score".to_string(), "market_trend".to_string()],
                detection_method,
                timestamp: 1234567890, // Mock timestamp for testing
                recommendation,
            };

            // Store drift result
            let mut drift_history = self.drift_results.get(&model_id).unwrap_or_default();
            drift_history.push(result.clone());
            self.drift_results.insert(&model_id, &drift_history);

            Ok(result)
        }

        /// Create A/B test configuration
        #[ink(message)]
        pub fn create_ab_test(&mut self, test_config: ABTestConfig) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            if test_config.test_id.is_empty() || test_config.traffic_split > 10000 {
                return Err(AIValuationError::InvalidParameters);
            }

            self.ab_tests.insert(&test_config.test_id, &test_config);
            Ok(())
        }

        /// Get ML pipeline
        #[ink(message)]
        pub fn get_ml_pipeline(&self, pipeline_id: String) -> Option<MLPipeline> {
            self.ml_pipelines.get(&pipeline_id)
        }

        /// Get model versions
        #[ink(message)]
        pub fn get_model_versions(&self, model_id: String) -> Vec<ModelVersion> {
            self.model_versions.get(&model_id).unwrap_or_default()
        }

        /// Get drift detection history
        #[ink(message)]
        pub fn get_drift_history(&self, model_id: String) -> Vec<DriftDetectionResult> {
            self.drift_results.get(&model_id).unwrap_or_default()
        }

        /// Get A/B test configuration
        #[ink(message)]
        pub fn get_ab_test(&self, test_id: String) -> Option<ABTestConfig> {
            self.ab_tests.get(&test_id)
        }

        /// Register the Groth16 verification key and weight commitment for a
        /// model (admin only).
        ///
        /// The commitment is a hash of the off-chain model weights; it is bound
        /// into the public inputs of every model-execution proof so that proofs
        /// can be attributed to this exact model version without revealing the
        /// weights.
        #[ink(message)]
        pub fn register_model_commitment(
            &mut self,
            model_id: String,
            weights_commitment: [u8; 32],
            serialized_vk: Vec<u8>,
            vk_hash: [u8; 32],
        ) -> Result<(), AIValuationError> {
            self.ensure_admin()?;
            self.ensure_not_paused()?;

            // The model must exist so the key is bound to a registered model.
            self.models
                .get(&model_id)
                .ok_or(AIValuationError::ModelNotFound)?;

            if serialized_vk.is_empty() {
                return Err(AIValuationError::InvalidParameters);
            }

            #[cfg(feature = "zk")]
            {
                deserialize_vk(&serialized_vk)
                    .map_err(|_| AIValuationError::ZkVerificationFailed)?;
            }

            let existing = self.model_vks.get(&model_id);
            let version = existing.as_ref().map(|r| r.version + 1).unwrap_or(1);

            self.model_commitments.insert(&model_id, &weights_commitment);
            self.model_vks.insert(
                &model_id,
                &VerificationKeyRecord {
                    version,
                    serialized_vk,
                    vk_hash,
                    is_active: true,
                },
            );

            Ok(())
        }

        /// Get the weight commitment registered for a model.
        #[ink(message)]
        pub fn get_model_commitment(&self, model_id: String) -> Option<[u8; 32]> {
            self.model_commitments.get(&model_id)
        }

        /// Get the verification key record registered for a model.
        #[ink(message)]
        pub fn get_model_vk(&self, model_id: String) -> Option<VerificationKeyRecord> {
            self.model_vks.get(&model_id)
        }

        /// Verify a zero-knowledge proof of model execution.
        ///
        /// The prover runs the real model off-chain and produces a Groth16
        /// proof that the prediction was computed from the registered weights
        /// without revealing them. The single public input binds the statement
        /// `(weights_commitment, feature_hash, predicted_value)` via
        /// BLAKE2b-256. On success the attested prediction is recorded and
        /// returned.
        ///
        /// Requires the `zk` feature; otherwise returns
        /// [`AIValuationError::ZkUnavailable`].
        #[ink(message)]
        pub fn verify_model_execution_zk(
            &mut self,
            property_id: u64,
            model_id: String,
            predicted_value: u128,
            feature_hash: [u8; 32],
            proof_data: Vec<u8>,
        ) -> Result<AIPrediction, AIValuationError> {
            #[cfg(feature = "zk")]
            {
                self.ensure_not_paused()?;

                let model = self
                    .models
                    .get(&model_id)
                    .ok_or(AIValuationError::ModelNotFound)?;
                let commitment = self
                    .model_commitments
                    .get(&model_id)
                    .ok_or(AIValuationError::VerificationKeyNotFound)?;
                let record = self
                    .model_vks
                    .get(&model_id)
                    .ok_or(AIValuationError::VerificationKeyNotFound)?;
                if !record.is_active {
                    return Err(AIValuationError::VerificationKeyNotFound);
                }

                // Build the bound public input:
                //   H(H(weights_commitment) || feature_hash || H(predicted_value))
                let value_binding = self.bind_public_input(&predicted_value.encode());
                let mut statement = Vec::new();
                statement.extend_from_slice(&commitment);
                statement.extend_from_slice(&feature_hash);
                statement.extend_from_slice(&value_binding);
                let public_input = self.bind_public_input(&statement);

                let vk = deserialize_vk(&record.serialized_vk)
                    .map_err(|_| AIValuationError::ZkVerificationFailed)?;
                let proof = deserialize_proof(&proof_data)
                    .map_err(|_| AIValuationError::ZkVerificationFailed)?;
                let inputs: Vec<Fr> = vec![public_input]
                    .iter()
                    .map(|b| Fr::from_le_bytes_mod_order(b.as_slice()))
                    .collect();
                let pvk = PreparedVerifyingKey::from(vk);
                let valid = Groth16::<Bn254>::verify_with_processed_vk(&pvk, &inputs, &proof)
                    .map_err(|_| AIValuationError::ZkVerificationFailed)?;
                if !valid {
                    return Err(AIValuationError::ZkVerificationFailed);
                }

                // Record the attested prediction.
                let uncertainty = predicted_value / 10;
                let prediction = AIPrediction {
                    predicted_value,
                    confidence_score: model.accuracy_score,
                    uncertainty_range: (
                        predicted_value.saturating_sub(uncertainty),
                        predicted_value + uncertainty,
                    ),
                    model_id: model.model_id.clone(),
                    features_used: self
                        .property_features
                        .get(&property_id)
                        .unwrap_or(PropertyFeatures {
                            location_score: 0,
                            size_sqm: 0,
                            age_years: 0,
                            condition_score: 0,
                            amenities_score: 0,
                            market_trend: 0,
                            comparable_avg: 0,
                            economic_indicators: 0,
                        }),
                    bias_score: 0,
                    fairness_score: 10000,
                };

                let mut history = self.predictions.get(&property_id).unwrap_or_default();
                history.push(prediction.clone());
                self.predictions.insert(&property_id, &history);

                self.env().emit_event(ModelExecutionVerified {
                    property_id,
                    model_id: model.model_id,
                    predicted_value,
                    timestamp: self.env().block_timestamp(),
                });

                Ok(prediction)
            }
            #[cfg(not(feature = "zk"))]
            {
                let _ = (property_id, model_id, predicted_value, feature_hash, proof_data);
                Err(AIValuationError::ZkUnavailable)
            }
        }

        // Private helper methods
        /// Require the caller to be the engine admin before privileged state changes.
        fn ensure_admin(&self) -> Result<(), AIValuationError> {
            if self.env().caller() != self.admin {
                return Err(AIValuationError::Unauthorized);
            }
            Ok(())
        }

        fn ensure_governance(&self) -> Result<(), AIValuationError> {
            if self.env().caller() != self.governance {
                return Err(AIValuationError::Unauthorized);
            }
            Ok(())
        }

        /// Block state-changing operations while the valuation engine is paused.
        fn ensure_not_paused(&mut self) -> Result<(), AIValuationError> {
            self.sync_circuit_breaker();
            let now = self.now_seconds();
            if self.circuit_breaker.is_paused(now) {
                return Err(AIValuationError::ContractPaused);
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

        /// Hash a statement into the single 32-byte public input expected by
        /// the off-chain prover (BLAKE2b-256 of the statement bytes).
        fn bind_public_input(&self, statement: &[u8]) -> [u8; 32] {
            use ink::env::hash::{Blake2x256, HashOutput};

            let mut output = <Blake2x256 as HashOutput>::Type::default();
            self.env().hash_bytes::<Blake2x256>(statement, &mut output);
            output
        }

        /// Produce deterministic placeholder property features for local valuation flows.
        fn generate_mock_features(&self, property_id: u64) -> Result<PropertyFeatures, AIValuationError> {
            // Mock feature generation based on property_id
            // In production, this would extract real features from property metadata
            let base_score = (property_id % 1000) as u32;
            
            Ok(PropertyFeatures {
                location_score: 500 + (base_score % 500),
                size_sqm: 100 + (property_id % 300),
                age_years: (property_id % 50) as u32,
                condition_score: 60 + (base_score % 40),
                amenities_score: 50 + (base_score % 50),
                market_trend: ((base_score % 200) as i32) - 100,
                comparable_avg: 500000 + (property_id as u128 * 1000),
                economic_indicators: 40 + (base_score % 60),
            })
        }

        /// Generate a simplified model prediction from property features and model quality.
        fn generate_prediction(&self, model: &AIModel, features: &PropertyFeatures, property_id: u64) -> Result<AIPrediction, AIValuationError> {
            // Simplified prediction generation
            // In production, this would use actual ML model inference
            
            let base_value = features.comparable_avg;
            let location_adjustment = (features.location_score as u128 * base_value) / 1000000;
            let size_adjustment = features.size_sqm as u128 * 1000;
            let condition_adjustment = (features.condition_score as u128 * base_value) / 10000;
            let market_adjustment = if features.market_trend >= 0 {
                (features.market_trend as u128 * base_value) / 10000
            } else {
                base_value - ((-features.market_trend) as u128 * base_value) / 10000
            };

            let predicted_value = base_value + location_adjustment + size_adjustment + condition_adjustment + market_adjustment;
            
            // Calculate confidence based on model accuracy and feature quality
            let feature_quality = (features.location_score + features.condition_score + features.amenities_score + features.economic_indicators) / 4;
            let confidence_score = core::cmp::min((model.accuracy_score * feature_quality) / 100, 10000);
            
            // Calculate uncertainty range (±10% for simplicity)
            let uncertainty = predicted_value / 10;
            let uncertainty_range = (predicted_value - uncertainty, predicted_value + uncertainty);
            
            // Simple bias and fairness scoring
            let bias_score = if features.location_score > 800 { 1500 } else { 500 }; // Higher bias for premium locations
            let fairness_score = 10000 - bias_score; // Inverse of bias

            Ok(AIPrediction {
                predicted_value,
                confidence_score,
                uncertainty_range,
                model_id: model.model_id.clone(),
                features_used: features.clone(),
                bias_score,
                fairness_score,
            })
        }

        /// Average individual model confidence values into an ensemble confidence score.
        fn calculate_ensemble_confidence(&self, predictions: &[AIPrediction]) -> u32 {
            if predictions.is_empty() {
                return 0;
            }
            
            // Average confidence weighted by individual confidence scores
            let total_confidence: u32 = predictions.iter().map(|p| p.confidence_score).sum();
            total_confidence / predictions.len() as u32
        }

        /// Measure how closely model predictions agree around their mean valuation.
        fn calculate_consensus_score(&self, predictions: &[AIPrediction]) -> u32 {
            if predictions.len() < 2 {
                return 10000; // Perfect consensus with single prediction
            }

            let values: Vec<u128> = predictions.iter().map(|p| p.predicted_value).collect();
            let mean = values.iter().sum::<u128>() / values.len() as u128;
            
            // Calculate coefficient of variation
            let variance = values.iter()
                .map(|&v| {
                    let diff = if v > mean { v - mean } else { mean - v };
                    (diff * diff) / mean
                })
                .sum::<u128>() / values.len() as u128;
            
            let cv = if mean > 0 {
                (variance * 10000) / mean
            } else {
                10000
            };
            
            // Convert to consensus score (lower CV = higher consensus)
            if cv > 10000 {
                0
            } else {
                10000 - cv as u32
            }
        }

        /// Build a short plain-language explanation for an ensemble valuation result.
        fn generate_explanation(&self, predictions: &[AIPrediction], final_value: u128) -> String {
            if predictions.is_empty() {
                return "No predictions available".to_string();
            }

            let model_count = predictions.len();
            let avg_confidence = predictions.iter().map(|p| p.confidence_score).sum::<u32>() / model_count as u32;
            
            format!(
                "Ensemble valuation of ${} based on {} models with {}% average confidence. Key factors: location quality, property size, market conditions, and comparable sales data.",
                final_value,
                model_count,
                avg_confidence / 100
            )
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn test_new_ai_valuation_engine() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let engine = AIValuationEngine::new(accounts.alice);
            
            assert_eq!(engine.admin(), accounts.alice);
            assert_eq!(engine.get_training_data_count(), 0);
        }

        #[ink::test]
        fn test_register_model() {
            let accounts = ink::env::test::default_accounts::<ink::env::DefaultEnvironment>();
            let mut engine = AIValuationEngine::new(accounts.alice);
            
            let model = AIModel {
                model_id: "test_model".to_string(),
                model_type: AIModelType::LinearRegression,
                version: 1,
                accuracy_score: 8500,
                training_data_size: 1000,
                last_updated: 1234567890,
                is_active: true,
                weight: 100,
            };
            
            assert!(engine.register_model(model.clone()).is_ok());
            assert_eq!(engine.get_model("test_model".to_string()), Some(model));
        }
    }
}
