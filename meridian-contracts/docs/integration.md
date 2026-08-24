# Integration Guide

This guide explains how to integrate PropChain smart contracts with frontend applications and other blockchain services.

## Prerequisites

- Node.js 16+ for frontend development
- Polkadot.js API for blockchain interaction
- Basic understanding of Web3 concepts

## Setup

### Install Dependencies

```bash
npm install @polkadot/api @polkadot/api-contract @polkadot/extension-dapp
```

### Connect to Blockchain

```javascript
import { ApiPromise, WsProvider } from '@polkadot/api';

const connect = async () => {
  const wsProvider = new WsProvider('ws://localhost:9944');
  const api = await ApiPromise.create({ provider: wsProvider });
  return api;
};
```

## Contract Interaction

### Load Contract

```javascript
import { ContractPromise } from '@polkadot/api-contract';

const loadContract = async (api, contractAddress, abi) => {
  const contract = new ContractPromise(api, abi, contractAddress);
  return contract;
};
```

### Register Property

```javascript
const registerProperty = async (contract, metadata) => {
  const { gasRequired } = await contract.query.registerProperty(
    account.address,
    { gasLimit: -1 },
    metadata
  );

  const tx = contract.tx.registerProperty(
    { gasLimit: gasRequired },
    metadata
  );

  await tx.signAndSend(account);
};
```

### Query Property

```javascript
const getProperty = async (contract, propertyId) => {
  const { result, output } = await contract.query.get_property(
    account.address,
    { gasLimit: -1 },
    propertyId
  );

  if (result.isOk) {
    return output.toHuman();
  }
  return null;
};
```

## Frontend Integration

### React Component Example

```jsx
import React, { useState, useEffect } from 'react';
import { useSubstrate } from './substrate-lib';

const PropertyRegistry = () => {
  const { api, account } = useSubstrate();
  const [contract, setContract] = useState(null);
  const [properties, setProperties] = useState([]);

  useEffect(() => {
    if (api && account) {
      loadContract();
    }
  }, [api, account]);

  const loadContract = async () => {
    // Load contract ABI and address
    const contract = await loadContract(api, contractAddress, abi);
    setContract(contract);
  };

  const handleRegisterProperty = async (metadata) => {
    await registerProperty(contract, metadata);
    // Refresh properties list
    loadProperties();
  };

  return (
    <div>
      <h2>Property Registry</h2>
      <PropertyForm onSubmit={handleRegisterProperty} />
      <PropertyList properties={properties} />
    </div>
  );
};
```

## Error Handling

### Common Error Types

```javascript
const handleContractError = (error) => {
  if (error.message.includes('PropertyNotFound')) {
    return 'Property not found';
  }
  if (error.message.includes('Unauthorized')) {
    return 'Not authorized to perform this action';
  }
  if (error.message.includes('InsufficientBalance')) {
    return 'Insufficient balance for this transaction';
  }
  return 'An unexpected error occurred';
};
```

### Transaction Status

```javascript
const sendTransaction = async (tx) => {
  try {
    const hash = await tx.signAndSend(account, ({ status }) => {
      if (status.isInBlock) {
        console.log(`Transaction included in block: ${status.asInBlock}`);
      } else if (status.isFinalized) {
        console.log(`Transaction finalized: ${status.asFinalized}`);
      }
    });
    return hash;
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
};
```

## Testing Integration

### Unit Tests

```javascript
import { render, screen, fireEvent } from '@testing-library/react';
import { PropertyRegistry } from './PropertyRegistry';

describe('PropertyRegistry', () => {
  test('registers property successfully', async () => {
    const mockContract = {
      tx: {
        registerProperty: jest.fn().mockReturnValue({
          signAndSend: jest.fn().mockResolvedValue('hash')
        })
      }
    };

    render(<PropertyRegistry contract={mockContract} />);
    
    fireEvent.click(screen.getByText('Register Property'));
    
    expect(mockContract.tx.registerProperty).toHaveBeenCalled();
  });
});
```

### Integration Tests

```javascript
describe('Contract Integration', () => {
  let api, contract;

  beforeAll(async () => {
    api = await connect();
    contract = await loadContract(api, testContractAddress, abi);
  });

  test('property registration flow', async () => {
    const metadata = {
      location: 'Test Location',
      size: 1000,
      valuation: 100000
    };

    const result = await registerProperty(contract, metadata);
    expect(result).toBeDefined();
  });
});
```

## Performance Optimization

### Batch Queries

```javascript
const batchQueryProperties = async (contract, propertyIds) => {
  const queries = propertyIds.map(id => 
    contract.query.get_property(account.address, { gasLimit: -1 }, id)
  );

  const results = await Promise.all(queries);
  return results.map(result => result.output.toHuman());
};
```

### Caching Strategy

```javascript
const useContractCache = (contract, method, ...args) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `${method}-${JSON.stringify(args)}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      setData(JSON.parse(cached));
      setLoading(false);
    } else {
      contract.query[method](account.address, { gasLimit: -1 }, ...args)
        .then(({ output }) => {
          const result = output.toHuman();
          localStorage.setItem(cacheKey, JSON.stringify(result));
          setData(result);
        })
        .finally(() => setLoading(false));
    }
  }, [contract, method, args]);

  return { data, loading };
};
```

## Security Best Practices

1. **Validate Inputs**: Always validate user inputs before sending to contract
2. **Secure Storage**: Use secure storage for private keys and sensitive data
3. **Rate Limiting**: Implement rate limiting for contract interactions
4. **Error Handling**: Never expose sensitive error information to users
5. **Transaction Confirmation**: Always confirm important transactions with users

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check if the blockchain node is running
2. **Contract Not Found**: Verify contract address and ABI
3. **Gas Limit Exceeded**: Increase gas limit for complex operations
4. **Account Locked**: Ensure account is unlocked in Polkadot.js extension

### Debug Tools

```javascript
// Enable debug logging
import { logger } from '@polkadot/util';
logger.setLevel('debug');

// Monitor contract events
contract.query.getEvents(account.address, { gasLimit: -1 })
  .then(({ output }) => {
    console.log('Contract events:', output.toHuman());
  });
```
