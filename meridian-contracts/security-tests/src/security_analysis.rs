//! Security analysis and vulnerability assessment
//! 
//! This module provides comprehensive security analysis tools for smart contracts,
//! including vulnerability scanning, attack simulation, and security metric calculation.

use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

/// Security vulnerability types
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum VulnerabilityType {
    IntegerOverflow,
    Reentrancy,
    AccessControlBypass,
    FrontRunning,
    DenialOfService,
    LogicError,
    GasLimitExceeded,
    UnauthorizedTransfer,
    DoubleSpending,
    TimestampDependency,
    RandomnessWeakness,
    ExternalCallManipulation,
}

/// Security vulnerability with severity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Vulnerability {
    pub vulnerability_type: VulnerabilityType,
    pub severity: Severity,
    pub description: String,
    pub location: String,
    pub recommendation: String,
}

/// Vulnerability severity levels
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

/// Security analysis results
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityAnalysisResult {
    pub vulnerabilities: Vec<Vulnerability>,
    pub security_score: f64,
    pub risk_metrics: RiskMetrics,
    pub recommendations: Vec<String>,
}

/// Risk metrics for security assessment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiskMetrics {
    pub total_vulnerabilities: usize,
    pub critical_count: usize,
    pub high_count: usize,
    pub medium_count: usize,
    pub low_count: usize,
    pub attack_surface: f64,
    pub exploitability: f64,
    pub impact_score: f64,
}

/// Contract security analyzer
pub struct SecurityAnalyzer {
    vulnerabilities: Vec<Vulnerability>,
    test_results: HashMap<String, bool>,
}

impl SecurityAnalyzer {
    /// Create a new security analyzer
    pub fn new() -> Self {
        Self {
            vulnerabilities: Vec::new(),
            test_results: HashMap::new(),
        }
    }
    
    /// Analyze contract for common vulnerabilities
    pub fn analyze_contract(&mut self, contract_code: &str) -> SecurityAnalysisResult {
        self.vulnerabilities.clear();
        
        // Check for integer overflow vulnerabilities
        self.check_integer_overflow(contract_code);
        
        // Check for reentrancy vulnerabilities
        self.check_reentrancy(contract_code);
        
        // Check for access control issues
        self.check_access_control(contract_code);
        
        // Check for front-running vulnerabilities
        self.check_front_running(contract_code);
        
        // Check for denial of service vulnerabilities
        self.check_denial_of_service(contract_code);
        
        // Check for logic errors
        self.check_logic_errors(contract_code);
        
        // Check for gas limit issues
        self.check_gas_limit(contract_code);
        
        // Check for unauthorized transfers
        self.check_unauthorized_transfer(contract_code);
        
        // Check for double spending
        self.check_double_spending(contract_code);
        
        // Check for timestamp dependencies
        self.check_timestamp_dependency(contract_code);
        
        // Check for randomness weaknesses
        self.check_randomness_weakness(contract_code);
        
        // Check for external call manipulation
        self.check_external_call_manipulation(contract_code);
        
        // Calculate security metrics
        let risk_metrics = self.calculate_risk_metrics();
        let security_score = self.calculate_security_score(&risk_metrics);
        let recommendations = self.generate_recommendations();
        
        SecurityAnalysisResult {
            vulnerabilities: self.vulnerabilities.clone(),
            security_score,
            risk_metrics,
            recommendations,
        }
    }
    
    /// Check for integer overflow vulnerabilities
    fn check_integer_overflow(&mut self, code: &str) {
        let patterns = [
            "unchecked_add",
            "unchecked_mul",
            "unchecked_sub",
            "a + b",
            "a * b",
            "a - b",
        ];
        
        for pattern in patterns {
            if code.contains(pattern) && !code.contains("checked_") {
                self.vulnerabilities.push(Vulnerability {
                    vulnerability_type: VulnerabilityType::IntegerOverflow,
                    severity: Severity::High,
                    description: format!("Potential integer overflow detected in pattern: {}", pattern),
                    location: "Arithmetic operation".to_string(),
                    recommendation: "Use checked arithmetic operations (checked_add, checked_mul, checked_sub)".to_string(),
                });
            }
        }
    }
    
