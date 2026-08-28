# Tutorial: Integrating with PropChain Insurance

This tutorial guides you through the process of integrating your application with the PropChain decentralized insurance platform.

## Prerequisites

- Access to a Substrate-based network with PropChain contracts deployed.
- Familiarity with the `PropertyInsurance` contract API.
- A property already registered in the `PropertyToken` contract.

## 1. Risk Assessment and Premium Calculation

Before creating a policy, you should calculate the expected premium for the property.

```rust
// Parameters: property_id, coverage_amount, coverage_type
let premium_calc = insurance.calculate_premium(
    property_id,
    500000, // $500,000 coverage
    CoverageType::Comprehensive
)?;

println!("Estimated Premium: ${}", premium_calc.premium_amount);
println!("Deductible: ${}", premium_calc.deductible);
```

## 2. Selecting a Risk Pool

Insurance policies are backed by risk pools. You must select an appropriate pool for your coverage type.

```rust
// List available risk pools for Comprehensive coverage
let pools = insurance.get_pools_by_coverage(CoverageType::Comprehensive);
let pool_id = pools[0].id;
```

## 3. Creating an Insurance Policy

Once the premium is calculated and a pool is selected, you can issue the policy.

```rust
let policy_id = insurance.create_policy(
    property_id,
    CoverageType::Comprehensive,
    500000,
    pool_id,
    31536000, // 1 year in seconds
    "ipfs://Qm...metadata"
)?;
```

Note: The user must have sufficient balance to pay the `premium_amount`.

## 4. Submitting a Claim

In the event of a covered loss, a claim can be submitted for the policy.

```rust
let claim_id = insurance.submit_claim(
    policy_id,
    10000, // Claim amount: $10,000
    "Fire damage in the kitchen",
    "ipfs://Qm...incident_report"
)?;
```

## 5. Claim Processing and Payout

Claims go through an assessment process (managed by automated oracles or authorized assessors). Once approved, the payout is processed automatically.

```rust
// Monitor claim status
let claim = insurance.get_claim(claim_id).unwrap();
match claim.status {
    ClaimStatus::Approved => println!("Claim approved, payout incoming!"),
    ClaimStatus::Rejected => println!("Claim rejected: {}", claim.rejection_reason),
    _ => println!("Claim pending assessment"),
}
```

## 6. Providing Liquidity (Optional)

Users can also participate as liquidity providers for risk pools to earn premiums.

```rust
// Deposit 10,000 tokens into the risk pool
insurance.provide_pool_liquidity(pool_id, 10000)?;
```

## Best Practices

- Always verify the `PropertyValuation` before setting coverage amounts.
- Ensure the policy duration aligns with the property's legal registration period.
- Regularly monitor `ClaimSubmitted` events for real-time tracking.
