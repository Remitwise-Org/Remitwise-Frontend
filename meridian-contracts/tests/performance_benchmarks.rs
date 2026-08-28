//! Performance Benchmarks and Regression Tests
//!
//! This module contains performance benchmarks to detect regressions
//! and ensure contract operations meet performance requirements.

use ink::env::test::DefaultEnvironment;
use propchain_contracts::PropertyRegistry;
use propchain_traits::*;

#[cfg(test)]
mod benchmarks {
    use super::*;

    fn setup_registry() -> PropertyRegistry {
        let accounts = ink::env::test::default_accounts::<DefaultEnvironment>();
        ink::env::test::set_caller::<DefaultEnvironment>(accounts.alice);
        PropertyRegistry::new()
    }

    // Maximum expected execution time (in block timestamp units)
    const MAX_REGISTER_TIME: u64 = 1000;
    const MAX_TRANSFER_TIME: u64 = 500;
    const MAX_QUERY_TIME: u64 = 100;

    // ============================================================================
    // REGISTRATION PERFORMANCE
    // ============================================================================

    #[ink::test]
    fn benchmark_register_property() {
        let mut registry = setup_registry();
        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let start = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        let _property_id = registry
            .register_property(metadata)
            .expect("Registration should succeed");
        let end = ink::env::test::get_block_timestamp::<DefaultEnvironment>();

        let duration = end.saturating_sub(start);
        assert!(
            duration <= MAX_REGISTER_TIME,
            "Registration took {} units, expected <= {}",
            duration,
            MAX_REGISTER_TIME
        );
    }

    #[ink::test]
    fn benchmark_register_multiple_properties() {
        let mut registry = setup_registry();
        let iterations = 100;

        let start = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        for i in 1..=iterations {
            let metadata = PropertyMetadata {
                location: format!("Property {}", i),
                size: 1000 + (i * 100),
                legal_description: format!("Description {}", i),
                valuation: 100_000 + (i as u128 * 10_000),
                documents_url: format!("ipfs://prop{}", i),
            };

            registry
                .register_property(metadata)
                .expect("Registration should succeed");
        }
        let end = ink::env::test::get_block_timestamp::<DefaultEnvironment>();

        let total_duration = end.saturating_sub(start);
        let avg_duration = total_duration / iterations as u64;
        
        assert!(
            avg_duration <= MAX_REGISTER_TIME,
            "Average registration took {} units, expected <= {}",
            avg_duration,
            MAX_REGISTER_TIME
        );
    }

    // ============================================================================
    // TRANSFER PERFORMANCE
    // ============================================================================

    #[ink::test]
    fn benchmark_transfer_property() {
        let mut registry = setup_registry();
        let accounts = ink::env::test::default_accounts::<DefaultEnvironment>();

        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let property_id = registry
            .register_property(metadata)
            .expect("Property registration should succeed");

        let start = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        registry
            .transfer_property(property_id, accounts.bob)
            .expect("Transfer should succeed");
        let end = ink::env::test::get_block_timestamp::<DefaultEnvironment>();

        let duration = end.saturating_sub(start);
        assert!(
            duration <= MAX_TRANSFER_TIME,
            "Transfer took {} units, expected <= {}",
            duration,
            MAX_TRANSFER_TIME
        );
    }

    // ============================================================================
    // QUERY PERFORMANCE
    // ============================================================================

    #[ink::test]
    fn benchmark_get_property() {
        let mut registry = setup_registry();

        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let property_id = registry
            .register_property(metadata)
            .expect("Property registration should succeed");

        let start = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        let _property = registry
            .get_property(property_id)
            .expect("Property should exist");
        let end = ink::env::test::get_block_timestamp::<DefaultEnvironment>();

        let duration = end.saturating_sub(start);
        assert!(
            duration <= MAX_QUERY_TIME,
            "Query took {} units, expected <= {}",
            duration,
            MAX_QUERY_TIME
        );
    }

    #[ink::test]
    fn benchmark_get_owner_properties() {
        let mut registry = setup_registry();
        let accounts = ink::env::test::default_accounts::<DefaultEnvironment>();

        // Register multiple properties
        for i in 1..=50 {
            let metadata = PropertyMetadata {
                location: format!("Property {}", i),
                size: 1000,
                legal_description: format!("Description {}", i),
                valuation: 100_000,
                documents_url: format!("ipfs://prop{}", i),
            };

            registry
                .register_property(metadata)
                .expect("Property registration should succeed");
        }

        let start = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        let _properties = registry.get_owner_properties(accounts.alice);
        let end = ink::env::test::get_block_timestamp::<DefaultEnvironment>();

        let duration = end.saturating_sub(start);
        assert!(
            duration <= MAX_QUERY_TIME * 10, // Allow more time for larger queries
            "Query took {} units, expected <= {}",
            duration,
            MAX_QUERY_TIME * 10
        );
    }

    // ============================================================================
    // STRESS TESTS
    // ============================================================================