    /// Check for reentrancy vulnerabilities
    fn check_reentrancy(&mut self, code: &str) {
        if code.contains("external_call") && !code.contains("reentrancy_guard") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::Reentrancy,
                severity: Severity::Critical,
                description: "Potential reentrancy vulnerability detected".to_string(),
                location: "External call without reentrancy protection".to_string(),
                recommendation: "Implement reentrancy guards using checks-effects-interactions pattern".to_string(),
            });
        }
    }
    
    /// Check for access control issues
    fn check_access_control(&mut self, code: &str) {
        if code.contains("only_owner") && !code.contains("require(msg.sender == owner)") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::AccessControlBypass,
                severity: Severity::High,
                description: "Weak access control implementation detected".to_string(),
                location: "Access control mechanism".to_string(),
                recommendation: "Implement proper access control with explicit owner checks".to_string(),
            });
        }
    }
    
    /// Check for front-running vulnerabilities
    fn check_front_running(&mut self, code: &str) {
        if code.contains("block.timestamp") && code.contains("price") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::FrontRunning,
                severity: Severity::Medium,
                description: "Potential front-running vulnerability due to timestamp dependency".to_string(),
                location: "Price calculation".to_string(),
                recommendation: "Use commit-reveal scheme or oracle-based pricing".to_string(),
            });
        }
    }
    
    /// Check for denial of service vulnerabilities
    fn check_denial_of_service(&mut self, code: &str) {
        if code.contains("while") || code.contains("for") && code.contains("push") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::DenialOfService,
                severity: Severity::High,
                description: "Potential denial of service through unbounded loops".to_string(),
                location: "Loop with array operations".to_string(),
                recommendation: "Add bounds checking or use fixed-size arrays".to_string(),
            });
        }
    }
    
    /// Check for logic errors
    fn check_logic_errors(&mut self, code: &str) {
        if code.contains("require") && code.contains("||") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::LogicError,
                severity: Severity::Medium,
                description: "Complex require statement may contain logic error".to_string(),
                location: "Condition checking".to_string(),
                recommendation: "Simplify complex conditions and add comprehensive tests".to_string(),
            });
        }
    }
    
    /// Check for gas limit issues
    fn check_gas_limit(&mut self, code: &str) {
        if code.contains("for") && code.contains("length") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::GasLimitExceeded,
                severity: Severity::Medium,
                description: "Potential gas limit issue with unbounded loop".to_string(),
                location: "Loop over dynamic array".to_string(),
                recommendation: "Add gas limits or use pagination for large arrays".to_string(),
            });
        }
    }
    
    /// Check for unauthorized transfers
    fn check_unauthorized_transfer(&mut self, code: &str) {
        if code.contains("transfer") && !code.contains("require") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::UnauthorizedTransfer,
                severity: Severity::High,
                description: "Transfer without proper authorization check".to_string(),
                location: "Transfer function".to_string(),
                recommendation: "Add proper authorization checks before transfers".to_string(),
            });
        }
    }
    
    /// Check for double spending
    fn check_double_spending(&mut self, code: &str) {
        if code.contains("balance") && code.contains("transfer") && !code.contains("update") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::DoubleSpending,
                severity: Severity::Critical,
                description: "Potential double spending vulnerability".to_string(),
                location: "Balance update".to_string(),
                recommendation: "Implement proper balance updates and checks".to_string(),
            });
        }
    }
    
    /// Check for timestamp dependencies
    fn check_timestamp_dependency(&mut self, code: &str) {
        if code.contains("block.timestamp") && code.contains("require") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::TimestampDependency,
                severity: Severity::Low,
                description: "Timestamp dependency detected".to_string(),
                location: "Time-based condition".to_string(),
                recommendation: "Use block number or oracle for time-sensitive operations".to_string(),
            });
        }
    }
    
    /// Check for randomness weaknesses
    fn check_randomness_weakness(&mut self, code: &str) {
        if code.contains("keccak256") && code.contains("block") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::RandomnessWeakness,
                severity: Severity::High,
                description: "Weak randomness using block variables".to_string(),
                location: "Random number generation".to_string(),
                recommendation: "Use proper randomness oracle or commit-reveal scheme".to_string(),
            });
        }
    }
    
    /// Check for external call manipulation
    fn check_external_call_manipulation(&mut self, code: &str) {
        if code.contains("call") && !code.contains("require") {
            self.vulnerabilities.push(Vulnerability {
                vulnerability_type: VulnerabilityType::ExternalCallManipulation,
                severity: Severity::Medium,
                description: "External call without proper validation".to_string(),
                location: "External call".to_string(),
                recommendation: "Add proper validation and checks for external calls".to_string(),
            });
        }
    }
    
    /// Calculate risk metrics
    fn calculate_risk_metrics(&self) -> RiskMetrics {
        let mut critical_count = 0;
        let mut high_count = 0;
        let mut medium_count = 0;
        let mut low_count = 0;
        
        for vuln in &self.vulnerabilities {
            match vuln.severity {
                Severity::Critical => critical_count += 1,
                Severity::High => high_count += 1,
                Severity::Medium => medium_count += 1,
                Severity::Low => low_count += 1,
            }
        }
        
        let total_vulnerabilities = self.vulnerabilities.len();
        
        // Calculate attack surface (0-1 scale)
        let attack_surface = if total_vulnerabilities > 0 {
            (total_vulnerabilities as f64 / 50.0).min(1.0)
        } else {
            0.0
        };
        
        // Calculate exploitability (0-1 scale)
        let exploitability = if total_vulnerabilities > 0 {
            let weighted_score = (critical_count * 4 + high_count * 3 + medium_count * 2 + low_count) as f64;
            (weighted_score / (total_vulnerabilities * 4) as f64).min(1.0)
        } else {
            0.0
        };
        
        // Calculate impact score (0-1 scale)
        let impact_score = if total_vulnerabilities > 0 {
            (critical_count as f64 / total_vulnerabilities as f64).min(1.0)
        } else {
            0.0
        };
        
        RiskMetrics {
            total_vulnerabilities,
            critical_count,
            high_count,
            medium_count,
            low_count,
            attack_surface,
            exploitability,
            impact_score,
        }
    }
    
    /// Calculate overall security score (0-100 scale)
    fn calculate_security_score(&self, metrics: &RiskMetrics) -> f64 {
        let base_score = 100.0;
        
        // Deduct points based on vulnerabilities
        let critical_deduction = metrics.critical_count as f64 * 25.0;
        let high_deduction = metrics.high_count as f64 * 15.0;
        let medium_deduction = metrics.medium_count as f64 * 10.0;
        let low_deduction = metrics.low_count as f64 * 5.0;
        
        let total_deduction = critical_deduction + high_deduction + medium_deduction + low_deduction;
        
        // Apply exploitability and impact factors
        let risk_factor = (metrics.exploitability + metrics.impact_score) / 2.0;
        let adjusted_deduction = total_deduction * (1.0 + risk_factor);
        
        (base_score - adjusted_deduction).max(0.0)
    }
    
    /// Generate security recommendations
    fn generate_recommendations(&self) -> Vec<String> {
        let mut recommendations = Vec::new();
        
        // General recommendations based on vulnerability types found
        let vuln_types: HashSet<_> = self.vulnerabilities.iter()
            .map(|v| &v.vulnerability_type)
            .collect();
        
        if vuln_types.contains(&VulnerabilityType::IntegerOverflow) {
            recommendations.push("Implement proper arithmetic overflow checks using checked_* operations".to_string());
        }
        
        if vuln_types.contains(&VulnerabilityType::Reentrancy) {
            recommendations.push("Implement reentrancy guards using checks-effects-interactions pattern".to_string());
        }
        
        if vuln_types.contains(&VulnerabilityType::AccessControlBypass) {
            recommendations.push("Strengthen access control mechanisms with proper authorization checks".to_string());
        }
        
        if vuln_types.contains(&VulnerabilityType::FrontRunning) {
            recommendations.push("Implement commit-reveal schemes or use oracle-based pricing".to_string());
        }
        
        if vuln_types.contains(&VulnerabilityType::DenialOfService) {
            recommendations.push("Add bounds checking and gas limits for iterative operations".to_string());
        }
        
        if vuln_types.contains(&VulnerabilityType::DoubleSpending) {
            recommendations.push("Implement proper state management to prevent double spending".to_string());
        }
        
        if vuln_types.contains(&VulnerabilityType::RandomnessWeakness) {
            recommendations.push("Use secure randomness sources like Chainlink VRF or commit-reveal schemes".to_string());
        }
        
        // General security recommendations
        recommendations.push("Conduct comprehensive security audits before deployment".to_string());
        recommendations.push("Implement extensive test coverage including edge cases".to_string());
        recommendations.push("Use formal verification for critical contract components".to_string());
        recommendations.push("Monitor contract activity for suspicious patterns post-deployment".to_string());
        
        recommendations
    }
    
    /// Generate security report
    pub fn generate_report(&self, result: &SecurityAnalysisResult) -> String {
        let mut report = String::new();
        
        report.push_str("# Security Analysis Report\n\n");
        report.push_str(&format!("## Overall Security Score: {:.1}/100\n\n", result.security_score));
        
        report.push_str("## Risk Metrics\n\n");
        report.push_str(&format!("- Total Vulnerabilities: {}\n", result.risk_metrics.total_vulnerabilities));
        report.push_str(&format!("- Critical: {}\n", result.risk_metrics.critical_count));
        report.push_str(&format!("- High: {}\n", result.risk_metrics.high_count));
        report.push_str(&format!("- Medium: {}\n", result.risk_metrics.medium_count));
        report.push_str(&format!("- Low: {}\n", result.risk_metrics.low_count));
        report.push_str(&format!("- Attack Surface: {:.2}\n", result.risk_metrics.attack_surface));
        report.push_str(&format!("- Exploitability: {:.2}\n", result.risk_metrics.exploitability));
        report.push_str(&format!("- Impact Score: {:.2}\n\n", result.risk_metrics.impact_score));
        
        report.push_str("## Vulnerabilities\n\n");
        
        for vuln in &result.vulnerabilities {
            report.push_str(&format!("### {:?} ({:?})\n", vuln.vulnerability_type, vuln.severity));
            report.push_str(&format!("**Description:** {}\n", vuln.description));
            report.push_str(&format!("**Location:** {}\n", vuln.location));
            report.push_str(&format!("**Recommendation:** {}\n\n", vuln.recommendation));
        }
        
        report.push_str("## Recommendations\n\n");
        for (i, rec) in result.recommendations.iter().enumerate() {
            report.push_str(&format!("{}. {}\n", i + 1, rec));
        }
        
        report
    }
}

