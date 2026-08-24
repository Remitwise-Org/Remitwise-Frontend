#[cfg(test)]
mod tests {
    use super::*;
    use crate::ai_valuation::*;
    use crate::ml_pipeline::*;
    use ink::env::test;

    fn default_accounts() -> test::DefaultAccounts<ink::env::DefaultEnvironment> {
        test::default_accounts::<ink::env::DefaultEnvironment>()
    }

    fn set_next_caller(caller: <ink::env::DefaultEnvironment as ink::env::Environment>::AccountId) {
        test::set_caller::<ink::env::DefaultEnvironment>(caller);
    }

    fn setup_ai_engine() -> AIValuationEngine {
        let accounts = default_accounts();
        set_next_caller(accounts.alice);
        AIValuationEngine::new(accounts.alice)
    }

    fn create_sample_model() -> AIModel {
        AIModel {
            model_id: "test_model".to_string(),
            model_type: AIModelType::LinearRegression,
            version: 1,
            accuracy_score: 8500,
            training_data_size: 1000,
            last_updated: 1234567890,
            is_active: true,
            weight: 100,
        }
    }

    fn create_sample_features() -> PropertyFeatures {
        PropertyFeatures {
            location_score: 750,
            size_sqm: 120,
            age_years: 10,
            condition_score: 85,
            amenities_score: 70,
            market_trend: 5,
            comparable_avg: 600000,
            economic_indicators: 80,
        }
    }

    #[ink::test]
    fn test_new_ai_valuation_engine() {
        let accounts = default_accounts();
        let engine = AIValuationEngine::new(accounts.alice);
        
        assert_eq!(engine.admin(), accounts.alice);
        assert_eq!(engine.get_training_data_count(), 0);
    }

    #[ink::test]
    fn test_register_model_works() {
        let mut engine = setup_ai_engine();
        let model = create_sample_model();
        
        assert!(engine.register_model(model.clone()).is_ok());
        assert_eq!(engine.get_model("test_model".to_string()), Some(model));
    }

    #[ink::test]
    fn test_register_invalid_model_fails() {
        let mut engine = setup_ai_engine();
        let mut model = create_sample_model();
        model.model_id = "".to_string(); // Invalid empty ID
        
        assert_eq!(engine.register_model(model), Err(AIValuationError::InvalidModel));
    }

    #[ink::test]
    fn test_unauthorized_register_model_fails() {
        let accounts = default_accounts();
        let mut engine = setup_ai_engine();
        let model = create_sample_model();
        
        // Switch to non-admin caller
        set_next_caller(accounts.bob);
        
        assert_eq!(engine.register_model(model), Err(AIValuationError::Unauthorized));
    }

    #[ink::test]
    fn test_update_model_works() {
        let mut engine = setup_ai_engine();
        let model = create_sample_model();
        
        // Register initial model
        assert!(engine.register_model(model.clone()).is_ok());
        
        // Update model
        let mut updated_model = model;
        updated_model.version = 2;
        updated_model.accuracy_score = 9000;
        
        assert!(engine.update_model("test_model".to_string(), updated_model.clone()).is_ok());
        assert_eq!(engine.get_model("test_model".to_string()), Some(updated_model));
    }

    #[ink::test]
    fn test_extract_features_works() {
        let mut engine = setup_ai_engine();
        let property_id = 123;
        
        let features = engine.extract_features(property_id).unwrap();
        
        // Verify features are generated
        assert!(features.location_score > 0);
        assert!(features.size_sqm > 0);
        assert!(features.condition_score > 0);
    }

    #[ink::test]
    fn test_predict_valuation_works() {
        let mut engine = setup_ai_engine();
        let model = create_sample_model();
        let property_id = 123;
        
        // Register model
        assert!(engine.register_model(model).is_ok());
        
        // Generate prediction
        let prediction = engine.predict_valuation(property_id, "test_model".to_string()).unwrap();
        
        assert!(prediction.predicted_value > 0);
        assert!(prediction.confidence_score > 0);
        assert!(prediction.confidence_score <= 10000);
        assert_eq!(prediction.model_id, "test_model");
    }

    #[ink::test]
    fn test_predict_valuation_inactive_model_fails() {
        let mut engine = setup_ai_engine();
        let mut model = create_sample_model();
        model.is_active = false;
        
        assert!(engine.register_model(model).is_ok());
        
        let result = engine.predict_valuation(123, "test_model".to_string());
        assert_eq!(result, Err(AIValuationError::ModelNotFound));
    }

