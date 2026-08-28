//! Comprehensive Error Handling and Recovery Module
//!
//! This module provides:
//! - Error categorization (User, System, Network)
//! - Detailed error messages with recovery suggestions
//! - Error logging and monitoring
//! - Error rate tracking
//! - User-friendly error reporting

#![cfg_attr(not(feature = "std"), no_std)]

use ink::prelude::string::String;
use ink::prelude::vec::Vec;

/// Error category classification
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ErrorCategory {
    /// User input errors - can be recovered by user action
    UserError,
    /// System/internal errors - may require contract admin intervention
    SystemError,
    /// Network/external errors - may resolve automatically
    NetworkError,
    /// Validation errors - input validation failures
    ValidationError,
    /// Authorization errors - permission/access issues
    AuthorizationError,
    /// State errors - contract state inconsistencies
    StateError,
}

/// Error severity level
#[derive(Debug, Clone, PartialEq, Eq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub enum ErrorSeverity {
    /// Low severity - informational, operation may continue
    Low,
    /// Medium severity - warning, operation may be affected
    Medium,
    /// High severity - operation failed, requires attention
    High,
    /// Critical severity - system integrity at risk
    Critical,
}

/// Enhanced error information with recovery suggestions
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct ErrorInfo {
    /// Error code identifier
    pub code: String,
    /// Human-readable error message
    pub message: String,
    /// Error category
    pub category: ErrorCategory,
    /// Error severity
    pub severity: ErrorSeverity,
    /// Recovery suggestions for users/developers
    pub recovery_suggestions: Vec<String>,
    /// Additional context data
    pub context: Vec<(String, String)>,
    /// Timestamp when error occurred
    pub timestamp: u64,
}

impl ErrorInfo {
    /// Create a new error info with user-friendly message
    pub fn new(
        code: impl Into<String>,
        message: impl Into<String>,
        category: ErrorCategory,
        severity: ErrorSeverity,
    ) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            category,
            severity,
            recovery_suggestions: Vec::new(),
            context: Vec::new(),
            timestamp: 0, // Will be set by caller with block timestamp
        }
    }

    /// Add a recovery suggestion
    pub fn with_suggestion(mut self, suggestion: impl Into<String>) -> Self {
        self.recovery_suggestions.push(suggestion.into());
        self
    }

    /// Add multiple recovery suggestions
    pub fn with_suggestions(mut self, suggestions: Vec<String>) -> Self {
        self.recovery_suggestions.extend(suggestions);
        self
    }

    /// Add context information
    pub fn with_context(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.context.push((key.into(), value.into()));
        self
    }

    /// Set timestamp
    pub fn with_timestamp(mut self, timestamp: u64) -> Self {
        self.timestamp = timestamp;
        self
    }

    /// Get user-friendly error message for dApp integration
    pub fn user_message(&self) -> String {
        format!(
            "{}: {}\n\nRecovery suggestions:\n{}",
            self.code,
            self.message,
            self.recovery_suggestions
                .iter()
                .enumerate()
                .map(|(i, s)| format!("  {}. {}", i + 1, s))
                .collect::<Vec<_>>()
                .join("\n")
        )
    }
}

/// Error logging and monitoring storage
/// This can be embedded in contract storage
#[derive(Debug, Clone, scale::Encode, scale::Decode)]
#[cfg_attr(
    feature = "std",
    derive(scale_info::TypeInfo, ink::storage::traits::StorageLayout)
)]
pub struct ErrorLogger {
    /// Error history: (account, error_code) -> count
    /// Note: In actual contract, use Mapping<(AccountId, String), u64>
    /// This is a simplified version for utility purposes
    #[cfg(feature = "std")]
    pub error_counts: Vec<((AccountId, String), u64)>,
    /// Recent errors log (last N errors)
    pub recent_errors: Vec<ErrorInfo>,
    /// Error rate tracking: error_code -> count per time window
    /// Note: In actual contract, use Mapping<String, ErrorRate>
    #[cfg(feature = "std")]
    pub error_rates: Vec<(String, ErrorRate)>,
    /// Maximum number of recent errors to keep
    pub max_recent_errors: u32,
}

