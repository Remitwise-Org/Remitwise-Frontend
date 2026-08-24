# Property Valuation Oracle

The Property Valuation Oracle provides real-time property valuations for the PropChain ecosystem using multiple data sources and advanced aggregation algorithms.

## Features

- **Multi-Source Price Feeds**: Integrates with Chainlink, Pyth, and custom price feeds
- **Price Aggregation**: Weighted average with outlier detection and confidence scoring
- **Historical Tracking**: Maintains price history and volatility metrics
- **Automated Valuation Models (AVM)**: Comparable property analysis
- **Location-Based Adjustments**: Geographic market adjustments
- **Price Alert System**: Notifications for significant valuation changes
- **Fallback Mechanisms**: Redundant oracle sources for reliability
- **Oracle Reputation System**: Performance tracking and automated source management
- **Slashing System**: Stake-based penalties for malicious or inaccurate data
- **Gas-Efficient Batching**: Support for multiple property valuation requests in a single transaction
- **Anomaly Detection**: Advanced validation logic to detect market outliers

## Architecture

### Core Components

1. **Price Feed Management**: Configurable oracle sources with different weights
2. **Aggregation Engine**: Statistical algorithms for price consolidation
3. **Historical Database**: Time-series data storage and analysis
4. **Alert System**: Event-driven notifications
5. **AVM Engine**: Comparable sales analysis

### Supported Oracle Types

- **Chainlink**: Decentralized price feeds for traditional assets
- **Pyth**: High-frequency price feeds from multiple sources
- **Custom**: Proprietary or specialized price feeds
- **Manual**: Administrative price updates for exceptional cases

## API Reference

### Core Functions

#### `get_property_valuation(property_id: u64) -> Result<PropertyValuation, OracleError>`
Retrieves the current valuation for a property.

#### `get_valuation_with_confidence(property_id: u64) -> Result<ValuationWithConfidence, OracleError>`
Gets valuation with volatility and confidence interval data.

#### `update_valuation_from_sources(property_id: u64) -> Result<(), OracleError>`
Triggers valuation update from all active oracle sources.

#### `get_historical_valuations(property_id: u64, limit: u32) -> Vec<PropertyValuation>`
Returns historical valuations (most recent first).

#### `set_price_alert(property_id: u64, threshold_percentage: u32, alert_address: AccountId)`
Sets up alerts for price changes exceeding the threshold.

#### `request_property_valuation(property_id: u64) -> Result<u64, OracleError>`
Initiates a new valuation request for a property.

#### `batch_request_valuations(property_ids: Vec<u64>) -> Result<Vec<u64>, OracleError>`
Batch requests valuations for multiple properties efficiently.

### Administrative Functions

#### `add_oracle_source(source: OracleSource) -> Result<(), OracleError>`
Adds a new price feed source (admin only).

#### `set_location_adjustment(adjustment: LocationAdjustment) -> Result<(), OracleError>`
Configures location-based valuation adjustments (admin only).

#### `update_market_trend(trend: MarketTrend) -> Result<(), OracleError>`
Updates market trend data for volatility calculations (admin only).

#### `update_source_reputation(source_id: String, success: bool) -> Result<(), OracleError>`
Manages oracle source reputation scores (admin only).

#### `slash_source(source_id: String, penalty: u128) -> Result<(), OracleError>`
Slashes staked funds for underperforming or malicious sources (admin only).

## Data Structures

### PropertyValuation
```rust
struct PropertyValuation {
    property_id: u64,
    valuation: u128,           // USD with 8 decimals
    confidence_score: u32,     // 0-100
    sources_used: u32,
    last_updated: u64,
    valuation_method: ValuationMethod,
}
```

### ValuationWithConfidence
```rust
struct ValuationWithConfidence {
    valuation: PropertyValuation,
    volatility_index: u32,        // 0-100
    confidence_interval: (u128, u128), // Min/Max range
    outlier_sources: u32,
}
```

### OracleSource
```rust
struct OracleSource {
    id: String,
    source_type: OracleSourceType,
    address: AccountId,
    is_active: bool,
    weight: u32,          // 0-100
    last_updated: u64,
}
```

## Usage Examples

### Basic Valuation Query
```rust
// Get current property valuation
let valuation = oracle.get_property_valuation(property_id)?;

// Check confidence score
if valuation.confidence_score > 80 {
    println!("High confidence valuation: ${}", valuation.valuation);
}
```

### Setting Up Price Alerts
```rust
// Alert on 5% price changes
oracle.set_price_alert(property_id, 5, alert_recipient_address)?;
```

### Adding Oracle Sources
```rust
// Add Chainlink price feed
let chainlink_source = OracleSource {
    id: "chainlink_usd_feed".to_string(),
    source_type: OracleSourceType::Chainlink,
    address: chainlink_feed_address,
    is_active: true,
    weight: 60,
    last_updated: timestamp,
};
oracle.add_oracle_source(chainlink_source)?;
```

### Market Analysis
```rust
// Get market volatility
let volatility = oracle.get_market_volatility(
    PropertyType::Residential,
    "NYC".to_string()
)?;

// Find comparable properties
let comparables = oracle.get_comparable_properties(property_id, 5);
```

## Security Considerations

- **Access Control**: Administrative functions restricted to contract owner
- **Price Validation**: Staleness checks and outlier detection
- **Fallback Mechanisms**: Multiple oracle sources prevent single points of failure
- **Rate Limiting**: Prevents oracle manipulation through rapid updates

## Integration with Property Registry

The oracle integrates seamlessly with the PropertyRegistry contract to provide real-time valuations for property transactions, mortgage calculations, and investment decisions.

## Testing

Run the comprehensive test suite:
```bash
cargo test -p propchain-oracle
```

## Deployment

1. Deploy the oracle contract
2. Configure oracle sources (Chainlink, Pyth, etc.)
3. Set location adjustments and market trends
4. Integrate with PropertyRegistry

## Future Enhancements

- **AI-Powered AVM**: Machine learning models for valuation
- **Real-Time Market Data**: Integration with additional data sources
- **Cross-Chain Oracles**: Multi-chain price feed aggregation
- **DeFi Integration**: Automated lending protocols