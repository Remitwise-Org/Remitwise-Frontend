# PropChain Dynamic Fee and Market Mechanism

This contract implements **dynamic fees** and **market mechanisms** for the PropChain property registry (Issue #38).

## Features

### 1. Dynamic Fee Calculation
- **Congestion-based**: Fee scales with recent operation count (sliding window).
- **Demand-based**: Optional demand factor from recent volume.
- **Per-operation config**: Different base/min/max fees per operation type (`RegisterProperty`, `TransferProperty`, `CreateEscrow`, etc.).

Formula: `fee = base_fee * (1 + congestion_factor + demand_factor)`, clamped to `[min_fee, max_fee]`.

### 2. Automated Fee Adjustment
- **`update_fee_params()`**: Admin can trigger an update; logic adjusts `base_fee` up when congestion > 70%, down when < 30%.
- **`set_operation_config()`**: Admin sets custom `FeeConfig` per operation type.

### 3. Auction Mechanism for Premium Listings
- **`create_premium_auction(property_id, min_bid, duration_seconds)`**: Sellers create an auction; a fee is charged.
- **`place_bid(auction_id, amount)`**: Bidders place or outbid; highest bid wins.
- **`settle_auction(auction_id)`**: After `end_time`, anyone can settle; winner is `current_bidder`.

### 4. Incentives for Validators and Participants
- **Validators**: Admin adds via `add_validator(account)`; they receive a share of collected fees.
- **Distribution**: `distribute_fees()` splits `fee_treasury` between validators and treasury by configurable basis points (`validator_share_bp`, `treasury_share_bp`).
- **`claim_rewards()`**: Participants claim their pending rewards.

### 5. Fee Distribution and Reward Mechanisms
- Fees collected via `record_fee_collected(operation, amount, from)`.
- `distribute_fees()` allocates to validators and clears treasury.
- Reward history is stored for transparency.

### 6. Market-Based Price Discovery
- **`get_recommended_fee(operation)`**: Current recommended fee for an operation.
- **`get_fee_estimate(operation)`**: Returns `FeeEstimate` with `estimated_fee`, `min_fee`, `max_fee`, `congestion_level`, and a text `recommendation`.

### 7. Fee Optimization Recommendations
- **`get_fee_recommendations()`**: Returns a list of suggestions (e.g. batch operations when congestion is high, use auctions for premium listings).

### 8. Fee Transparency and Reporting
- **`get_fee_report()`**: Returns `FeeReport` with:
  - Current config, congestion index, recommended fee
  - Total fees collected, total distributed
  - Operation count (24h window), active premium auctions count, timestamp

## Integration with Property Registry

The main contract (`contracts/lib`) has:
- **`set_fee_manager(Option<AccountId>)`**: Admin sets the FeeManager contract address.
- **`get_fee_manager()`**: Returns the current fee manager address.
- **`get_dynamic_fee(FeeOperation)`**: If a fee manager is set, calls `get_recommended_fee(operation)` on the FeeManager; otherwise returns 0.

Frontends or off-chain logic can:
1. Call `get_dynamic_fee(operation)` before submitting a tx to show the user the current fee.
2. After a fee-charging operation, call `record_fee_collected(operation, amount, from)` on the FeeManager (if the registry forwards fees to it).

## Types (Exported)

- **`FeeOperation`**: Enum of operation types (in `propchain_traits`).
- **`FeeConfig`**: base_fee, min_fee, max_fee, congestion_sensitivity, demand_factor_bp, last_updated.
- **`FeeReport`**: Full snapshot for dashboards.
- **`FeeEstimate`**: Per-operation estimate with recommendation.
- **`PremiumAuction`**, **`AuctionBid`**, **`RewardRecord`**, **`RewardReason`**.

## Building and Tests

```bash
cargo build -p propchain-fees
cargo test -p propchain-fees
```

## Acceptance Criteria (Issue #38)

| Criterion | Implementation |
|-----------|----------------|
| Dynamic fee calculation based on network congestion and demand | `calculate_fee()`, `congestion_index()`, `demand_factor_bp()`, `compute_dynamic_fee()` |
| Automated fee adjustment algorithms | `update_fee_params()`, `set_operation_config()` |
| Auction mechanism for premium property listings | `create_premium_auction()`, `place_bid()`, `settle_auction()` |
| Incentive system for validators and participants | `add_validator()`, `distribute_fees()`, `claim_rewards()`, `pending_reward()` |
| Fee distribution and reward mechanisms | `distribute_fees()`, `set_distribution_rates()`, `reward_records` |
| Market-based price discovery for transaction fees | `get_recommended_fee()`, `get_fee_estimate()` |
| Fee optimization recommendations for users | `get_fee_recommendations()` |
| Fee transparency and reporting dashboard | `get_fee_report()`, `FeeReport` |
