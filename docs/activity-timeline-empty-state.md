# Activity Timeline Empty State Documentation

This document describes the design, implementation, and behavior of the empty state in the Activity Timeline (Remittance Trend Chart) widget.

## Overview
When a user has no transfer activity recorded in the system, displaying a blank timeline panel creates a confusing experience. To resolve this, the empty state now renders a premium, highly descriptive message combined with an interactive primary CTA.

## Component Details
- **Component**: `RemittanceTrendChart` (`components/Insights/remittanceTrendChart.tsx`)
- **Child Component Used**: `WidgetEmptyState` (`components/ui/WidgetEmptyState.tsx`)

## Empty State Layout
When the `data` array prop passed to `<RemittanceTrendChart />` is empty:
1. **Illustration/Icon**: A clean red circular icon housing the `Activity` logo from Lucide.
2. **Short Copy**:
   - **Title**: `"No activity timeline"`
   - **Description**: `"Your remittance trend timeline will appear here once you send money."`
3. **Primary CTA**:
   - **Label**: `"Send money"`
   - **Target**: `/send` (redirects user to the send flow)

## Verification & Testing
- Unit tests in `components/Insights/remittanceTrendChart.test.tsx` verify:
  - Graceful rendering of the empty state when `data={[]}` is passed.
  - Absence of NaN or Infinity values.
  - Retention of the `sr-only` accessible screen-reader summary in the empty state.