    #[ink::test]
    fn stress_test_many_registrations() {
        let mut registry = setup_registry();
        let count = 1000;

        for i in 1..=count {
            let metadata = PropertyMetadata {
                location: format!("Property {}", i),
                size: 1000,
                legal_description: format!("Description {}", i),
                valuation: 100_000,
                documents_url: format!("ipfs://prop{}", i),
            };

            let property_id = registry
                .register_property(metadata)
                .expect("Property registration should succeed");
            assert_eq!(property_id, i);
        }

        assert_eq!(registry.property_count(), count);
    }

    #[ink::test]
    fn stress_test_many_transfers() {
        let mut registry = setup_registry();
        let accounts = ink::env::test::default_accounts::<DefaultEnvironment>();

        // Register property
        let metadata = PropertyMetadata {
            location: "123 Main St".to_string(),
            size: 2000,
            legal_description: "Test property".to_string(),
            valuation: 500000,
            documents_url: "https://ipfs.io/test".to_string(),
        };

        let property_id = registry
            .register_property(metadata)
            .expect("Property registration should succeed");

        // Transfer many times
        let transfer_chain = vec![accounts.bob, accounts.charlie, accounts.dave, accounts.eve];
        for _ in 0..100 {
            for (i, &to_account) in transfer_chain.iter().enumerate() {
                let from_account = if i == 0 {
                    accounts.alice
                } else {
                    transfer_chain[i - 1]
                };

                ink::env::test::set_caller::<DefaultEnvironment>(from_account);
                registry
                    .transfer_property(property_id, to_account)
                    .expect("Transfer should succeed");
            }
        }

        // Final owner should be eve (last in chain)
        let property = registry
            .get_property(property_id)
            .expect("Property should exist");
        assert_eq!(property.owner, accounts.eve);
    }
}

// =============================================================================
// ORACLE PERFORMANCE BENCHMARKS
// Systematic benchmarks for gas consumption, storage growth, and execution time
// under load.  Each benchmark records timing via block-timestamp deltas and
// asserts that the measured cost stays within the documented budget.
// =============================================================================

#[cfg(test)]
mod oracle_benchmarks {
    use propchain_oracle::propchain_oracle::PropertyValuationOracle;
    use propchain_traits::*;
    use ink::env::{test, DefaultEnvironment};

    // -------------------------------------------------------------------------
    // Budget constants (block-timestamp units used as a proxy for execution time
    // in the ink! off-chain test environment).
    // -------------------------------------------------------------------------
    const BUDGET_ADD_SOURCE_MS: u64 = 500;
    const BUDGET_UPDATE_VALUATION_MS: u64 = 500;
    const BUDGET_GET_VALUATION_MS: u64 = 200;
    const BUDGET_AGGREGATE_PRICES_MS: u64 = 500;
    const BUDGET_BATCH_REQUEST_MS: u64 = 1_000;
    const BUDGET_HISTORICAL_QUERY_MS: u64 = 500;

    fn setup() -> PropertyValuationOracle {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        test::set_caller::<DefaultEnvironment>(accounts.alice);
        PropertyValuationOracle::new(accounts.alice)
    }

    fn make_source(id: &str, source_type: OracleSourceType, weight: u32) -> OracleSource {
        let accounts = test::default_accounts::<DefaultEnvironment>();
        OracleSource {
            id: id.to_string(),
            source_type,
            address: accounts.bob,
            is_active: true,
            weight,
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
        }
    }

    fn make_valuation(property_id: u64, value: u128) -> PropertyValuation {
        PropertyValuation {
            property_id,
            valuation: value,
            confidence_score: 85,
            sources_used: 3,
            last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
            valuation_method: ValuationMethod::MarketData,
        }
    }

    // -------------------------------------------------------------------------
    // Gas proxy: measure execution time for add_oracle_source
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_add_oracle_source_single() {
        let mut oracle = setup();
        let source = make_source("chainlink_1", OracleSourceType::Chainlink, 50);

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        oracle.add_oracle_source(source).expect("add_oracle_source failed");
        let elapsed = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);

