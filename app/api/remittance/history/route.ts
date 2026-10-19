import { NextRequest } from 'next/server';
import { validatePaginationParams, paginateData, PaginatedResult } from '../../../../lib/utils/pagination';
import { requireAuth } from '@/lib/session';

// Mock data structure for transaction history - in a real app this would come from a contract or database
interface Transaction {
  id: string;
  senderId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled';
  type: 'remittance' | 'payment' | 'transfer' | 'withdrawal';
  description: string;
  timestamp: string;
  fees?: number;
  exchangeRate?: number;
}

// Mock data - in a real app this would come from a contract or database
const mockTransactions: Transaction[] = [
  { id: '1', senderId: 'user1', recipientId: 'user2', amount: 250.00, currency: 'USD', status: 'completed', type: 'remittance', description: 'Monthly allowance', timestamp: '2024-01-15T10:30:00Z', fees: 2.50, exchangeRate: 1.0 },
  { id: '2', senderId: 'user3', recipientId: 'user4', amount: 150.00, currency: 'EUR', status: 'completed', type: 'remittance', description: 'Business payment', timestamp: '2024-01-14T14:22:00Z', fees: 1.75, exchangeRate: 1.08 },
  { id: '3', senderId: 'user5', recipientId: 'user6', amount: 50.00, currency: 'GBP', status: 'completed', type: 'remittance', description: 'Gift money', timestamp: '2024-01-13T09:15:00Z', fees: 0.99, exchangeRate: 1.25 },
  { id: '4', senderId: 'user7', recipientId: 'user8', amount: 1000.00, currency: 'USD', status: 'completed', type: 'remittance', description: 'Rent payment', timestamp: '2024-01-12T16:45:00Z', fees: 5.00, exchangeRate: 1.0 },
  { id: '5', senderId: 'user9', recipientId: 'user10', amount: 75.50, currency: 'USD', status: 'pending', type: 'remittance', description: 'Birthday gift', timestamp: '2024-01-16T11:20:00Z', fees: 1.25, exchangeRate: 1.0 },
  { id: '6', senderId: 'user11', recipientId: 'user12', amount: 300.00, currency: 'EUR', status: 'completed', type: 'remittance', description: 'Loan repayment', timestamp: '2024-01-11T13:30:00Z', fees: 2.20, exchangeRate: 1.08 },
  { id: '7', senderId: 'user13', recipientId: 'user14', amount: 200.00, currency: 'USD', status: 'failed', type: 'remittance', description: 'Test transfer', timestamp: '2024-01-10T08:45:00Z', fees: 1.50, exchangeRate: 1.0 },
  { id: '8', senderId: 'user15', recipientId: 'user16', amount: 450.75, currency: 'GBP', status: 'completed', type: 'remittance', description: 'Consulting fee', timestamp: '2024-01-09T15:20:00Z', fees: 3.75, exchangeRate: 1.25 },
  { id: '9', senderId: 'user17', recipientId: 'user18', amount: 80.00, currency: 'USD', status: 'completed', type: 'remittance', description: 'Dinner cost', timestamp: '2024-01-08T19:30:00Z', fees: 0.80, exchangeRate: 1.0 },
  { id: '10', senderId: 'user19', recipientId: 'user20', amount: 1200.00, currency: 'EUR', status: 'completed', type: 'remittance', description: 'Property deposit', timestamp: '2024-01-07T12:10:00Z', fees: 12.00, exchangeRate: 1.08 },
];

export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    // Extract pagination parameters from query
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const cursorParam = url.searchParams.get('cursor');

    const paginationParams = {
      limit: limitParam ? parseInt(limitParam, 10) : undefined,
      cursor: cursorParam || undefined,
    };

    const { limit, cursor } = validatePaginationParams(paginationParams);

    // In a real implementation, this would fetch from a contract or database
    // For now, we'll paginate the mock data in memory
    const paginatedResult: PaginatedResult<Transaction> = paginateData(
      mockTransactions,
      limit,
      (item) => item.id,
      cursor
    );

    return Response.json(paginatedResult);
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching transaction history:', error);
    return Response.json({ error: 'Failed to fetch transaction history' }, { status: 500 });
  }
}

// POST handler for creating transactions (future use)
export async function POST(request: NextRequest) {
  try {
    await requireAuth();

    const body = await request.json();
    
    // In a real implementation, this would create a transaction via contract or database
    const newTransaction: Transaction = {
      id: Date.now().toString(), // In real app, use proper ID generation
      senderId: body.senderId,
      recipientId: body.recipientId,
      amount: body.amount,
      currency: body.currency,
      status: body.status || 'pending',
      type: body.type || 'remittance',
      description: body.description,
      timestamp: new Date().toISOString(),
      fees: body.fees,
      exchangeRate: body.exchangeRate,
    };

    return Response.json(newTransaction, { status: 201 });
  } catch (error) {
    if (error instanceof Response && error.status === 401) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating transaction:', error);
    return Response.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}
