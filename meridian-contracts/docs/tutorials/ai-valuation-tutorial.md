# AI Valuation System Tutorial

This tutorial walks you through setting up and using the AI-powered property valuation system in PropChain.

## Prerequisites

- PropChain contracts deployed
- Oracle system configured
- Property registry with sample properties
- Admin access to contracts

## Step 1: Deploy AI Valuation Engine

First, deploy the AI Valuation Engine contract:

```bash
# Build the contract
cargo contract build --manifest-path contracts/ai-valuation/Cargo.toml

# Deploy to your substrate node
cargo contract instantiate \
  --constructor new \
  --args "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY" \
  --suri //Alice \
  --url ws://localhost:9944
```

## Step 2: Configure Oracle Integration

Connect the AI valuation engine to the main oracle system:

```rust
// Set AI valuation contract in oracle
oracle.set_ai_valuation_contract(ai_valuation_address)?;

// Add AI model as oracle source
let ai_source = OracleSource {
    id: "ai_ensemble_v1".to_string(),
    source_type: OracleSourceType::AIModel,
    address: ai_valuation_address,
    is_active: true,
    weight: 70, // 70% weight in aggregation
    last_updated: current_timestamp,
};

oracle.add_oracle_source(ai_source)?;
```

## Step 3: Register AI Models

Register your trained AI models:

```rust
// Linear regression model
let linear_model = AIModel {
    model_id: "linear_reg_v1".to_string(),
    model_type: AIModelType::LinearRegression,
    version: 1,
    accuracy_score: 7500, // 75%
    training_data_size: 5000,
    last_updated: current_timestamp,
    is_active: true,
    weight: 30,
};

ai_engine.register_model(linear_model)?;

// Random forest model
let rf_model = AIModel {
    model_id: "random_forest_v2".to_string(),
    model_type: AIModelType::RandomForest,
    version: 2,
    accuracy_score: 8200, // 82%
    training_data_size: 8000,
    last_updated: current_timestamp,
    is_active: true,
    weight: 40,
};

ai_engine.register_model(rf_model)?;

// Neural network model
let nn_model = AIModel {
    model_id: "neural_net_v1".to_string(),
    model_type: AIModelType::NeuralNetwork,
    version: 1,
    accuracy_score: 8800, // 88%
    training_data_size: 12000,
    last_updated: current_timestamp,
    is_active: true,
    weight: 30,
};

ai_engine.register_model(nn_model)?;
```

## Step 4: Add Training Data

Populate the system with historical training data:

```rust
// Example training data points
let training_data = vec![
    TrainingDataPoint {
        property_id: 1,
        features: PropertyFeatures {
            location_score: 850,
            size_sqm: 120,
            age_years: 5,
            condition_score: 90,
            amenities_score: 80,
            market_trend: 15,
            comparable_avg: 650000,
            economic_indicators: 75,
        },
        actual_value: 680000,
        timestamp: timestamp1,
        data_source: "market_sale".to_string(),
    },
    TrainingDataPoint {
        property_id: 2,
        features: PropertyFeatures {
            location_score: 600,
            size_sqm: 80,
            age_years: 15,
            condition_score: 70,
            amenities_score: 60,
            market_trend: -5,
            comparable_avg: 450000,
            economic_indicators: 65,
        },
        actual_value: 420000,
        timestamp: timestamp2,
        data_source: "appraisal".to_string(),
    },
];

for data_point in training_data {
    ai_engine.add_training_data(data_point)?;
}
```

## Step 5: Generate Property Valuations

### Single Model Prediction

```rust
// Get prediction from specific model
let property_id = 123;
let prediction = ai_engine.predict_valuation(
    property_id, 
    "neural_net_v1".to_string()
)?;

println!("Predicted value: ${}", prediction.predicted_value);
println!("Confidence: {}%", prediction.confidence_score / 100);
println!("Uncertainty range: ${} - ${}", 
    prediction.uncertainty_range.0, 
    prediction.uncertainty_range.1
);
```

### Ensemble Prediction (Recommended)

```rust
// Get ensemble prediction from all active models
let ensemble = ai_engine.ensemble_predict(property_id)?;

println!("Final valuation: ${}", ensemble.final_valuation);
println!("Ensemble confidence: {}%", ensemble.ensemble_confidence / 100);
println!("Consensus score: {}%", ensemble.consensus_score / 100);
println!("Explanation: {}", ensemble.explanation);

// Review individual model predictions
for prediction in ensemble.individual_predictions {
    println!("Model {}: ${} ({}% confidence)", 
        prediction.model_id,
        prediction.predicted_value,
        prediction.confidence_score / 100
    );
}
```

## Step 6: Set Up ML Pipeline

Create an ML pipeline for automated model training:

```rust
let pipeline = MLPipeline {
    pipeline_id: "property_valuation_pipeline_v1".to_string(),
    model_type: AIModelType::EnsembleModel,
    training_config: TrainingConfig {
        learning_rate: 100,        // 0.01
        batch_size: 64,
        epochs: 200,
        validation_split: 2000,    // 20%
        early_stopping: true,
        regularization: RegularizationType::L2,
        feature_selection: FeatureSelectionMethod::Correlation,
    },
    validation_config: ValidationConfig {
        cross_validation_folds: 5,
        test_split: 2000,
        metrics: vec![
            ValidationMetric::MeanAbsoluteError,
            ValidationMetric::RSquared,
            ValidationMetric::MeanAbsolutePercentageError,
        ],
        bias_tests: vec![
            BiasTest::GeographicBias,
            BiasTest::PropertyTypeBias,
            BiasTest::PriceBias,
        ],
        fairness_constraints: vec![
            FairnessConstraint {
                constraint_type: FairnessType::DemographicParity,
                protected_attribute: "location".to_string(),
                threshold: 500, // 5%
                enforcement_level: EnforcementLevel::Warning,
            }
        ],
    },
    deployment_config: DeploymentConfig {
        min_accuracy_threshold: 8000, // 80%
        max_bias_threshold: 1000,     // 10%
        confidence_threshold: 7000,   // 70%
        rollback_conditions: vec![
            RollbackCondition {
                condition_type: RollbackType::AccuracyDrop,
                threshold: 500, // 5% drop
                time_window: 86400, // 24 hours
                action: RollbackAction::Alert,
            }
        ],
        monitoring_config: MonitoringConfig {
            performance_monitoring: true,
            bias_monitoring: true,
            drift_detection: true,
            alert_thresholds: vec![
                AlertThreshold {
                    metric: MonitoringMetric::Accuracy,
                    threshold: 7500, // 75%
                    severity: AlertSeverity::Warning,
                }
            ],
            monitoring_frequency: 3600, // 1 hour
        },
    },
    status: PipelineStatus::Created,
    created_at: current_timestamp,
    last_run: None,
};

ai_engine.create_ml_pipeline(pipeline)?;
```

## Step 7: Monitor Model Performance

### Check Model Performance

```rust
let performance = ai_engine.get_model_performance("neural_net_v1".to_string());
if let Some(perf) = performance {
    println!("MAE: {}", perf.mae);
    println!("RMSE: {}", perf.rmse);
    println!("R-squared: {}", perf.r_squared as f64 / 10000.0);
    println!("Predictions made: {}", perf.prediction_count);
}
```

### Detect Data Drift

```rust
let drift_result = ai_engine.detect_data_drift(
    "neural_net_v1".to_string(),
    DriftDetectionMethod::KolmogorovSmirnov
)?;

if drift_result.drift_detected {
    println!("Data drift detected! Score: {}", drift_result.drift_score);
    println!("Affected features: {:?}", drift_result.affected_features);
    
    match drift_result.recommendation {
        DriftRecommendation::RetrainModel => {
            println!("Recommendation: Retrain the model");
            // Trigger retraining pipeline
        },
        DriftRecommendation::MonitorClosely => {
            println!("Recommendation: Monitor closely");
            // Increase monitoring frequency
        },
        _ => {}
    }
}
```

## Step 8: A/B Testing

Set up A/B testing to compare model performance:

```rust
let ab_test = ABTestConfig {
    test_id: "neural_net_vs_ensemble".to_string(),
    control_model: "neural_net_v1".to_string(),
    treatment_model: "ensemble_v2".to_string(),
    traffic_split: 5000, // 50% traffic to treatment
    duration: 604800,    // 1 week
    success_metrics: vec![
        ValidationMetric::MeanAbsoluteError,
        ValidationMetric::RSquared,
    ],
    statistical_significance: 500, // p-value < 0.05
    minimum_sample_size: 1000,
};

ai_engine.create_ab_test(ab_test)?;
```

## Step 9: Bias Detection and Fairness

### Check for Bias

```rust
let property_ids = vec![1, 2, 3, 4, 5]; // Sample properties
let bias_score = ai_engine.detect_bias(
    "neural_net_v1".to_string(),
    property_ids
)?;

if bias_score > 2000 { // > 20% bias
    println!("High bias detected: {}%", bias_score / 100);
    // Take corrective action
}
```

### Get Valuation Explanation

```rust
let explanation = ai_engine.explain_valuation(
    property_id,
    "neural_net_v1".to_string()
)?;

println!("Valuation explanation: {}", explanation);
```

## Step 10: Integration with Property Registry

Update property valuations using AI predictions:

```rust
// Property registry calls oracle for valuation update
property_registry.update_valuation_from_oracle(property_id)?;

// Oracle aggregates AI prediction with other sources
let valuation = oracle.get_valuation_with_confidence(property_id)?;

println!("Final aggregated valuation: ${}", valuation.base_valuation.valuation);
println!("Confidence interval: ${} - ${}", 
    valuation.confidence_interval.0,
    valuation.confidence_interval.1
);
```

## Best Practices

### 1. Model Management
- Start with simple models and gradually add complexity
- Use ensemble methods for better accuracy and robustness
- Regularly retrain models with new data
- Monitor model performance continuously

### 2. Bias Prevention
- Use diverse training data
- Implement fairness constraints
- Regular bias audits
- Transparent explanation systems

### 3. Data Quality
- Validate input data quality
- Handle missing values appropriately
- Detect and handle outliers
- Monitor for data drift

### 4. Performance Optimization
- Cache frequently accessed features
- Use batch predictions when possible
- Optimize model weights based on performance
- Implement efficient storage patterns

### 5. Security
- Restrict admin access to model updates
- Implement pause mechanisms for emergencies
- Audit all model changes
- Validate all inputs

## Troubleshooting

### Common Issues

1. **Low Confidence Predictions**
   - Check training data quality
   - Verify feature extraction
   - Adjust confidence thresholds
   - Retrain with more data

2. **High Bias Scores**
   - Review training data distribution
   - Implement fairness constraints
   - Use bias mitigation techniques
   - Regular bias audits

3. **Data Drift Detected**
   - Analyze affected features
   - Update feature engineering
   - Retrain models with recent data
   - Adjust model weights

4. **Poor Model Performance**
   - Increase training data size
   - Improve feature engineering
   - Try different model types
   - Tune hyperparameters

## Next Steps

1. Implement advanced ML models (deep learning, transformers)
2. Add real-time learning capabilities
3. Integrate external data sources
4. Develop automated feature engineering
5. Implement federated learning for privacy

This tutorial provides a comprehensive guide to using the AI valuation system. For more advanced usage and customization, refer to the full documentation and API reference.