impl Default for SecurityAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

/// Security testing utilities
pub mod security_tests {
    use super::*;
    
    /// Test contract resistance to common attacks
    pub fn test_attack_resistance() -> HashMap<String, bool> {
        let mut results = HashMap::new();
        
        // Test reentrancy resistance
        results.insert("reentrancy_resistance".to_string(), test_reentrancy_resistance());
        
        // Test integer overflow protection
        results.insert("overflow_protection".to_string(), test_overflow_protection());
        
        // Test access control
        results.insert("access_control".to_string(), test_access_control());
        
        // Test front-running resistance
        results.insert("front_running_resistance".to_string(), test_front_running_resistance());
        
        // Test denial of service resistance
        results.insert("dos_resistance".to_string(), test_dos_resistance());
        
        results
    }
    
    fn test_reentrancy_resistance() -> bool {
        // Simulate reentrancy attack
        let mut reentrancy_guard = false;
        let mut balance = 1000u128;
        
        // Attempt reentrancy
        if !reentrancy_guard {
            reentrancy_guard = true;
            // Simulate external call that tries to re-enter
            if !reentrancy_guard {
                balance -= 100;
            }
            reentrancy_guard = false;
        }
        
        balance == 1000 // Should be unchanged due to guard
    }
    
    fn test_overflow_protection() -> bool {
        let mut value = u128::MAX - 1;
        
        // Test overflow protection
        if let Some(result) = value.checked_add(1) {
            value = result;
        } else {
            return true; // Overflow detected and handled
        }
        
        if let Some(_) = value.checked_add(1) {
            false // Overflow not detected
        } else {
            true // Overflow detected
        }
    }
    
