# AI-Powered Property Valuation System

## Overview

The AI-powered property valuation system provides accurate, real-time property assessments using machine learning models trained on multiple data sources. The system integrates seamlessly with the existing PropChain oracle infrastructure while providing advanced features like bias detection, fairness checks, and model versioning.

## Architecture

### Core Components

1. **AI Valuation Engine Contract** (`contracts/ai-valuation/`)
   - Main contract implementing AI-powered valuations
   - Implements the Oracle trait for seamless integration
   - Manages model lifecycle and predictions

2. **ML Pipeline Infrastructure** (`contracts/ai-valuation/src/ml_pipeline.rs`)
   - Model training and validation pipelines
   - A/B testing framework
   - Data drift detection
   - Model versioning and deployment

3. **Oracle Integration** (`contracts/oracle/`)
   - Extended to support AI model sources
   - Weighted aggregation with traditional oracles
   - Confidence scoring and anomaly detection

### Key Features

#### 1. Multi-Model Ensemble Predictions
- Support for multiple AI model types (Linear Regression, Random Forest, Neural Networks, Gradient Boosting)
- Weighted ensemble predictions for improved accuracy
- Consensus scoring to measure model agreement

#### 2. Feature Extraction System
- Automated feature extraction from property metadata
- Location scoring and market trend analysis
- Comparable property analysis
- Economic indicator integration

#### 3. Bias Detection and Fairness
- Geographic bias detection
- Property type bias analysis
- Price range bias checks
- Fairness constraint enforcement

#### 4. Model Versioning and Lifecycle Management
- Semantic versioning for models
- Performance tracking across versions
- Automated rollback conditions
- Deployment status management

#### 5. Real-time Monitoring and Alerting
- Performance monitoring
- Data drift detection
- Concept drift analysis
- Configurable alert thresholds

## Data Structures

### PropertyFeatures
```rust
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
```

### AIPrediction
```rust
pub struct AIPrediction {
    pub predicted_value: u128,
    pub confidence_score: u32,    // 0-100
    pub uncertainty_range: (u128, u128), // (min, max) prediction interval
    pub model_id: String,
    pub features_used: PropertyFeatures,
    pub bias_score: u32,         // 0-100, lower is better
    pub fairness_score: u32,     // 0-100, higher is better
}
```

### EnsemblePrediction
```rust
pub struct EnsemblePrediction {
    pub final_valuation: u128,
    pub ensemble_confidence: u32,
    pub individual_predictions: Vec<AIPrediction>,
    pub consensus_score: u32,    // 0-100, agreement between models
    pub explanation: String,     // Human-readable explanation
}
```

## Integration with Existing Oracle System

The AI valuation system integrates with the existing oracle infrastructure through:

1. **Oracle Trait Implementation**: The AI Valuation Engine implements the `Oracle` trait, making it compatible with existing oracle consumers.

2. **New Oracle Source Type**: Added `AIModel` to `OracleSourceType` enum for AI-powered sources.

3. **Valuation Method Extension**: Added `AIValuation` to `ValuationMethod` enum to distinguish AI predictions.

4. **Weighted Aggregation**: AI predictions are aggregated with traditional oracle sources using configurable weights.

## Usage Examples

### 1. Register an AI Model
```rust
let model = AIModel {
    model_id: "neural_net_v1".to_string(),
    model_type: AIModelType::NeuralNetwork,
    version: 1,
    accuracy_score: 8500, // 85%
    training_data_size: 10000,
    last_updated: timestamp,
    is_active: true,
    weight: 80, // 80% weight in ensemble
};

ai_engine.register_model(model)?;
```

### 2. Generate Property Valuation
```rust
// Single model prediction
let prediction = ai_engine.predict_valuation(property_id, "neural_net_v1".to_string())?;

// Ensemble prediction (recommended)
let ensemble = ai_engine.ensemble_predict(property_id)?;
```

### 3. Add Training Data
```rust
let training_point = TrainingDataPoint {
    property_id: 123,
    features: extracted_features,
    actual_value: 750000,
    timestamp: current_time,
    data_source: "market_sale".to_string(),
};

ai_engine.add_training_data(training_point)?;
```

### 4. Detect Data Drift
```rust
let drift_result = ai_engine.detect_data_drift(
    "neural_net_v1".to_string(),
    DriftDetectionMethod::KolmogorovSmirnov
)?;

if drift_result.drift_detected {
    // Handle drift based on recommendation
    match drift_result.recommendation {
        DriftRecommendation::RetrainModel => {
            // Trigger model retraining
        },
        DriftRecommendation::MonitorClosely => {
            // Increase monitoring frequency
        },
        _ => {}
    }
}
```

## ML Pipeline Configuration

### Training Configuration
```rust
let training_config = TrainingConfig {
    learning_rate: 100,        // 0.01
    batch_size: 32,
    epochs: 100,
    validation_split: 2000,    // 20%
    early_stopping: true,
    regularization: RegularizationType::L2,
    feature_selection: FeatureSelectionMethod::Correlation,
};
```

### Validation Configuration
```rust
let validation_config = ValidationConfig {
    cross_validation_folds: 5,
    test_split: 2000,          // 20%
    metrics: vec![
        ValidationMetric::MeanAbsoluteError,
        ValidationMetric::RSquared,
    ],
    bias_tests: vec![
        BiasTest::GeographicBias,
        BiasTest::PropertyTypeBias,
    ],
    fairness_constraints: vec![
        FairnessConstraint {
            constraint_type: FairnessType::DemographicParity,
            protected_attribute: "location".to_string(),
            threshold: 500, // 5%
            enforcement_level: EnforcementLevel::Block,
        }
    ],
};
```

## Security and Compliance

### Access Control
- Admin-only model registration and updates
- Pause/resume functionality for emergency stops
- Role-based access for different operations

### Bias Detection
- Automated bias scoring for all predictions
- Configurable bias thresholds
- Fairness constraint enforcement
- Geographic and demographic bias checks

### Model Governance
- Version control for all models
- Performance tracking and comparison
- Automated rollback conditions
- Audit trails for all model changes

## Performance Considerations

### Caching
- Feature extraction results are cached with TTL
- Prediction history stored for validation
- Comparable property data cached

### Optimization
- Batch prediction support
- Efficient storage using ink! Mapping
- Lazy evaluation where appropriate

### Monitoring
- Real-time performance metrics
- Alert system for degraded performance
- Resource usage tracking

## Future Enhancements

1. **Advanced ML Models**
   - Deep learning models
   - Transformer architectures
   - Federated learning support

2. **Enhanced Feature Engineering**
   - Automated feature discovery
   - Time-series features
   - External data integration

3. **Improved Bias Detection**
   - Causal inference methods
   - Counterfactual fairness
   - Intersectional bias analysis

4. **Real-time Learning**
   - Online learning algorithms
   - Continuous model updates
   - Adaptive ensemble weights

## Testing

The system includes comprehensive tests covering:
- Model registration and updates
- Prediction generation and validation
- Bias detection and fairness checks
- ML pipeline management
- Integration with oracle system

Run tests with:
```bash
cargo test --package ai-valuation
```

## Deployment

1. Deploy the AI Valuation Engine contract
2. Register the contract as an oracle source in the main oracle
3. Configure model weights and thresholds
4. Set up monitoring and alerting
5. Begin with A/B testing before full deployment