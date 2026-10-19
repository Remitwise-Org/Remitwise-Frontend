# Contract Cache Module

In-memory LRU cache for Soroban smart contract read operations.

## Quick Start

### Using Cached Contract Methods

```typescript
// Import from cached wrapper (not original contract)
import { getSplit } from '@/lib/contracts/remittance-split-cached';
import { getActivePolicies } from '@/lib/contracts/insurance-cached';

// Use normally - caching is automatic
const config = await getSplit('testnet');
const policies = await getActivePolicies(owner);
```

### Manual Cache Control

```typescript
import { 
  invalidate, 
  invalidatePattern, 
  clearCache,
  getCacheStats 
} from '@/lib/cache/contract-cache';

// Invalidate specific entry
invalidate('INSURANCE_CONTRACT', 'getActivePolicies', { owner: 'GXXX...' });

// Invalidate by pattern
invalidatePattern('INSURANCE_CONTRACT:getActivePolicies');

// Clear all
clearCache();

// Get stats
const stats = getCacheStats();
console.log(`Cache size: ${stats.size}/${stats.maxSize}`);
```

## Configuration

### TTL Values (in seconds)

| Method | TTL | Location |
|--------|-----|----------|
| getSplit | 60s | `CACHE_TTL.getSplit` |
| getActivePolicies | 45s | `CACHE_TTL.getActivePolicies` |
| getGoals | 30s | `CACHE_TTL.getGoals` |
| getBills | 30s | `CACHE_TTL.getBills` |

Edit `lib/cache/contract-cache.ts` to modify TTL values.

### Cache Size

Default: 500 entries

```typescript
// In contract-cache.ts
const CACHE_MAX_SIZE = 500;
```

## API Endpoint

### POST /api/cache/invalidate

Invalidate cache entries (for testing/debugging).

**Clear all:**
```bash
curl -X POST http://localhost:3000/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"clearAll": true}'
```

**By pattern:**
```bash
curl -X POST http://localhost:3000/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"pattern": "INSURANCE_CONTRACT"}'
```

### GET /api/cache/invalidate

Get cache statistics.

```bash
curl http://localhost:3000/api/cache/invalidate
```

## Adding Cache to New Contracts

1. **Create cached wrapper** (`lib/contracts/your-contract-cached.ts`):

```typescript
import { cachedContractCall, CONTRACT_IDS, CACHE_TTL } from '@/lib/cache/contract-cache';
import * as originalContract from './your-contract';

export async function getYourData(owner: string) {
  return cachedContractCall(
    CONTRACT_IDS.YOUR_CONTRACT,
    'getYourData',
    { owner },
    30, // TTL in seconds
    async () => await originalContract.getYourData(owner)
  );
}
```

2. **Update imports in API routes**:

```typescript
// Change from:
import { getYourData } from '@/lib/contracts/your-contract';

// To:
import { getYourData } from '@/lib/contracts/your-contract-cached';
```

## Cache Invalidation Strategy

### When to Invalidate

- After successful transaction submission
- On transaction confirmation
- On user-initiated refresh

### Example

```typescript
// After user submits transaction
const xdr = await buildAddToGoalTx(caller, goalId, amount);
await submitTransaction(xdr);

// Invalidate affected cache entries
invalidate('SAVINGS_GOALS_CONTRACT', 'getGoals', { owner: caller });
```

## Files

- `contract-cache.ts` - Core cache implementation
- `../contracts/*-cached.ts` - Cached wrappers for each contract
- `../../app/api/cache/invalidate/route.ts` - Cache management API
- `../../docs/CACHING_STRATEGY.md` - Detailed documentation

## Notes

- **Read operations only**: Write operations (buildXxxTx) are NOT cached
- **In-memory**: Cache is per Node.js process (not shared across instances)
- **Automatic expiration**: Entries expire after TTL
- **LRU eviction**: Least recently used entries are removed when cache is full

For detailed documentation, see [CACHING_STRATEGY.md](../../docs/CACHING_STRATEGY.md).