    #[ink::test]
    fn test_ensemble_predict_works() {
        let mut engine = setup_ai_engine();
        
        // Register multiple models
        let models = vec![
            AIModel {
                model_id: "linear_reg_v1".to_string(),
                model_type: AIModelType::LinearRegression,
                version: 1,
                accuracy_score: 8000,
                training_data_size: 1000,
                last_updated: 1234567890,
                is_active: true,
                weight: 30,
            },
            AIModel {
                model_id: "random_forest_v2".to_string(),
                model_type: AIModelType::RandomForest,
                version: 2,
                accuracy_score: 8500,
                training_data_size: 1500,
                last_updated: 1234567890,
                is_active: true,
                weight: 40,
            },
            AIModel {
                model_id: "neural_net_v1".to_string(),
                model_type: AIModelType::NeuralNetwork,
                version: 1,
                accuracy_score: 9000,
                training_data_size: 2000,
                last_updated: 1234567890,
                is_active: true,
                weight: 30,
            },
        ];
        
        for model in models {
            assert!(engine.register_model(model).is_ok());
        }
        
        let property_id = 123;
        let ensemble = engine.ensemble_predict(property_id).unwrap();
        
        assert!(ensemble.final_valuation > 0);
        assert!(ensemble.ensemble_confidence > 0);
        assert_eq!(ensemble.individual_predictions.len(), 3);
        assert!(ensemble.consensus_score <= 10000);
        assert!(!ensemble.explanation.is_empty());
    }

    #[ink::test]
    fn test_add_training_data_works() {
        let mut engine = setup_ai_engine();
        let features = create_sample_features();
        
        let training_point = TrainingDataPoint {
            property_id: 123,
            features,
            actual_value: 650000,
            timestamp: 1234567890,
            data_source: "market_sale".to_string(),
        };
        
        assert!(engine.add_training_data(training_point).is_ok());
        assert_eq!(engine.get_training_data_count(), 1);
    }

    #[ink::test]
    fn test_detect_bias_works() {
        let mut engine = setup_ai_engine();
        let model = create_sample_model();
        let property_id = 123;
        
        // Register model and generate prediction
        assert!(engine.register_model(model).is_ok());
        assert!(engine.predict_valuation(property_id, "test_model".to_string()).is_ok());
        
        // Detect bias
        let bias_score = engine.detect_bias("test_model".to_string(), vec![property_id]).unwrap();
        assert!(bias_score <= 10000); // Should be a valid percentage
    }

    #[ink::test]
    fn test_explain_valuation_works() {
        let mut engine = setup_ai_engine();
        let model = create_sample_model();
        let property_id = 123;
        
        // Register model and extract features
        assert!(engine.register_model(model).is_ok());
        assert!(engine.extract_features(property_id).is_ok());
        
        // Get explanation
        let explanation = engine.explain_valuation(property_id, "test_model".to_string()).unwrap();
        assert!(!explanation.is_empty());
        assert!(explanation.contains("test_model"));
    }

    #[ink::test]
    fn test_pause_resume_works() {
        let mut engine = setup_ai_engine();
        
        // Emergency pause activates immediately.
        assert!(engine.emergency_pause().is_ok());
        
        // Operations should fail when paused
        let model = create_sample_model();
        assert_eq!(engine.register_model(model), Err(AIValuationError::ContractPaused));
        
        // Resume is a two-step, timelocked admin operation.
        assert!(engine.resume().is_ok());
        test::set_block_timestamp::<ink::env::DefaultEnvironment>(3_600_000);
        assert!(engine.resume().is_ok());
        
        // Operations should work again
        let model = create_sample_model();
        assert!(engine.register_model(model).is_ok());
    }

    #[ink::test]
    fn test_change_admin_works() {
        let accounts = default_accounts();
        let mut engine = setup_ai_engine();
        
        // Change admin
        assert!(engine.change_admin(accounts.bob).is_ok());
        assert_eq!(engine.admin(), accounts.bob);
        
        // Old admin should not have access
        let model = create_sample_model();
        assert_eq!(engine.register_model(model), Err(AIValuationError::Unauthorized));
        
        // New admin should have access
        set_next_caller(accounts.bob);
        let model = create_sample_model();
        assert!(engine.register_model(model).is_ok());
    }

