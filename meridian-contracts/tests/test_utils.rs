//! Test Utilities and Fixtures for PropChain Contracts
//!
//! This module provides shared testing utilities, fixtures, and helpers
//! for all contract tests.

#![cfg(feature = "std")]

use ink::env::test::DefaultAccounts;
use ink::env::DefaultEnvironment;
use ink::primitives::AccountId;
use propchain_traits::*;

/// Test account identifiers
pub struct TestAccounts {
    pub alice: AccountId,
    pub bob: AccountId,
    pub charlie: AccountId,
    pub dave: AccountId,
    pub eve: AccountId,
}

impl TestAccounts {
    /// Get default test accounts
    pub fn default() -> Self {
        let accounts = ink::env::test::default_accounts::<DefaultEnvironment>();
        Self {
            alice: accounts.alice,
            bob: accounts.bob,
            charlie: accounts.charlie,
            dave: accounts.dave,
            eve: accounts.eve,
        }
    }

    /// Get all accounts as a vector
    pub fn all(&self) -> Vec<AccountId> {
        vec![self.alice, self.bob, self.charlie, self.dave, self.eve]
    }
}

/// Canonical fixture values — single source of truth for all test data.
/// Tests should reference these constants rather than embedding raw literals.
pub mod fixture_values {
    pub const MINIMAL_LOCATION: &str = "1 Test Lane";
    pub const MINIMAL_SIZE: u64 = 1_000;
    pub const MINIMAL_LEGAL_DESC: &str = "Minimal test parcel";
    pub const MINIMAL_VALUATION: u128 = 100_000;
    pub const MINIMAL_DOCS_URL: &str = "ipfs://QmMinimal";

    pub const STANDARD_LOCATION: &str = "42 Fixture Road, Testville, TS 00001";
    pub const STANDARD_SIZE: u64 = 2_500;
    pub const STANDARD_LEGAL_DESC: &str = "Lot 1, Block A, Fixture Subdivision";
    pub const STANDARD_VALUATION: u128 = 500_000;
    pub const STANDARD_DOCS_URL: &str = "ipfs://QmStandard";

    pub const LARGE_LOCATION: &str = "99 Commerce Blvd, Metro City, TS 99999";
    pub const LARGE_SIZE: u64 = 10_000;
    pub const LARGE_LEGAL_DESC: &str = "Large commercial parcel — fixture data";
    pub const LARGE_VALUATION: u128 = 5_000_000;
    pub const LARGE_DOCS_URL: &str = "ipfs://QmLarge";
}

/// Property metadata fixtures — all values sourced from `fixture_values`.
pub struct PropertyMetadataFixtures;

impl PropertyMetadataFixtures {
    /// Create a minimal valid property metadata.
    pub fn minimal() -> PropertyMetadata {
        PropertyMetadata {
            location: fixture_values::MINIMAL_LOCATION.to_string(),
            size: fixture_values::MINIMAL_SIZE,
            legal_description: fixture_values::MINIMAL_LEGAL_DESC.to_string(),
            valuation: fixture_values::MINIMAL_VALUATION,
            documents_url: fixture_values::MINIMAL_DOCS_URL.to_string(),
        }
    }

    /// Create a standard property metadata.
    pub fn standard() -> PropertyMetadata {
        PropertyMetadata {
            location: fixture_values::STANDARD_LOCATION.to_string(),
            size: fixture_values::STANDARD_SIZE,
            legal_description: fixture_values::STANDARD_LEGAL_DESC.to_string(),
            valuation: fixture_values::STANDARD_VALUATION,
            documents_url: fixture_values::STANDARD_DOCS_URL.to_string(),
        }
    }

    /// Create a large-property metadata.
    pub fn large() -> PropertyMetadata {
        PropertyMetadata {
            location: fixture_values::LARGE_LOCATION.to_string(),
            size: fixture_values::LARGE_SIZE,
            legal_description: fixture_values::LARGE_LEGAL_DESC.to_string(),
            valuation: fixture_values::LARGE_VALUATION,
            documents_url: fixture_values::LARGE_DOCS_URL.to_string(),
        }
    }

    /// Create property metadata with fully custom values.
    pub fn custom(
        location: String,
        size: u64,
        legal_description: String,
        valuation: u128,
        documents_url: String,
    ) -> PropertyMetadata {
        PropertyMetadata {
            location,
            size,
            legal_description,
            valuation,
            documents_url,
        }
    }

    /// Create property metadata covering boundary / edge-case values.
    pub fn edge_cases() -> Vec<PropertyMetadata> {
        vec![
            // Minimum non-zero values
            PropertyMetadata {
                location: "A".to_string(),
                size: 1,
                legal_description: "X".to_string(),
                valuation: 1,
                documents_url: "ipfs://QmEdgeMin".to_string(),
            },
            // Maximum reasonable values
            PropertyMetadata {
                location: "A".repeat(500),
                size: u64::MAX,
                legal_description: "X".repeat(5000),
                valuation: u128::MAX,
                documents_url: "ipfs://QmEdgeMax".to_string(),
            },
            // Unicode / special characters
            PropertyMetadata {
                location: "1 Rue de la Paix, 城市, État 00001".to_string(),
                size: fixture_values::MINIMAL_SIZE,
                legal_description: "Parcel with unicode 🏠 characters".to_string(),
                valuation: fixture_values::MINIMAL_VALUATION,
                documents_url: "ipfs://QmEdgeUnicode".to_string(),
            },
        ]
    }
}

