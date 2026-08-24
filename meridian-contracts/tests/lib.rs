//! PropChain Test Suite
//!
//! This module provides the test library for PropChain contracts,
//! including shared utilities, fixtures, and test helpers.

#![cfg_attr(not(feature = "std"), no_std)]

pub mod integration_tests;
pub mod test_utils;

// Re-export commonly used items
pub use test_utils::*;