/// Error rate tracking structure
#[derive(Debug, Clone, PartialEq, scale::Encode, scale::Decode)]
#[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
pub struct ErrorRate {
    /// Error count in current window
    pub count: u64,
    /// Window start timestamp
    pub window_start: u64,
    /// Window duration in milliseconds
    pub window_duration: u64,
}

impl ErrorRate {
    /// Create new error rate tracker
    pub fn new(window_duration: u64) -> Self {
        Self {
            count: 0,
            window_start: 0,
            window_duration,
        }
    }

    /// Increment error count, resetting window if needed
    pub fn increment(&mut self, current_time: u64) {
        if current_time >= self.window_start + self.window_duration {
            // Reset window
            self.window_start = current_time;
            self.count = 1;
        } else {
            self.count += 1;
        }
    }

    /// Get current error rate (errors per second)
    pub fn rate(&self, current_time: u64) -> f64 {
        let elapsed = if current_time > self.window_start {
            (current_time - self.window_start) as f64 / 1000.0
        } else {
            0.0
        };
        if elapsed > 0.0 {
            self.count as f64 / elapsed
        } else {
            0.0
        }
    }
}

impl ErrorLogger {
    /// Create new error logger
    pub fn new(max_recent_errors: u32) -> Self {
        Self {
            #[cfg(feature = "std")]
            error_counts: Vec::new(),
            recent_errors: Vec::new(),
            #[cfg(feature = "std")]
            error_rates: Vec::new(),
            max_recent_errors,
        }
    }

    /// Log an error with full context
    /// Note: In actual contract implementation, use Mapping for error_counts and error_rates
    pub fn log_error(&mut self, account: AccountId, error_info: ErrorInfo, current_timestamp: u64) {
        let error_info = error_info.with_timestamp(current_timestamp);

        // Update error count for this account and error code
        #[cfg(feature = "std")]
        {
            let key = (account, error_info.code.clone());
            if let Some((_, count)) = self.error_counts.iter_mut().find(|(k, _)| *k == key) {
                *count += 1;
            } else {
                self.error_counts.push((key, 1));
            }
        }

        // Update error rate
        #[cfg(feature = "std")]
        {
            let code = error_info.code.clone();
            if let Some((_, rate)) = self.error_rates.iter_mut().find(|(c, _)| *c == code) {
                rate.increment(current_timestamp);
            } else {
                let mut rate = ErrorRate::new(3600_000); // 1 hour window
                rate.increment(current_timestamp);
                self.error_rates.push((error_info.code.clone(), rate));
            }
        }

        // Add to recent errors (keep only last N)
        self.recent_errors.push(error_info);
        if self.recent_errors.len() > self.max_recent_errors as usize {
            self.recent_errors.remove(0);
        }
    }

    /// Get error count for account and error code
    pub fn get_error_count(&self, account: AccountId, error_code: &str) -> u64 {
        #[cfg(feature = "std")]
        {
            let key = (account, error_code.to_string());
            self.error_counts
                .iter()
                .find(|(k, _)| *k == key)
                .map(|(_, count)| *count)
                .unwrap_or(0)
        }
        #[cfg(not(feature = "std"))]
        {
            0
        }
    }

    /// Get error rate for error code
    pub fn get_error_rate(&self, error_code: &str, current_time: u64) -> f64 {
        #[cfg(feature = "std")]
        {
            self.error_rates
                .iter()
                .find(|(c, _)| *c == error_code)
                .map(|(_, rate)| rate.rate(current_time))
                .unwrap_or(0.0)
        }
        #[cfg(not(feature = "std"))]
        {
            0.0
        }
    }

    /// Get recent errors
    pub fn get_recent_errors(&self, limit: u32) -> Vec<ErrorInfo> {
        let start = if self.recent_errors.len() > limit as usize {
            self.recent_errors.len() - limit as usize
        } else {
            0
        };
        self.recent_errors[start..].to_vec()
    }
}

/// Helper functions for creating common error types

