//! PropChain Security Tests Library
//! 
//! This library provides comprehensive property-based testing, fuzz testing, and security analysis
//! for smart contracts to ensure they meet security standards and resist common attacks.

pub mod property_based_tests;
pub mod fuzz_tests;
pub mod security_analysis;
pub mod zk_tests;

// Re-export commonly used items
pub use property_based_tests::*;
pub use fuzz_tests::*;
pub use security_analysis::*;
pub use zk_tests::*;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_library_imports() {
        // Test that all modules can be imported successfully
        println!("✓ Property-based tests module loaded");
        println!("✓ Fuzz tests module loaded");
        println!("✓ Security analysis module loaded");
    }
    
    #[test]
    fn test_security_analyzer_creation() {
        let analyzer = SecurityAnalyzer::new();
        assert_eq!(analyzer.vulnerabilities.len(), 0);
        assert_eq!(analyzer.test_results.len(), 0);
    }
    
    #[test]
    fn test_security_analysis_empty_code() {
        let mut analyzer = SecurityAnalyzer::new();
        let result = analyzer.analyze_contract("");
        assert_eq!(result.vulnerabilities.len(), 0);
        assert_eq!(result.security_score, 100.0);
    }
    
    #[test]
    fn test_security_metrics_calculation() {
        let mut analyzer = SecurityAnalyzer::new();
        let code_with_vulns = r#"
            function vulnerableAdd(uint a, uint b) public pure returns (uint) {
                return a + b; // Potential overflow
            }
        "#;
        
        let result = analyzer.analyze_contract(code_with_vulns);
        assert!(result.vulnerabilities.len() > 0);
        assert!(result.security_score < 100.0);
        assert!(result.risk_metrics.total_vulnerabilities > 0);
    }
}
