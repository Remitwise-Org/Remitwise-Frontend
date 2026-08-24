# Tests

This directory contains workspace-level integration, property-based, fuzz, and benchmark coverage across the contract system.

## Architecture

The tests exercise contract behavior from a contributor perspective rather than owning production logic. Shared fixtures and helpers live in [test_utils.rs](test_utils.rs), while each test file focuses on one contract area or validation style.

The test crate configuration can be found in [Cargo.toml](Cargo.toml).

## Logic Tracking

To find shared test accounts, fixtures, generators, and assertions visit [test_utils.rs](test_utils.rs).

To find property token behavior tests visit [property_token_tests.rs](property_token_tests.rs).

To find property registry tests visit [property_registry_tests.rs](property_registry_tests.rs).

To find cross-contract integration tests visit [cross_contract_integration.rs](cross_contract_integration.rs) and [contract_integration_tests.rs](contract_integration_tests.rs).

To find fractional ownership tests visit [fractional_ownership_tests.rs](fractional_ownership_tests.rs).

To find property-based invariant tests visit [property_based_tests.rs](property_based_tests.rs) and [property_based_simple.rs](property_based_simple.rs).

To find fuzz tests visit [fuzz_tests.rs](fuzz_tests.rs) and [fuzz_tests_simple.rs](fuzz_tests_simple.rs).

To find performance benchmark coverage visit [performance_benchmarks.rs](performance_benchmarks.rs).

The test connection layer can be found in [lib.rs](lib.rs).

## Tradeoffs

Test documentation stays at the directory level instead of adding comments to every test function. The test names already describe the expected behavior, while this README explains where each category of verification lives.

Security-oriented tests remain in the existing [../security-tests/README.md](../security-tests/README.md) directory so this folder can stay focused on workspace integration and behavior coverage.
