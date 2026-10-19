# Governance Proposal Diff View

## Overview

The governance proposal diff view provides a visual comparison between current and proposed parameter sets for governance proposals. This feature helps operators, downstream contracts, frontend engineers, and support teams understand exactly what changes a proposal would make before execution.

## Features

- **Visual Parameter Comparison**: Side-by-side display of current vs proposed values for all split percentage parameters
- **Change Indicators**: Color-coded badges showing increases (green) and decreases (red) with percentage changes
- **Progressive Change Bars**: Visual representation of the magnitude of changes
- **Summary Statistics**: Quick overview of how many parameters are being changed
- **Floating Point Tolerance**: Handles small floating-point differences (≤ 0.01) as no-change to avoid noise

## Components

### ParameterDiffView Component

Location: `@/components/governance/ParameterDiffView`

A React component that renders a diff view for split percentage changes.

**Props:**
- `currentParameters: SplitPercentages` - The current parameter set
- `proposedParameters: SplitPercentages` - The proposed parameter set  
- `className?: string` - Optional CSS class for styling

**Example Usage:**
```tsx
import ParameterDiffView from '@/components/governance/ParameterDiffView';
import type { SplitPercentages } from '@/lib/validation/percentages';

const current: SplitPercentages = { spending: 50, savings: 25, bills: 15, insurance: 10 };
const proposed: SplitPercentages = { spending: 40, savings: 30, bills: 20, insurance: 10 };

<ParameterDiffView currentParameters={current} proposedParameters={proposed} />
```

### Governance Types

Location: `@/lib/governance/types`

Type definitions and utility functions for governance proposals.

**Types:**
- `ProposalStatus`: Union type for proposal states ('pending' | 'active' | 'executed' | 'rejected' | 'expired')
- `GovernanceProposal`: Interface representing a governance proposal with metadata
- `ParameterChange`: Interface representing a single parameter's change details

**Utility Functions:**
- `calculateParameterDiff(current, proposed)`: Calculates differences between parameter sets
- `hasChanges(current, proposed)`: Checks if there are meaningful changes between parameter sets

## Integration

### Admin Panel Integration

The diff view is integrated into the admin panel (`app/admin/page.tsx`) as a demo feature. Users can toggle the "Show Proposal Demo" button to see an example of how parameter changes would be displayed.

**Demo Data:**
- Current: `{ spending: 50, savings: 25, bills: 15, insurance: 10 }`
- Proposed: `{ spending: 40, savings: 30, bills: 20, insurance: 10 }`

This demonstrates:
- Spending decrease from 50% to 40% (-20%)
- Savings increase from 25% to 30% (+20%)
- Bills increase from 15% to 20% (+33.3%)
- Insurance unchanged at 10%

## Testing

### Unit Tests

Location: `tests/unit/governance/types.test.ts`

Tests for governance type utilities:
- Parameter difference calculation accuracy
- Zero value handling (division by zero protection)
- All parameter keys inclusion
- Change detection with tolerance thresholds

Location: `tests/unit/components/governance/ParameterDiffView.test.tsx`

Tests for the ParameterDiffView component:
- Rendering of parameter changes
- Current and proposed value display
- Increase/decrease indicators
- No-change state handling
- Summary statistics display
- Custom className application
- Floating point precision handling

## Design Decisions

### Floating Point Tolerance

The system uses a tolerance of 0.01 when comparing parameter values. This prevents false positives from floating-point arithmetic errors while still catching meaningful changes.

### Color Coding

- **Green**: Increases in parameter values
- **Red**: Decreases in parameter values
- **Gray**: No change or changes within tolerance

### Parameter Labels

Each parameter has a human-readable label:
- Spending: "Spending"
- Savings: "Savings"
- Bills: "Bills"
- Insurance: "Insurance"

## Future Enhancements

Potential improvements for the governance diff view:

1. **Real-time Integration**: Connect to actual governance proposal API endpoints
2. **Historical Comparisons**: Show parameter changes across multiple proposal versions
3. **Impact Analysis**: Calculate and display the financial impact of parameter changes
4. **Voting Integration**: Display proposal voting status alongside parameter changes
5. **Export Functionality**: Allow exporting diff views as PDF or images for documentation

## API Integration

When integrating with a real governance system, the following API endpoints would be needed:

- `GET /api/governance/proposals` - List all governance proposals
- `GET /api/governance/proposals/:id` - Get specific proposal details
- `POST /api/governance/proposals` - Create new governance proposal
- `GET /api/split/current` - Get current split configuration
- `POST /api/governance/proposals/:id/execute` - Execute a governance proposal

## Accessibility

The diff view component includes:
- Semantic HTML structure with proper headings
- Screen reader-friendly change indicators
- High-contrast color combinations for readability
- Keyboard-navigable interactive elements
- ARIA labels where appropriate

## Performance Considerations

- Component is optimized for re-rendering with stable prop references
- Change calculations are memoized where appropriate
- No heavy computations in render paths
- Efficient DOM updates with React's reconciliation
