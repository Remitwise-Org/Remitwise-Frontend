use ink::prelude::vec::Vec;
use ink::prelude::string::String;
use scale::{Encode, Decode};

/// ML Pipeline for training and managing AI models
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct MLPipeline {
    pub pipeline_id: String,
    pub model_type: crate::ai_valuation::AIModelType,
    pub training_config: TrainingConfig,
    pub validation_config: ValidationConfig,
    pub deployment_config: DeploymentConfig,
    pub status: PipelineStatus,
    pub created_at: u64,
    pub last_run: Option<u64>,
}

/// Training configuration for ML models
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct TrainingConfig {
    pub learning_rate: u32,        // Learning rate * 10000 (e.g., 100 = 0.01)
    pub batch_size: u32,
    pub epochs: u32,
    pub validation_split: u32,     // Percentage * 100 (e.g., 2000 = 20%)
    pub early_stopping: bool,
    pub regularization: RegularizationType,
    pub feature_selection: FeatureSelectionMethod,
}

/// Validation configuration
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ValidationConfig {
    pub cross_validation_folds: u32,
    pub test_split: u32,           // Percentage * 100
    pub metrics: Vec<ValidationMetric>,
    pub bias_tests: Vec<BiasTest>,
    pub fairness_constraints: Vec<FairnessConstraint>,
}

/// Deployment configuration
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct DeploymentConfig {
    pub min_accuracy_threshold: u32,    // Percentage * 100
    pub max_bias_threshold: u32,        // Percentage * 100
    pub confidence_threshold: u32,      // Percentage * 100
    pub rollback_conditions: Vec<RollbackCondition>,
    pub monitoring_config: MonitoringConfig,
}

/// Pipeline execution status
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum PipelineStatus {
    Created,
    Training,
    Validating,
    Testing,
    Deploying,
    Active,
    Failed,
    Deprecated,
}

/// Regularization techniques
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum RegularizationType {
    None,
    L1,
    L2,
    ElasticNet,
    Dropout,
}

/// Feature selection methods
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum FeatureSelectionMethod {
    All,
    Correlation,
    MutualInformation,
    RecursiveElimination,
    LassoRegularization,
}
/// Validation metrics for model evaluation
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum ValidationMetric {
    MeanAbsoluteError,
    RootMeanSquareError,
    MeanAbsolutePercentageError,
    RSquared,
    AdjustedRSquared,
    MedianAbsoluteError,
}

/// Bias detection tests
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum BiasTest {
    GeographicBias,      // Check for location-based bias
    PropertyTypeBias,    // Check for property type bias
    PriceBias,          // Check for price range bias
    TemporalBias,       // Check for time-based bias
    OwnershipBias,      // Check for ownership pattern bias
}

/// Fairness constraints
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct FairnessConstraint {
    pub constraint_type: FairnessType,
    pub protected_attribute: String,
    pub threshold: u32,              // Percentage * 100
    pub enforcement_level: EnforcementLevel,
}

/// Types of fairness constraints
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum FairnessType {
    DemographicParity,
    EqualizedOdds,
    CalibrationParity,
    IndividualFairness,
}

/// Enforcement levels for fairness constraints
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum EnforcementLevel {
    Warning,
    Block,
    Adjust,
}

/// Rollback conditions for model deployment
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct RollbackCondition {
    pub condition_type: RollbackType,
    pub threshold: u32,
    pub time_window: u64,           // Seconds
    pub action: RollbackAction,
}

/// Types of rollback conditions
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum RollbackType {
    AccuracyDrop,
    BiasIncrease,
    ConfidenceDrop,
    ErrorRateIncrease,
    PredictionVolatility,
}

/// Rollback actions
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum RollbackAction {
    Alert,
    Pause,
    Rollback,
    Retrain,
}

/// Monitoring configuration
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct MonitoringConfig {
    pub performance_monitoring: bool,
    pub bias_monitoring: bool,
    pub drift_detection: bool,
    pub alert_thresholds: Vec<AlertThreshold>,
    pub monitoring_frequency: u64,  // Seconds
}

/// Alert thresholds for monitoring
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct AlertThreshold {
    pub metric: MonitoringMetric,
    pub threshold: u32,
    pub severity: AlertSeverity,
}

/// Monitoring metrics
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum MonitoringMetric {
    Accuracy,
    Bias,
    Confidence,
    PredictionLatency,
    DataDrift,
    ConceptDrift,
}

/// Alert severity levels
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
    Emergency,
}
/// Model versioning and lifecycle management
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ModelVersion {
    pub model_id: String,
    pub version: u32,
    pub parent_version: Option<u32>,
    pub training_data_hash: String,
    pub model_hash: String,
    pub performance_metrics: ModelMetrics,
    pub deployment_status: DeploymentStatus,
    pub created_at: u64,
    pub deployed_at: Option<u64>,
    pub deprecated_at: Option<u64>,
}

/// Model performance metrics
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ModelMetrics {
    pub accuracy: u32,              // Percentage * 100
    pub precision: u32,             // Percentage * 100
    pub recall: u32,                // Percentage * 100
    pub f1_score: u32,              // Percentage * 100
    pub mae: u128,                  // Mean Absolute Error
    pub rmse: u128,                 // Root Mean Square Error
    pub r_squared: u32,             // R-squared * 10000
    pub bias_score: u32,            // Bias score * 100
    pub fairness_score: u32,        // Fairness score * 100
}

/// Model deployment status
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum DeploymentStatus {
    Development,
    Testing,
    Staging,
    Production,
    Deprecated,
    Archived,
}

/// Data drift detection result
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct DriftDetectionResult {
    pub drift_detected: bool,
    pub drift_score: u32,           // Drift magnitude * 100
    pub affected_features: Vec<String>,
    pub detection_method: DriftDetectionMethod,
    pub timestamp: u64,
    pub recommendation: DriftRecommendation,
}

/// Drift detection methods
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum DriftDetectionMethod {
    KolmogorovSmirnov,
    ChiSquare,
    PopulationStabilityIndex,
    JensenShannonDivergence,
    WassersteinDistance,
}

/// Recommendations for handling drift
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum DriftRecommendation {
    NoAction,
    MonitorClosely,
    UpdateFeatures,
    RetrainModel,
    ReplaceModel,
}

/// A/B testing configuration for model comparison
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ABTestConfig {
    pub test_id: String,
    pub control_model: String,
    pub treatment_model: String,
    pub traffic_split: u32,         // Percentage * 100 for treatment
    pub duration: u64,              // Test duration in seconds
    pub success_metrics: Vec<ValidationMetric>,
    pub statistical_significance: u32, // Required p-value * 10000
    pub minimum_sample_size: u64,
}

/// A/B test results
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub struct ABTestResult {
    pub test_id: String,
    pub control_performance: ModelMetrics,
    pub treatment_performance: ModelMetrics,
    pub statistical_significance: u32,
    pub confidence_interval: (u32, u32),
    pub recommendation: TestRecommendation,
    pub sample_sizes: (u64, u64),   // (control, treatment)
}

/// Test recommendations
#[derive(Debug, Clone, PartialEq, Eq, Encode, Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout))]
pub enum TestRecommendation {
    ContinueTest,
    DeployTreatment,
    KeepControl,
    ExtendTest,
    StopTest,
}