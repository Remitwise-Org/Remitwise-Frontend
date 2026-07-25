// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    anchorFlow: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  createPendingAnchorFlow,
  updateAnchorFlowStatusByTransactionId,
  getAnchorFlowsForUser,
  AnchorFlowStatus,
} from '@/lib/anchor/flow-store';

const mockPrisma = prisma as unknown as {
  anchorFlow: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('Anchor flow persistence store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a pending flow record in Prisma', async () => {
    mockPrisma.anchorFlow.create.mockResolvedValue({
      id: 'flow-1',
      type: 'deposit',
      userAddress: 'GABC123',
      amount: '42',
      currency: 'USD',
      destination: 'GDEST',
      anchorTransactionId: 'tx-1',
      anchorUrl: 'https://anchor.example.com/flow',
      status: 'pending',
      createdAt: new Date('2026-06-23T12:00:00.000Z'),
      updatedAt: new Date('2026-06-23T12:00:00.000Z'),
    });

    const flow = await createPendingAnchorFlow({
      type: 'deposit',
      userAddress: 'GABC123',
      amount: '42',
      currency: 'USD',
      destination: 'GDEST',
      anchorTransactionId: 'tx-1',
      anchorUrl: 'https://anchor.example.com/flow',
    });

    expect(mockPrisma.anchorFlow.create).toHaveBeenCalledWith({
      data: {
        type: 'deposit',
        userAddress: 'GABC123',
        amount: '42',
        currency: 'USD',
        destination: 'GDEST',
        anchorTransactionId: 'tx-1',
        anchorUrl: 'https://anchor.example.com/flow',
        status: 'pending',
      },
    });
    expect(flow).toEqual({
      id: 'flow-1',
      type: 'deposit',
      userAddress: 'GABC123',
      amount: '42',
      currency: 'USD',
      destination: 'GDEST',
      anchorTransactionId: 'tx-1',
      anchorUrl: 'https://anchor.example.com/flow',
      status: 'pending',
      createdAt: '2026-06-23T12:00:00.000Z',
      updatedAt: '2026-06-23T12:00:00.000Z',
    });
  });

  it('returns null when webhook update arrives for unknown transaction id', async () => {
    mockPrisma.anchorFlow.findUnique.mockResolvedValue(null);

    const result = await updateAnchorFlowStatusByTransactionId('missing-tx', 'completed');

    expect(mockPrisma.anchorFlow.findUnique).toHaveBeenCalledWith({
      where: { anchorTransactionId: 'missing-tx' },
    });
    expect(mockPrisma.anchorFlow.update).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('updates existing flow status by transaction id and returns the updated record', async () => {
    mockPrisma.anchorFlow.findUnique.mockResolvedValue({
      id: 'flow-1',
      type: 'withdraw',
      userAddress: 'GABC123',
      amount: '50',
      currency: 'USD',
      destination: null,
      anchorTransactionId: 'tx-2',
      anchorUrl: null,
      status: 'pending',
      createdAt: new Date('2026-06-23T13:00:00.000Z'),
      updatedAt: new Date('2026-06-23T13:00:00.000Z'),
    });
    mockPrisma.anchorFlow.update.mockResolvedValue({
      id: 'flow-1',
      type: 'withdraw',
      userAddress: 'GABC123',
      amount: '50',
      currency: 'USD',
      destination: null,
      anchorTransactionId: 'tx-2',
      anchorUrl: null,
      status: 'completed',
      createdAt: new Date('2026-06-23T13:00:00.000Z'),
      updatedAt: new Date('2026-06-23T13:05:00.000Z'),
    });

    const result = await updateAnchorFlowStatusByTransactionId('tx-2', 'completed');

    expect(mockPrisma.anchorFlow.findUnique).toHaveBeenCalledWith({
      where: { anchorTransactionId: 'tx-2' },
    });
    expect(mockPrisma.anchorFlow.update).toHaveBeenCalledWith({
      where: { anchorTransactionId: 'tx-2' },
      data: { status: 'completed' },
    });
    expect(result).toEqual({
      id: 'flow-1',
      type: 'withdraw',
      userAddress: 'GABC123',
      amount: '50',
      currency: 'USD',
      destination: undefined,
      anchorTransactionId: 'tx-2',
      anchorUrl: undefined,
      status: 'completed',
      createdAt: '2026-06-23T13:00:00.000Z',
      updatedAt: '2026-06-23T13:05:00.000Z',
    });
  });

  it('finds anchor flows for a user and maps database records correctly', async () => {
    mockPrisma.anchorFlow.findMany.mockResolvedValue([
      {
        id: 'flow-1',
        type: 'deposit',
        userAddress: 'GABC123',
        amount: '10',
        currency: 'USD',
        destination: 'GDEST',
        anchorTransactionId: 'tx-1',
        anchorUrl: 'https://anchor.example.com/1',
        status: 'completed',
        createdAt: new Date('2026-06-23T10:00:00.000Z'),
        updatedAt: new Date('2026-06-23T10:05:00.000Z'),
      },
    ]);

    const result = await getAnchorFlowsForUser('GABC123');

    expect(mockPrisma.anchorFlow.findMany).toHaveBeenCalledWith({
      where: { userAddress: 'GABC123' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual([
      {
        id: 'flow-1',
        type: 'deposit',
        userAddress: 'GABC123',
        amount: '10',
        currency: 'USD',
        destination: 'GDEST',
        anchorTransactionId: 'tx-1',
        anchorUrl: 'https://anchor.example.com/1',
        status: 'completed',
        createdAt: '2026-06-23T10:00:00.000Z',
        updatedAt: '2026-06-23T10:05:00.000Z',
      },
    ]);
  });
});
