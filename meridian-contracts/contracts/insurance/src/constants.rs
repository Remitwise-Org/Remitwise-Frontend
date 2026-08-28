/// Minimum premium accepted for a new policy (in contract token units).
pub const MIN_PREMIUM: u128 = 1_000;

/// Maximum coverage payout for a single claim.
pub const MAX_COVERAGE: u128 = 1_000_000;

/// Default cooldown period between claims, in blocks.
pub const CLAIM_COOLDOWN_BLOCKS: u32 = 100;

/// Maximum number of active policies allowed per account.
pub const MAX_POLICIES_PER_ACCOUNT: u32 = 10;

/// Percentage fee taken from each premium deposit (basis points: 100 = 1%).
pub const PREMIUM_FEE_BPS: u32 = 200;

/// Minimum pool liquidity required before claims can be paid out.
pub const MIN_POOL_LIQUIDITY: u128 = 10_000;