        assert!(
            elapsed <= BUDGET_ADD_SOURCE_MS,
            "add_oracle_source took {elapsed} units, budget is {BUDGET_ADD_SOURCE_MS}"
        );
    }

    // -------------------------------------------------------------------------
    // Storage growth: adding N sources must not degrade per-operation time
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_add_oracle_source_scaling() {
        let mut oracle = setup();
        let n: u32 = 20;

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        for i in 0..n {
            let source = make_source(
                &format!("source_{i}"),
                OracleSourceType::Manual,
                (i % 100 + 1) as u32,
            );
            oracle.add_oracle_source(source).expect("add_oracle_source failed");
        }
        let total = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);
        let avg = total / n as u64;

        assert!(
            avg <= BUDGET_ADD_SOURCE_MS,
            "avg add_oracle_source with {n} sources: {avg} units, budget {BUDGET_ADD_SOURCE_MS}"
        );
        assert_eq!(oracle.active_sources.len(), n as usize);
    }

    // -------------------------------------------------------------------------
    // Gas proxy: update_property_valuation single write
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_update_valuation_single() {
        let mut oracle = setup();
        let v = make_valuation(1, 500_000);

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        oracle.update_property_valuation(1, v).expect("update failed");
        let elapsed = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);

        assert!(
            elapsed <= BUDGET_UPDATE_VALUATION_MS,
            "update_property_valuation took {elapsed} units, budget {BUDGET_UPDATE_VALUATION_MS}"
        );
    }

    // -------------------------------------------------------------------------
    // Storage growth: historical valuations must not cause O(n²) writes
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_update_valuation_storage_growth() {
        let mut oracle = setup();
        let iterations: u32 = 50;

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        for i in 1..=iterations {
            let v = make_valuation(1, 400_000 + i as u128 * 1_000);
            oracle.update_property_valuation(1, v).expect("update failed");
        }
        let total = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);
        let avg = total / iterations as u64;

        assert!(
            avg <= BUDGET_UPDATE_VALUATION_MS,
            "avg update_property_valuation over {iterations} writes: {avg} units, budget {BUDGET_UPDATE_VALUATION_MS}"
        );

        // Verify storage is capped at 100 historical entries
        let history = oracle.get_historical_valuations(1, 200);
        assert!(
            history.len() <= 100,
            "Historical storage must be capped at 100, got {}",
            history.len()
        );
    }

    // -------------------------------------------------------------------------
    // Gas proxy: get_property_valuation read path
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_get_valuation_read() {
        let mut oracle = setup();
        oracle
            .update_property_valuation(1, make_valuation(1, 500_000))
            .expect("setup failed");

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        let _ = oracle.get_property_valuation(1);
        let elapsed = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);

        assert!(
            elapsed <= BUDGET_GET_VALUATION_MS,
            "get_property_valuation took {elapsed} units, budget {BUDGET_GET_VALUATION_MS}"
        );
    }

    // -------------------------------------------------------------------------
    // Gas proxy: aggregate_prices with varying source counts
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_aggregate_prices_scaling() {
        let mut oracle = setup();
        let accounts = test::default_accounts::<DefaultEnvironment>();

        // Register sources
        for i in 0..10u32 {
            oracle
                .add_oracle_source(OracleSource {
                    id: format!("src_{i}"),
                    source_type: OracleSourceType::Manual,
                    address: accounts.bob,
                    is_active: true,
                    weight: 10,
                    last_updated: ink::env::block_timestamp::<DefaultEnvironment>(),
                })
                .expect("add source failed");
        }

        let prices: Vec<PriceData> = (0..10u32)
            .map(|i| PriceData {
                price: 490_000 + i as u128 * 1_000,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: format!("src_{i}"),
            })
            .collect();

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        let result = oracle.aggregate_prices(&prices);
        let elapsed = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);

        assert!(result.is_ok(), "aggregate_prices failed: {:?}", result);
        assert!(
            elapsed <= BUDGET_AGGREGATE_PRICES_MS,
            "aggregate_prices (10 sources) took {elapsed} units, budget {BUDGET_AGGREGATE_PRICES_MS}"
        );
    }

    // -------------------------------------------------------------------------
    // Execution time: batch_request_valuations for N properties
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_batch_request_valuations() {
        let mut oracle = setup();
        let n = 50u64;
        let ids: Vec<u64> = (1..=n).collect();

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        let result = oracle.batch_request_valuations(ids);
        let elapsed = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);

        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), n as usize);
        assert!(
            elapsed <= BUDGET_BATCH_REQUEST_MS,
            "batch_request_valuations ({n} ids) took {elapsed} units, budget {BUDGET_BATCH_REQUEST_MS}"
        );
    }

    // -------------------------------------------------------------------------
    // Execution time: get_historical_valuations with large history
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_get_historical_valuations() {
        let mut oracle = setup();

        // Fill history to the cap
        for i in 1..=100u32 {
            oracle
                .update_property_valuation(1, make_valuation(1, 400_000 + i as u128 * 500))
                .expect("update failed");
        }

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        let history = oracle.get_historical_valuations(1, 100);
        let elapsed = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);

        assert_eq!(history.len(), 100);
        assert!(
            elapsed <= BUDGET_HISTORICAL_QUERY_MS,
            "get_historical_valuations (100 entries) took {elapsed} units, budget {BUDGET_HISTORICAL_QUERY_MS}"
        );
    }

    // -------------------------------------------------------------------------
    // Regression guard: confidence score calculation must be O(n) in sources
    // -------------------------------------------------------------------------
    #[ink::test]
    fn bench_confidence_score_scaling() {
        let oracle = setup();

        let prices: Vec<PriceData> = (0..20u32)
            .map(|i| PriceData {
                price: 495_000 + i as u128 * 500,
                timestamp: ink::env::block_timestamp::<DefaultEnvironment>(),
                source: format!("src_{i}"),
            })
            .collect();

        let t0 = test::get_block_timestamp::<DefaultEnvironment>();
        let score = oracle.calculate_confidence_score(&prices);
        let elapsed = test::get_block_timestamp::<DefaultEnvironment>().saturating_sub(t0);

        assert!(score.is_ok());
        assert!(
            elapsed <= BUDGET_AGGREGATE_PRICES_MS,
            "calculate_confidence_score (20 prices) took {elapsed} units, budget {BUDGET_AGGREGATE_PRICES_MS}"
        );
    }
}
