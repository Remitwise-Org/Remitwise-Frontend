# Dynamic Fee and Market Mechanism

This document describes the **Dynamic Fee and Market Mechanism** (Issue #38) for PropChain: congestion-based fees, premium listing auctions, validator incentives, and fee transparency.

## Overview

The system consists of:

1. **FeeManager contract** (`contracts/fees`): Standalone contract that implements dynamic fee calculation, premium auctions, reward distribution, and reporting.
2. **PropertyRegistry integration** (`contracts/lib`): Optional `fee_manager` address; when set, the registry exposes `get_dynamic_fee(operation)` by calling the FeeManager.

## Dynamic Fee Calculation

Fees are computed from:

- **Base fee** per operation type (configurable)
- **Congestion index** (0–100): Derived from recent operation count in a time window. Higher congestion increases the fee.
- **Demand factor**: Optional basis-point adjustment from recent volume.

Formula:  
`fee = clamp(base_fee * (1 + congestion_bp + demand_bp) / 10000, min_fee, max_fee)`.

Operations supported: `RegisterProperty`, `TransferProperty`, `UpdateMetadata`, `CreateEscrow`, `ReleaseEscrow`, `PremiumListingBid`, `IssueBadge`, `OracleUpdate`.

## Automated Fee Adjustment

- **`update_fee_params()`** (admin): Adjusts default `base_fee` from recent congestion (e.g. increase when congestion > 70%, decrease when < 30%).
- **`set_operation_config(operation, config)`** (admin): Sets a custom `FeeConfig` (base_fee, min_fee, max_fee, sensitivity) per operation type.

## Auction Mechanism for Premium Listings

- **Create**: `create_premium_auction(property_id, min_bid, duration_seconds)` — seller pays a fee; auction is created with `end_time`.
- **Bid**: `place_bid(auction_id, amount)` — bid must be ≥ min_bid and > current_bid.
- **Settle**: `settle_auction(auction_id)` — callable after `end_time`; winner is the current highest bidder. Settlement is permissionless.

Auction state: `property_id`, `seller`, `min_bid`, `current_bid`, `current_bidder`, `end_time`, `settled`, `fee_paid`.

## Incentives and Fee Distribution

- **Validators**: Admin registers validators via `add_validator(account)`. They receive a share of collected fees.
- **Distribution rates**: `validator_share_bp` and `treasury_share_bp` (basis points) define how `fee_treasury` is split when **`distribute_fees()`** is called.
- **Rewards**: Distributed amounts are credited as pending rewards; participants call **`claim_rewards()`** to receive them (actual token transfer would be wired by the runtime or a separate payout contract).

## Market-Based Price Discovery

- **`get_recommended_fee(operation)`**: Current recommended fee for that operation (used by registry’s `get_dynamic_fee` when fee manager is set).
- **`get_fee_estimate(operation)`**: Returns a **FeeEstimate** (estimated_fee, min_fee, max_fee, congestion_level, recommendation text) for UX and optimization.

## Fee Transparency and Reporting

- **`get_fee_report()`**: Returns a **FeeReport** (config, congestion_index, recommended_fee, total_fees_collected, total_distributed, operation_count_24h, premium_auctions_active, timestamp) for dashboards and analytics.
- **`get_fee_recommendations()`**: Returns a list of text recommendations (e.g. “use batch operations when congestion is high”).

## Property Registry Integration

| Message | Description |
|--------|-------------|
| `set_fee_manager(Option<AccountId>)` | Admin sets or clears the FeeManager contract address. |
| `get_fee_manager()` | Returns the current fee manager address. |
| `get_dynamic_fee(FeeOperation)` | If fee manager is set, calls `get_recommended_fee(operation)` on it; otherwise returns 0. |

## Files

- **Contract**: `contracts/fees/src/lib.rs` — FeeManager logic, auctions, distribution, reporting.
- **Traits**: `contracts/traits/src/lib.rs` — `FeeOperation` enum and `DynamicFeeProvider` trait.
- **Registry**: `contracts/lib/src/lib.rs` — `fee_manager` storage, `set_fee_manager`, `get_fee_manager`, `get_dynamic_fee`.
- **Tests**: `contracts/fees/src/lib.rs` (inline tests), `contracts/lib/src/tests.rs` (fee_manager and get_dynamic_fee tests).
- **Docs**: `contracts/fees/README.md`, this file.

## Acceptance Criteria Checklist

- [x] Design dynamic fee calculation based on network congestion and demand  
- [x] Implement automated fee adjustment algorithms  
- [x] Add auction mechanism for premium property listings  
- [x] Create incentive system for network validators and participants  
- [x] Implement fee distribution and reward mechanisms  
- [x] Add market-based price discovery for transaction fees  
- [x] Include fee optimization recommendations for users  
- [x] Provide fee transparency and reporting dashboard (data via `get_fee_report()`)  