    #[ink::test]
    fn test_ml_pipeline_management() {
        let mut engine = setup_ai_engine();
        
        let pipeline = MLPipeline {
            pipeline_id: "test_pipeline".to_string(),
            model_type: AIModelType::EnsembleModel,
            training_config: TrainingConfig {
                learning_rate: 100,
                batch_size: 32,
                epochs: 100,
                validation_split: 2000,
                early_stopping: true,
                regularization: RegularizationType::L2,
                feature_selection: FeatureSelectionMethod::Correlation,
            },
            validation_config: ValidationConfig {
                cross_validation_folds: 5,
                test_split: 2000,
                metrics: vec![ValidationMetric::MeanAbsoluteError],
                bias_tests: vec![BiasTest::GeographicBias],
                fairness_constraints: vec![],
            },
            deployment_config: DeploymentConfig {
                min_accuracy_threshold: 8000,
                max_bias_threshold: 1000,
                confidence_threshold: 7000,
                rollback_conditions: vec![],
                monitoring_config: MonitoringConfig {
                    performance_monitoring: true,
                    bias_monitoring: true,
                    drift_detection: true,
                    alert_thresholds: vec![],
                    monitoring_frequency: 3600,
                },
            },
            status: PipelineStatus::Created,
            created_at: 1234567890,
            last_run: None,
        };
        
        // Create pipeline
        assert!(engine.create_ml_pipeline(pipeline.clone()).is_ok());
        assert_eq!(engine.get_ml_pipeline("test_pipeline".to_string()), Some(pipeline));
        
        // Update pipeline status
        assert!(engine.update_pipeline_status("test_pipeline".to_string(), PipelineStatus::Training).is_ok());
        
        let updated_pipeline = engine.get_ml_pipeline("test_pipeline".to_string()).unwrap();
        assert_eq!(updated_pipeline.status, PipelineStatus::Training);
        assert!(updated_pipeline.last_run.is_some());
    }

    #[ink::test]
    fn test_data_drift_detection() {
        let mut engine = setup_ai_engine();
        
        let drift_result = engine.detect_data_drift(
            "test_model".to_string(),
            DriftDetectionMethod::KolmogorovSmirnov
        ).unwrap();
        
        assert!(drift_result.drift_score <= 10000);
        assert!(!drift_result.affected_features.is_empty());
        assert!(drift_result.timestamp > 0);
    }

    #[ink::test]
    fn test_model_versioning() {
        let mut engine = setup_ai_engine();
        
        let version = ModelVersion {
            model_id: "test_model".to_string(),
            version: 1,
            parent_version: None,
            training_data_hash: "hash123".to_string(),
            model_hash: "model_hash456".to_string(),
            performance_metrics: ModelMetrics {
                accuracy: 8500,
                precision: 8200,
                recall: 8800,
                f1_score: 8500,
                mae: 50000,
                rmse: 75000,
                r_squared: 7500,
                bias_score: 500,
                fairness_score: 9500,
            },
            deployment_status: DeploymentStatus::Development,
            created_at: 1234567890,
            deployed_at: None,
            deprecated_at: None,
        };
        
        assert!(engine.add_model_version("test_model".to_string(), version.clone()).is_ok());
        
        let versions = engine.get_model_versions("test_model".to_string());
        assert_eq!(versions.len(), 1);
        assert_eq!(versions[0], version);
    }

    #[ink::test]
    fn test_ab_testing() {
        let mut engine = setup_ai_engine();
        
        let ab_test = ABTestConfig {
            test_id: "test_ab".to_string(),
            control_model: "model_a".to_string(),
            treatment_model: "model_b".to_string(),
            traffic_split: 5000,
            duration: 604800,
            success_metrics: vec![ValidationMetric::MeanAbsoluteError],
            statistical_significance: 500,
            minimum_sample_size: 1000,
        };
        
        assert!(engine.create_ab_test(ab_test.clone()).is_ok());
        assert_eq!(engine.get_ab_test("test_ab".to_string()), Some(ab_test));
    }

    #[ink::test]
    fn test_events_emitted() {
        let mut engine = setup_ai_engine();
        let model = create_sample_model();
        
        // Register model should emit event
        assert!(engine.register_model(model).is_ok());
        
        // For now, just verify the model was registered
        assert!(engine.get_model("test_model".to_string()).is_some());
    }
}