/// Test environment helpers
pub struct TestEnv;

impl TestEnv {
    /// Set the caller for the next contract call
    pub fn set_caller(caller: AccountId) {
        ink::env::test::set_caller::<DefaultEnvironment>(caller);
    }

    /// Set the block timestamp
    pub fn set_block_timestamp(timestamp: u64) {
        ink::env::test::set_block_timestamp::<DefaultEnvironment>(timestamp);
    }

    /// Set the transferred value for the next call
    pub fn set_transferred_value(value: u128) {
        ink::env::test::set_value_transferred::<DefaultEnvironment>(value);
    }

    /// Advance block timestamp by specified amount
    pub fn advance_time(seconds: u64) {
        let current = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        ink::env::test::set_block_timestamp::<DefaultEnvironment>(current + seconds);
    }

    /// Reset test environment
    pub fn reset() {
        let accounts = ink::env::test::default_accounts::<DefaultEnvironment>();
        ink::env::test::set_caller::<DefaultEnvironment>(accounts.alice);
        ink::env::test::set_block_timestamp::<DefaultEnvironment>(0);
        ink::env::test::set_value_transferred::<DefaultEnvironment>(0);
    }
}

/// Assertion helpers for common test patterns
pub mod assertions {
    use super::*;

    /// Assert that a result is an error with a specific error type
    pub fn assert_error<T, E: PartialEq + core::fmt::Debug>(
        result: Result<T, E>,
        expected_error: E,
    ) {
        match result {
            Ok(_) => panic!("Expected error {:?}, but got Ok", expected_error),
            Err(e) => assert_eq!(
                e, expected_error,
                "Expected error {:?}, but got {:?}",
                expected_error, e
            ),
        }
    }

    /// Assert that a result is Ok and return the value
    pub fn assert_ok<T, E: core::fmt::Debug>(result: Result<T, E>) -> T {
        result.unwrap_or_else(|e| panic!("Expected Ok, but got error: {:?}", e))
    }

    /// Assert that two AccountIds are equal
    pub fn assert_account_eq(actual: AccountId, expected: AccountId, message: &str) {
        assert_eq!(
            actual, expected,
            "{}: expected {:?}, got {:?}",
            message, expected, actual
        );
    }
}

/// Test data generators for property-based testing
pub mod generators {
    use super::*;

    /// Generate a random AccountId for testing
    pub fn random_account_id(seed: u8) -> AccountId {
        let mut bytes = [seed; 32];
        // Simple pseudo-random generation
        for i in 0..32 {
            bytes[i] = seed.wrapping_add(i as u8);
        }
        AccountId::from(bytes)
    }

    /// Generate property metadata with random valid values
    pub fn random_property_metadata(seed: u64) -> PropertyMetadata {
        PropertyMetadata {
            location: format!("Property at seed {}", seed),
            size: 1000 + (seed % 10000),
            legal_description: format!("Legal description for seed {}", seed),
            valuation: 100_000 + (seed as u128 * 1000),
            documents_url: format!("ipfs://seed-{}", seed),
        }
    }

    /// Generate a vector of property metadata
    pub fn generate_properties(count: usize) -> Vec<PropertyMetadata> {
        (0..count)
            .map(|i| random_property_metadata(i as u64))
            .collect()
    }
}

/// Performance testing utilities
pub mod performance {
    use super::*;

    /// Measure execution time of a function
    pub fn measure_time<F, T>(f: F) -> (T, u64)
    where
        F: FnOnce() -> T,
    {
        let start = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        let result = f();
        let end = ink::env::test::get_block_timestamp::<DefaultEnvironment>();
        (result, end.saturating_sub(start))
    }

    /// Benchmark a function multiple times
    pub fn benchmark<F, T>(iterations: u32, f: F) -> Vec<u64>
    where
        F: Fn() -> T,
    {
        (0..iterations)
            .map(|_| {
                let (_, time) = measure_time(|| f());
                time
            })
            .collect()
    }
}

/// Contract deployment helpers
pub mod deployment {
    use super::*;

    /// Get default test accounts for contract deployment
    pub fn default_accounts<T: ink::env::Environment>() -> DefaultAccounts<T> {
        ink::env::test::default_accounts::<T>()
    }
}

#[cfg(test)]
mod test_utils_tests {
    use super::*;

    #[test]
    fn test_accounts_default() {
        let accounts = TestAccounts::default();
        assert_ne!(accounts.alice, accounts.bob);
        assert_eq!(accounts.all().len(), 5);
    }

    #[test]
    fn test_property_metadata_fixtures() {
        let minimal = PropertyMetadataFixtures::minimal();
        assert!(!minimal.location.is_empty());

        let standard = PropertyMetadataFixtures::standard();
        assert!(standard.size > minimal.size);

        let edge_cases = PropertyMetadataFixtures::edge_cases();
        assert_eq!(edge_cases.len(), 3);
    }

    #[test]
    fn test_generators() {
        let account = generators::random_account_id(42);
        assert_ne!(account, AccountId::from([0; 32]));

        let metadata = generators::random_property_metadata(100);
        assert!(metadata.size > 0);
    }
}
