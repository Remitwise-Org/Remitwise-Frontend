import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import PrintReceiptTemplate from '@/components/PrintReceiptTemplate';

describe('PrintReceiptTemplate - Print Statement CSS Boundaries', () => {
  it('renders correctly at boundary conditions without crashing', () => {
    fc.assert(
      fc.property(
        fc.string({ maxLength: 300 }), // txHash
        fc.string({ maxLength: 300 }), // currency
        fc.string({ maxLength: 300 }), // recipientName
        fc.string({ maxLength: 300 }), // recipientAddress
        fc.string({ maxLength: 300 }), // senderName
        fc.string({ maxLength: 300 }), // senderAddress
        fc.float({ noNaN: true, noDefaultInfinity: true }), // amount
        (txHash, currency, recipientName, recipientAddress, senderName, senderAddress, amount) => {
          const { unmount } = render(
            <PrintReceiptTemplate
              txHash={txHash}
              amount={amount}
              currency={currency}
              recipientName={recipientName}
              recipientAddress={recipientAddress}
              senderName={senderName}
              senderAddress={senderAddress}
              date="2025-01-01 12:00"
            />
          );
          
          // The component should render the core RemitWise title
          expect(screen.getByText('RemitWise')).toBeInTheDocument();
          
          // Cleanup to prevent memory leaks in fast-check loops
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });
});
