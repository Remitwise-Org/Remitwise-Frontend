# Dependency Injection & Testing Guide

This document explains the dependency injection pattern and how to write unit tests without hitting real external services.

## Overview

The application uses dependency injection (DI) to enable proper unit testing by allowing mock implementations of external services like the database and Soroban RPC client.

## Architecture

### Core Components

1. **Interfaces** (`lib/types/clients.ts`)
   - `DbClient` - Database operations interface
   - `SorobanClient` - Soroban RPC operations interface
   - `ServiceContainer` - DI container interface

2. **DI Container** (`lib/di/container.ts`)
   - `container` - Global service container
   - `createTestContainer()` - Isolated test container
   - `isTestEnvironment()` - Environment detection

3. **Factories** (`lib/di/factories.ts`)
   - `createProductionDbClient()` - Real Prisma wrapper
   - `createMockDbClient()` - Test database mock
   - `createProductionSorobanClient()` - Real Soroban wrapper
   - `createMockSorobanClient()` - Test Soroban mock

4. **Services** (`lib/services/`)
   - Business logic classes that use injected dependencies
   - Example: `HealthService` uses both DbClient and SorobanClient

## Usage Patterns

### 1. Creating a Service with Dependencies

```typescript
// lib/services/my-service.ts
import { ServiceContainer } from '../types/clients';

export class MyService {
  constructor(private container: ServiceContainer) {}

  async someMethod() {
    const db = this.container.getDb();
    const soroban = this.container.getSoroban();
    
    // Use dependencies
    const user = await db.user.findUnique({ where: { id: '123' } });
    const ledger = await soroban.getLatestLedger();
    
    return { user, ledger };
  }
}
```

### 2. Using Services in API Routes

```typescript
// app/api/my-route/route.ts
import { container } from '@/lib/di/container';
import { MyService } from '@/lib/services/my-service';

export async function GET() {
  const service = new MyService(container);
  const result = await service.someMethod();
  
  return NextResponse.json(result);
}
```

### 3. Writing Unit Tests

```typescript
// tests/unit/my-service.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from '@/lib/services/my-service';
import { createTestContainer } from '@/lib/di/container';
import { createMockDbClient, createMockSorobanClient } from '@/lib/di/factories';

describe('MyService', () => {
  let container: ServiceContainer;
  let service: MyService;
  let mockDb: any;
  let mockSoroban: any;

  beforeEach(() => {
    // Create isolated test container
    container = createTestContainer();
    
    // Create mock clients
    mockDb = createMockDbClient();
    mockSoroban = createMockSorobanClient();
    
    // Inject mocks
    container.setDb(mockDb);
    container.setSoroban(mockSoroban);
    
    // Create service with injected dependencies
    service = new MyService(container);
  });

  it('should work with mocked dependencies', async () => {
    // Arrange - set up mock data
    mockDb.addUser({ id: '123', stellar_address: 'test' });
    mockSoroban.setLedgerSequence(99999);
    
    // Act - call the service
    const result = await service.someMethod();
    
    // Assert - verify results
    expect(result.user.id).toBe('123');
    expect(result.ledger.sequence).toBe(99999);
  });
});
```

## Mock Client Features

### Database Mock (`MockDbClient`)

```typescript
const mockDb = createMockDbClient();

// Add test data
mockDb.addUser({ stellar_address: 'test@example.com' });
mockDb.addUserPreference({ userId: '123', currency: 'USD' });

// Simulate failures
mockDb.setShouldFail(true);

// Reset for clean tests
mockDb.reset();
```

**Features:**
- In-memory storage for users and preferences
- CRUD operations that mirror Prisma API
- Failure simulation for error testing
- Health check query support
- Transaction simulation

### Soroban Mock (`MockSorobanClient`)

```typescript
const mockSoroban = createMockSorobanClient({
  networkPassphrase: 'Test Network',
  ledgerSequence: 12345,
  shouldFail: false
});

// Update state during tests
mockSoroban.setLedgerSequence(99999);
mockSoroban.setShouldFail(true);
```

**Features:**
- Configurable network parameters
- Ledger sequence manipulation
- Contract data simulation
- Transaction simulation
- Failure simulation

## Testing Best Practices

### 1. Isolation

Always use `createTestContainer()` for test isolation:

```typescript
// ✅ Good - isolated container
const container = createTestContainer();

// ❌ Bad - shared global container
const container = globalContainer;
```

### 2. Reset State

Reset mocks between tests:

```typescript
beforeEach(() => {
  mockDb.reset();
  mockSoroban.setShouldFail(false);
});
```

### 3. Test Both Success and Failure

```typescript
it('should handle success case', async () => {
  const result = await service.method();
  expect(result.success).toBe(true);
});

it('should handle database failure', async () => {
  mockDb.setShouldFail(true);
  const result = await service.method();
  expect(result.success).toBe(false);
});
```

### 4. Route Testing

For API routes, mock the container:

```typescript
// Mock the container in route tests
vi.mock('@/lib/di/container', async () => {
  const actual = await vi.importActual('@/lib/di/container');
  return {
    ...actual,
    container: actual.createTestContainer(),
  };
});
```

## Adding New Tests

### Step 1: Identify Dependencies

What external services does your code use?
- Database (Prisma)
- Soroban RPC
- External APIs
- File system

### Step 2: Create Interfaces (if needed)

Add new interfaces to `lib/types/clients.ts`:

```typescript
export interface ExternalApiClient {
  fetchData(id: string): Promise<any>;
  postData(data: any): Promise<any>;
}
```

### Step 3: Add to Container

Update `ServiceContainer` interface and container implementation:

```typescript
// lib/types/clients.ts
export interface ServiceContainer {
  getDb(): DbClient;
  getSoroban(): SorobanClient;
  getExternalApi(): ExternalApiClient; // New
  setExternalApi(client: ExternalApiClient): void; // New
}
```

### Step 4: Create Factories

Create production and mock implementations:

```typescript
// lib/di/external-api-factory.ts
export class ProductionExternalApiClient implements ExternalApiClient {
  async fetchData(id: string) {
    // Real API call
  }
}

export class MockExternalApiClient implements ExternalApiClient {
  async fetchData(id: string) {
    return { id, data: 'mock' };
  }
}
```

### Step 5: Write Tests

Follow the pattern shown in examples above.

## Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npm run test:unit -- health-service

# Run with coverage
npm run test:coverage
```

## Benefits

1. **No External Dependencies** - Tests run fast without network calls
2. **Deterministic** - Same results every run
3. **Isolated** - Tests don't interfere with each other
4. **Comprehensive** - Can test success/failure scenarios
5. **Fast** - In-memory operations only

## Migration Guide

To migrate existing code to use DI:

1. **Identify direct dependencies** (Prisma, Soroban client)
2. **Extract to service classes** with constructor injection
3. **Update API routes** to use the service
4. **Add unit tests** with mock implementations
5. **Remove integration tests** for simple CRUD (covered by unit tests)

This pattern ensures your code is testable, maintainable, and reliable.