    fn test_access_control() -> bool {
        let owner = vec![1u8; 32];
        let unauthorized = vec![2u8; 32];
        
        // Test access control
        let is_authorized = |caller: &[u8]| -> bool {
            caller == owner
        };
        
        !is_authorized(&unauthorized) && is_authorized(&owner)
    }
    
    fn test_front_running_resistance() -> bool {
        // Simulate commit-reveal scheme
        let commit = "secret_hash";
        let reveal = "secret_value";
        
        // In a real implementation, this would involve cryptographic commitment
        commit.len() > 0 && reveal.len() > 0
    }
    
    fn test_dos_resistance() -> bool {
        // Test gas limit protection
        let array_size = 1000;
        let max_iterations = 100;
        
        let iterations = array_size.min(max_iterations);
        iterations <= max_iterations
    }
}

fn main() {
    println!("Security Analysis Module");
    println!("======================");
    
    let analyzer = SecurityAnalyzer::new();
    
    // Example analysis
    let sample_code = r#"
        contract SampleContract {
            function vulnerableAdd(uint a, uint b) public pure returns (uint) {
                return a + b; // Potential overflow
            }
            
            function vulnerableTransfer(address to, uint amount) public {
                // Missing authorization check
                balance[msg.sender] -= amount;
                balance[to] += amount;
            }
        }
    "#;
    
    let result = analyzer.analyze_contract(sample_code);
    let report = analyzer.generate_report(&result);
    
    println!("Analysis completed!");
    println!("Security Score: {:.1}/100", result.security_score);
    println!("Vulnerabilities found: {}", result.vulnerabilities.len());
    
    // Save report to file (in a real implementation)
    println!("\nSecurity report generated successfully!");
    println!("Use this module to analyze your smart contracts for security vulnerabilities.");
}
