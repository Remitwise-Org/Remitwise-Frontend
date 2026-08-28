#!/bin/bash

# Security Fixes Test Runner
# This script runs all tests specifically for the security fixes implemented

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Security Fixes Verification Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

cd "$(dirname "$0")/.."

# Test 1: Nonce Replay Prevention
echo -e "${YELLOW}[1/9] Testing Nonce Replay Prevention...${NC}"
cargo test --package propchain-insurance test_nonce_replay_prevention -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Nonce replay attack prevented${NC}"
else
    echo -e "${RED}✗ FAILED: Nonce replay prevention not working${NC}"
    exit 1
fi
echo ""

# Test 2: Different Nonces Allowed
echo -e "${YELLOW}[2/9] Testing Different Nonces Allowed...${NC}"
cargo test --package propchain-insurance test_different_nonces_allowed -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Different nonces work correctly${NC}"
else
    echo -e "${RED}✗ FAILED: Different nonces rejected${NC}"
    exit 1
fi
echo ""

# Test 3: Dispute Deadline Set on Submission
echo -e "${YELLOW}[3/9] Testing Dispute Deadline on Submission...${NC}"
cargo test --package propchain-insurance test_dispute_deadline_set_on_submission -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Dispute deadline set immediately${NC}"
else
    echo -e "${RED}✗ FAILED: Dispute deadline not set${NC}"
    exit 1
fi
echo ""

# Test 4: Dispute Window Enforcement
echo -e "${YELLOW}[4/9] Testing Dispute Window Enforcement...${NC}"
cargo test --package propchain-insurance test_dispute_window_expired_enforcement -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Dispute window enforced correctly${NC}"
else
    echo -e "${RED}✗ FAILED: Dispute window not enforced${NC}"
    exit 1
fi
echo ""

# Test 5: Emergency Pause - Claim Submission
echo -e "${YELLOW}[5/9] Testing Emergency Pause (Claim Submission)...${NC}"
cargo test --package propchain-insurance test_pause_prevents_claim_submission -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Pause prevents claim submission${NC}"
else
    echo -e "${RED}✗ FAILED: Pause doesn't prevent claims${NC}"
    exit 1
fi
echo ""

# Test 6: Emergency Pause - Policy Creation
echo -e "${YELLOW}[6/9] Testing Emergency Pause (Policy Creation)...${NC}"
cargo test --package propchain-insurance test_pause_prevents_policy_creation -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Pause prevents policy creation${NC}"
else
    echo -e "${RED}✗ FAILED: Pause doesn't prevent policies${NC}"
    exit 1
fi
echo ""

# Test 7: Unpause Restores Functionality
echo -e "${YELLOW}[7/9] Testing Unpause Restores Functionality...${NC}"
cargo test --package propchain-insurance test_unpause_restores_functionality -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Unpause restores functionality${NC}"
else
    echo -e "${RED}✗ FAILED: Unpause doesn't work${NC}"
    exit 1
fi
echo ""

# Test 8: Minimum Premium Enforcement
echo -e "${YELLOW}[8/9] Testing Minimum Premium Enforcement...${NC}"
cargo test --package propchain-insurance test_minimum_premium_enforcement -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Minimum premium enforced${NC}"
else
    echo -e "${RED}✗ FAILED: Minimum premium not enforced${NC}"
    exit 1
fi
echo ""

# Test 9: Liquidity Provider Share Calculation
echo -e "${YELLOW}[9/9] Testing Liquidity Provider Share Calculation...${NC}"
cargo test --package propchain-insurance test_liquidity_provider_share_calculation -- --nocapture
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ PASSED: Share percentage calculated correctly${NC}"
else
    echo -e "${RED}✗ FAILED: Share calculation incorrect${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}All Security Fix Tests PASSED! ✓${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Run all insurance tests to ensure no regressions
echo -e "${YELLOW}Running full test suite to check for regressions...${NC}"
cargo test --package propchain-insurance
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed, no regressions detected${NC}"
else
    echo -e "${RED}✗ Some tests failed, review required${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Security Fixes Verification Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