/// Create a user error with recovery suggestions
pub fn user_error(
    code: impl Into<String>,
    message: impl Into<String>,
    suggestions: Vec<String>,
) -> ErrorInfo {
    ErrorInfo::new(
        code,
        message,
        ErrorCategory::UserError,
        ErrorSeverity::Medium,
    )
    .with_suggestions(suggestions)
}

/// Create a system error
pub fn system_error(code: impl Into<String>, message: impl Into<String>) -> ErrorInfo {
    ErrorInfo::new(
        code,
        message,
        ErrorCategory::SystemError,
        ErrorSeverity::High,
    )
    .with_suggestion("Contact contract administrator if issue persists")
}

/// Create a network error
pub fn network_error(
    code: impl Into<String>,
    message: impl Into<String>,
    suggestions: Vec<String>,
) -> ErrorInfo {
    ErrorInfo::new(
        code,
        message,
        ErrorCategory::NetworkError,
        ErrorSeverity::Medium,
    )
    .with_suggestions(suggestions)
}

/// Create a validation error
pub fn validation_error(
    code: impl Into<String>,
    message: impl Into<String>,
    field: impl Into<String>,
) -> ErrorInfo {
    ErrorInfo::new(
        code,
        message,
        ErrorCategory::ValidationError,
        ErrorSeverity::Low,
    )
    .with_context("field", field)
    .with_suggestion("Check input parameters and try again")
}

/// Create an authorization error
pub fn authorization_error(
    code: impl Into<String>,
    message: impl Into<String>,
    required_permission: impl Into<String>,
) -> ErrorInfo {
    ErrorInfo::new(
        code,
        message,
        ErrorCategory::AuthorizationError,
        ErrorSeverity::Medium,
    )
    .with_context("required_permission", required_permission)
    .with_suggestion("Ensure you have the required permissions")
    .with_suggestion("Contact the contract owner if you believe this is an error")
}

/// Create a state error
pub fn state_error(
    code: impl Into<String>,
    message: impl Into<String>,
    expected_state: impl Into<String>,
    actual_state: impl Into<String>,
) -> ErrorInfo {
    ErrorInfo::new(
        code,
        message,
        ErrorCategory::StateError,
        ErrorSeverity::High,
    )
    .with_context("expected_state", expected_state)
    .with_context("actual_state", actual_state)
    .with_suggestion("Wait for the contract state to update")
    .with_suggestion("Check transaction status and retry if needed")
}

/// Safe unwrap with error handling
/// Returns Result instead of panicking
pub fn safe_unwrap<T>(
    option: Option<T>,
    error_code: impl Into<String>,
    error_message: impl Into<String>,
) -> Result<T, ErrorInfo> {
    option.ok_or_else(|| {
        ErrorInfo::new(
            error_code,
            error_message,
            ErrorCategory::SystemError,
            ErrorSeverity::High,
        )
        .with_suggestion("This indicates an internal contract error")
        .with_suggestion("Please report this issue to the contract administrator")
    })
}

/// Safe expect with error handling
/// Returns Result instead of panicking
pub fn safe_expect<T>(
    option: Option<T>,
    error_code: impl Into<String>,
    error_message: impl Into<String>,
    context: Vec<(String, String)>,
) -> Result<T, ErrorInfo> {
    option.ok_or_else(|| {
        let mut error = ErrorInfo::new(
            error_code,
            error_message,
            ErrorCategory::SystemError,
            ErrorSeverity::High,
        )
        .with_suggestion("This indicates an internal contract error")
        .with_suggestion("Please report this issue to the contract administrator");

        for (key, value) in context {
            error = error.with_context(key, value);
        }

        error
    })
}

/// Convert Result<T, E> to Result<T, ErrorInfo> with context
pub fn map_to_error_info<T, E: core::fmt::Debug>(
    result: Result<T, E>,
    error_code: impl Into<String>,
    error_message: impl Into<String>,
    category: ErrorCategory,
) -> Result<T, ErrorInfo> {
    result.map_err(|e| {
        ErrorInfo::new(
            error_code,
            format!("{}: {:?}", error_message.into(), e),
            category,
            ErrorSeverity::Medium,
        )
    })
}

// Re-export AccountId and Hash for convenience
use ink::primitives::AccountId;
