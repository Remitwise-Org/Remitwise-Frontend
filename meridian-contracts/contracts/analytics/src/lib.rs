#![cfg_attr(not(feature = "std"), no_std)]
#![allow(unexpected_cfgs)]
#![allow(clippy::new_without_default)]

//! Analytics contract for portfolio and market metrics aggregation.


use ink::prelude::string::String;
use ink::prelude::vec::Vec;

#[ink::contract]
mod propchain_analytics {
    use super::*;

    /// Market metrics representing aggregated property data.
    #[derive(
        Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct MarketMetrics {
        pub average_price: u128,
        pub total_volume: u128,
        pub properties_listed: u64,
    }

    /// Portfolio performance for an individual owner.
    #[derive(
        Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    #[allow(dead_code)]
    pub struct PortfolioPerformance {
        pub total_value: u128,
        pub property_count: u64,
        pub recent_transactions: u64,
    }

    /// Trend analysis with historical data.
    #[derive(
        Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct MarketTrend {
        pub period_start: u64,
        pub period_end: u64,
        pub price_change_percentage: i32,
        pub volume_change_percentage: i32,
    }

    /// User behavior analytics for a specific account.
    #[derive(
        Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    #[allow(dead_code)]
    pub struct UserBehavior {
        pub account: AccountId,
        pub total_interactions: u64,
        pub preferred_property_type: String,
        pub risk_score: u8,
    }

    /// Market Report.
    #[derive(
        Debug, Clone, PartialEq, scale::Encode, scale::Decode, ink::storage::traits::StorageLayout,
    )]
    #[cfg_attr(feature = "std", derive(scale_info::TypeInfo))]
    pub struct MarketReport {
        pub generated_at: u64,
        pub metrics: MarketMetrics,
        pub trend: MarketTrend,
        pub insights: String,
    }

    #[ink(storage)]
    pub struct AnalyticsDashboard {
        /// Administrator of the analytics dashboard
        admin: AccountId,
        /// Current market metrics
        current_metrics: MarketMetrics,
        /// Historical market trends
        historical_trends: ink::storage::Mapping<u64, MarketTrend>,
        /// Trend count
        trend_count: u64,
    }

    impl AnalyticsDashboard {
        /// Create an analytics dashboard with zeroed market metrics and caller as admin.
        #[ink(constructor)]
        pub fn new() -> Self {
            let caller = Self::env().caller();
            Self {
                admin: caller,
                current_metrics: MarketMetrics {
                    average_price: 0,
                    total_volume: 0,
                    properties_listed: 0,
                },
                historical_trends: ink::storage::Mapping::default(),
                trend_count: 0,
            }
        }

        /// Implement property market metrics calculation (average price, volume, etc.)
        #[ink(message)]
        pub fn get_market_metrics(&self) -> MarketMetrics {
            self.current_metrics.clone()
        }

        /// Replace the current market aggregate values; only the admin can update them.
        #[ink(message)]
        pub fn update_market_metrics(
            &mut self,
            average_price: u128,
            total_volume: u128,
            properties_listed: u64,
        ) {
            self.ensure_admin();
            self.current_metrics = MarketMetrics {
                average_price,
                total_volume,
                properties_listed,
            };
        }

        /// Create market trend analysis with historical data
        #[ink(message)]
        pub fn add_market_trend(&mut self, trend: MarketTrend) {
            self.ensure_admin();
            self.historical_trends.insert(self.trend_count, &trend);
            self.trend_count += 1;
        }

        /// Return all stored market trend records in insertion order.
        #[ink(message)]
        pub fn get_historical_trends(&self) -> Vec<MarketTrend> {
            let mut trends = Vec::new();
            for i in 0..self.trend_count {
                if let Some(trend) = self.historical_trends.get(i) {
                    trends.push(trend);
                }
            }
            trends
        }

        /// Create automated market reports generation
        #[ink(message)]
        pub fn generate_market_report(&self) -> MarketReport {
            let latest_trend = if self.trend_count > 0 {
                self.historical_trends
                    .get(self.trend_count - 1)
                    .unwrap_or(MarketTrend {
                        period_start: 0,
                        period_end: 0,
                        price_change_percentage: 0,
                        volume_change_percentage: 0,
                    })
            } else {
                MarketTrend {
                    period_start: 0,
                    period_end: 0,
                    price_change_percentage: 0,
                    volume_change_percentage: 0,
                }
            };

            MarketReport {
                generated_at: self.env().block_timestamp(),
                metrics: self.current_metrics.clone(),
                trend: latest_trend,
                insights: String::from(
                    "Market is relatively stable. Gas optimization is recommended.",
                ),
            }
        }

        /// Add gas usage optimization recommendations
        #[ink(message)]
        pub fn get_gas_optimization_recommendations(&self) -> String {
            String::from("Use batched operations and limit nested looping over dynamic collections (e.g. vectors). Store large items in Mappings instead of Vecs.")
        }

        /// Ensure only the admin can modify metrics
        fn ensure_admin(&self) {
            assert_eq!(
                self.env().caller(),
                self.admin,
                "Unauthorized: Analytics admin only"
            );
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[ink::test]
        fn market_metrics_defaults() {
            let contract = AnalyticsDashboard::new();
            let metrics = contract.get_market_metrics();
            assert_eq!(metrics.average_price, 0);
            assert_eq!(metrics.total_volume, 0);
            assert_eq!(metrics.properties_listed, 0);
        }

        #[ink::test]
        fn update_market_metrics_works() {
            let mut contract = AnalyticsDashboard::new();
            contract.update_market_metrics(1000, 5000, 10);
            let metrics = contract.get_market_metrics();
            assert_eq!(metrics.average_price, 1000);
            assert_eq!(metrics.total_volume, 5000);
            assert_eq!(metrics.properties_listed, 10);
        }

        #[ink::test]
        fn add_market_trend_works() {
            let mut contract = AnalyticsDashboard::new();
            let trend = MarketTrend {
                period_start: 100,
                period_end: 200,
                price_change_percentage: 5,
                volume_change_percentage: 10,
            };
            contract.add_market_trend(trend.clone());
            let trends = contract.get_historical_trends();
            assert_eq!(trends.len(), 1);
            assert_eq!(trends[0].price_change_percentage, 5);
        }

        #[ink::test]
        fn generate_market_report_works() {
            let contract = AnalyticsDashboard::new();
            let report = contract.generate_market_report();
            assert_eq!(report.metrics.average_price, 0);
            assert!(report.insights.contains("Gas optimization"));
        }
    }
}
