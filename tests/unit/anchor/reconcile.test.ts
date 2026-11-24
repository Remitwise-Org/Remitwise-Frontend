// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import { once } from 'node:events';
import { NextRequest } from 'next/server';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    anchorFlow: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  reconcilePendingAnchorFlows,
  reconcileSingleFlow,
  isFlowReadyForReconciliation,
  mapAnchorStatusToFlowStatus,
  startAnchorReconcileLoop,
  stopAnchorReconcileLoop,
} from '@/lib/anchor/reconcile';
import { POST as adminReconcileHandler } from '@/app/api/v1/admin/anchor/reconcile/route';

const mockPrisma = prisma as unknown as {
  anchorFlow: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  auditEvent: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

describe('Anchor reconciliation flow', () => {
  let server: Server;
  let baseUrl: string;
  let requestHandler: (req: IncomingMessage, res: ServerResponse) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = 'test-admin-secret';

    // Set up mock HTTP server for anchor API
    server = createServer((req, res) => {
      if (requestHandler) {
        requestHandler(req, res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
      }
    });

    server.listen(0);
    await once(server, 'listening');
    const addr = server.address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    baseUrl = `http://localhost:${port}`;
    process.env.ANCHOR_API_BASE_URL = baseUrl;
  });

  afterEach(async () => {
    stopAnchorReconcileLoop();
    delete process.env.ANCHOR_API_BASE_URL;
    delete process.env.ADMIN_SECRET;
    delete process.env.ANCHOR_API_KEY;
    server.close();
    await once(server, 'close');
  });

  describe('mapAnchorStatusToFlowStatus', () => {
    it('maps completed and success to completed', () => {
      expect(mapAnchorStatusToFlowStatus('completed')).toBe('completed');
      expect(mapAnchorStatusToFlowStatus('COMPLETED')).toBe('completed');
      expect(mapAnchorStatusToFlowStatus('success')).toBe('completed');
    });

    it('maps failed, error, expired to failed', () => {
      expect(mapAnchorStatusToFlowStatus('failed')).toBe('failed');
      expect(mapAnchorStatusToFlowStatus('error')).toBe('failed');
      expect(mapAnchorStatusToFlowStatus('expired')).toBe('failed');
      expect(mapAnchorStatusToFlowStatus('refunded')).toBe('failed');
    });

    it('maps pending variants to pending', () => {
      expect(mapAnchorStatusToFlowStatus('pending')).toBe('pending');
      expect(mapAnchorStatusToFlowStatus('pending_anchor')).toBe('pending');
      expect(mapAnchorStatusToFlowStatus('pending_stellar')).toBe('pending');
      expect(mapAnchorStatusToFlowStatus('pending_user')).toBe('pending');
      expect(mapAnchorStatusToFlowStatus('incomplete')).toBe('pending');
    });

    it('maps stale to stale', () => {
      expect(mapAnchorStatusToFlowStatus('stale')).toBe('stale');
    });
  });

  describe('isFlowReadyForReconciliation (backoff)', () => {
    it('returns true when attempts count is 0', () => {
      const flow = {
        id: 'flow-1',
        type: 'deposit' as const,
        userAddress: 'GABC',
        amount: '10',
        currency: 'USD',
        status: 'pending' as const,
        reconcileAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      expect(isFlowReadyForReconciliation(flow, 60000)).toBe(true);
    });

    it('enforces exponential backoff based on reconcileAttempts', () => {
      const now = 1000000000000;
      const baseDelay = 60000; // 1 min

      // Attempt 1: delay = 60000ms (2^0 * baseDelay)
      const flowAttempt1Recent = {
        id: 'flow-1',
        type: 'deposit' as const,
        userAddress: 'GABC',
        amount: '10',
        currency: 'USD',
        status: 'pending' as const,
        reconcileAttempts: 1,
        createdAt: new Date(now - 300000).toISOString(),
        updatedAt: new Date(now - 30000).toISOString(), // 30s ago, < 60s
      };
      expect(isFlowReadyForReconciliation(flowAttempt1Recent, baseDelay, now)).toBe(false);

      const flowAttempt1Ready = {
        ...flowAttempt1Recent,
        updatedAt: new Date(now - 61000).toISOString(), // 61s ago, >= 60s
      };
      expect(isFlowReadyForReconciliation(flowAttempt1Ready, baseDelay, now)).toBe(true);

      // Attempt 2: delay = 120000ms (2^1 * baseDelay)
      const flowAttempt2Recent = {
        ...flowAttempt1Recent,
        reconcileAttempts: 2,
        updatedAt: new Date(now - 90000).toISOString(), // 90s ago, < 120s
      };
      expect(isFlowReadyForReconciliation(flowAttempt2Recent, baseDelay, now)).toBe(false);

      const flowAttempt2Ready = {
        ...flowAttempt1Recent,
        reconcileAttempts: 2,
        updatedAt: new Date(now - 125000).toISOString(), // 125s ago, >= 120s
      };
      expect(isFlowReadyForReconciliation(flowAttempt2Ready, baseDelay, now)).toBe(true);
    });
  });

  describe('reconcilePendingAnchorFlows', () => {
    it('updates pending flow to completed when anchor reports completed status', async () => {
      const oldDate = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
      mockPrisma.anchorFlow.findMany.mockResolvedValueOnce([
        {
          id: 'flow-1',
          type: 'deposit',
          userAddress: 'GABC1',
          amount: '50',
          currency: 'USD',
          destination: null,
          anchorTransactionId: 'tx-completed-1',
          anchorUrl: null,
          status: 'pending',
          reconcileAttempts: 0,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
      ]);

      mockPrisma.anchorFlow.findUnique.mockResolvedValue({
        id: 'flow-1',
        type: 'deposit',
        userAddress: 'GABC1',
        amount: '50',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-completed-1',
        anchorUrl: null,
        status: 'pending',
        reconcileAttempts: 0,
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      mockPrisma.anchorFlow.update.mockResolvedValue({
        id: 'flow-1',
        type: 'deposit',
        userAddress: 'GABC1',
        amount: '50',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-completed-1',
        anchorUrl: null,
        status: 'completed',
        reconcileAttempts: 1,
        createdAt: oldDate,
        updatedAt: new Date(),
      });

      requestHandler = (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        if (url.pathname === '/transaction' && url.searchParams.get('id') === 'tx-completed-1') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            transaction: {
              id: 'tx-completed-1',
              status: 'completed',
            },
          }));
          return;
        }
        res.writeHead(404);
        res.end();
      };

      const counts = await reconcilePendingAnchorFlows({ olderThanMs: 15 * 60 * 1000, force: true });

      expect(counts.total).toBe(1);
      expect(counts.completed).toBe(1);
      expect(counts.failed).toBe(0);
      expect(counts.stillPending).toBe(0);
      expect(counts.stale).toBe(0);
      expect(counts.errors).toBe(0);

      expect(mockPrisma.anchorFlow.update).toHaveBeenCalledWith({
        where: { anchorTransactionId: 'tx-completed-1' },
        data: { status: 'completed', reconcileAttempts: 1 },
      });
      expect(mockPrisma.auditEvent.create).toHaveBeenCalled();
    });

    it('updates pending flow to failed when anchor reports failed status', async () => {
      const oldDate = new Date(Date.now() - 30 * 60 * 1000);
      mockPrisma.anchorFlow.findMany.mockResolvedValueOnce([
        {
          id: 'flow-2',
          type: 'withdraw',
          userAddress: 'GABC2',
          amount: '25',
          currency: 'USD',
          destination: null,
          anchorTransactionId: 'tx-failed-1',
          anchorUrl: null,
          status: 'pending',
          reconcileAttempts: 1,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
      ]);

      mockPrisma.anchorFlow.findUnique.mockResolvedValue({
        id: 'flow-2',
        type: 'withdraw',
        userAddress: 'GABC2',
        amount: '25',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-failed-1',
        anchorUrl: null,
        status: 'pending',
        reconcileAttempts: 1,
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      mockPrisma.anchorFlow.update.mockResolvedValue({
        id: 'flow-2',
        type: 'withdraw',
        userAddress: 'GABC2',
        amount: '25',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-failed-1',
        anchorUrl: null,
        status: 'failed',
        reconcileAttempts: 2,
        createdAt: oldDate,
        updatedAt: new Date(),
      });

      requestHandler = (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'failed',
        }));
      };

      const counts = await reconcilePendingAnchorFlows({ olderThanMs: 15 * 60 * 1000, force: true });

      expect(counts.total).toBe(1);
      expect(counts.failed).toBe(1);
      expect(counts.completed).toBe(0);

      expect(mockPrisma.anchorFlow.update).toHaveBeenCalledWith({
        where: { anchorTransactionId: 'tx-failed-1' },
        data: { status: 'failed', reconcileAttempts: 2 },
      });
    });

    it('increments reconcileAttempts when flow is still pending on anchor', async () => {
      const oldDate = new Date(Date.now() - 30 * 60 * 1000);
      mockPrisma.anchorFlow.findMany.mockResolvedValueOnce([
        {
          id: 'flow-3',
          type: 'deposit',
          userAddress: 'GABC3',
          amount: '10',
          currency: 'USD',
          destination: null,
          anchorTransactionId: 'tx-pending-1',
          anchorUrl: null,
          status: 'pending',
          reconcileAttempts: 0,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
      ]);

      mockPrisma.anchorFlow.findUnique.mockResolvedValue({
        id: 'flow-3',
        type: 'deposit',
        userAddress: 'GABC3',
        amount: '10',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-pending-1',
        anchorUrl: null,
        status: 'pending',
        reconcileAttempts: 0,
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      mockPrisma.anchorFlow.update.mockResolvedValue({
        id: 'flow-3',
        type: 'deposit',
        userAddress: 'GABC3',
        amount: '10',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-pending-1',
        anchorUrl: null,
        status: 'pending',
        reconcileAttempts: 1,
        createdAt: oldDate,
        updatedAt: new Date(),
      });

      requestHandler = (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'pending_anchor' }));
      };

      const counts = await reconcilePendingAnchorFlows({ olderThanMs: 15 * 60 * 1000, force: true });

      expect(counts.total).toBe(1);
      expect(counts.stillPending).toBe(1);
      expect(counts.completed).toBe(0);

      expect(mockPrisma.anchorFlow.update).toHaveBeenCalledWith({
        where: { anchorTransactionId: 'tx-pending-1' },
        data: { reconcileAttempts: 1 },
      });
    });

    it('marks flow as stale when maxAttempts is reached', async () => {
      const oldDate = new Date(Date.now() - 30 * 60 * 1000);
      // Already attempted 4 times, with maxAttempts = 5 this attempt becomes 5 (terminal)
      mockPrisma.anchorFlow.findMany.mockResolvedValueOnce([
        {
          id: 'flow-4',
          type: 'deposit',
          userAddress: 'GABC4',
          amount: '10',
          currency: 'USD',
          destination: null,
          anchorTransactionId: 'tx-terminal-stale',
          anchorUrl: null,
          status: 'pending',
          reconcileAttempts: 4,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
      ]);

      mockPrisma.anchorFlow.findUnique.mockResolvedValue({
        id: 'flow-4',
        type: 'deposit',
        userAddress: 'GABC4',
        amount: '10',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-terminal-stale',
        anchorUrl: null,
        status: 'pending',
        reconcileAttempts: 4,
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      mockPrisma.anchorFlow.update.mockResolvedValue({
        id: 'flow-4',
        type: 'deposit',
        userAddress: 'GABC4',
        amount: '10',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-terminal-stale',
        anchorUrl: null,
        status: 'stale',
        reconcileAttempts: 5,
        createdAt: oldDate,
        updatedAt: new Date(),
      });

      requestHandler = (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'pending_user' }));
      };

      const counts = await reconcilePendingAnchorFlows({
        olderThanMs: 15 * 60 * 1000,
        maxAttempts: 5,
        force: true,
      });

      expect(counts.total).toBe(1);
      expect(counts.stale).toBe(1);
      expect(counts.stillPending).toBe(0);

      expect(mockPrisma.anchorFlow.update).toHaveBeenCalledWith({
        where: { anchorTransactionId: 'tx-terminal-stale' },
        data: { status: 'stale', reconcileAttempts: 5 },
      });
    });

    it('does not crash the loop when anchor is down (returns 500 error)', async () => {
      const oldDate = new Date(Date.now() - 30 * 60 * 1000);
      mockPrisma.anchorFlow.findMany.mockResolvedValueOnce([
        {
          id: 'flow-5',
          type: 'deposit',
          userAddress: 'GABC5',
          amount: '10',
          currency: 'USD',
          destination: null,
          anchorTransactionId: 'tx-anchor-down',
          anchorUrl: null,
          status: 'pending',
          reconcileAttempts: 0,
          createdAt: oldDate,
          updatedAt: oldDate,
        },
      ]);

      mockPrisma.anchorFlow.findUnique.mockResolvedValue({
        id: 'flow-5',
        type: 'deposit',
        userAddress: 'GABC5',
        amount: '10',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-anchor-down',
        anchorUrl: null,
        status: 'pending',
        reconcileAttempts: 0,
        createdAt: oldDate,
        updatedAt: oldDate,
      });

      mockPrisma.anchorFlow.update.mockResolvedValue({
        id: 'flow-5',
        type: 'deposit',
        userAddress: 'GABC5',
        amount: '10',
        currency: 'USD',
        destination: null,
        anchorTransactionId: 'tx-anchor-down',
        anchorUrl: null,
        status: 'pending',
        reconcileAttempts: 1,
        createdAt: oldDate,
        updatedAt: new Date(),
      });

      // Anchor responds with 500
      requestHandler = (_req, res) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal Server Error' }));
      };

      // Loop must complete cleanly without throwing
      const counts = await reconcilePendingAnchorFlows({
        olderThanMs: 15 * 60 * 1000,
        force: true,
      });

      expect(counts.total).toBe(1);
      expect(counts.errors).toBe(1);
      expect(counts.completed).toBe(0);

      // Reconcile attempt is still tracked
      expect(mockPrisma.anchorFlow.update).toHaveBeenCalledWith({
        where: { anchorTransactionId: 'tx-anchor-down' },
        data: { reconcileAttempts: 1 },
      });
    });

    it('skips flows that are currently in their backoff window', async () => {
      const oldCreatedAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const recentUpdatedAt = new Date(Date.now() - 10 * 1000); // 10s ago (backoff requires 60s for attempt 1)

      mockPrisma.anchorFlow.findMany.mockResolvedValueOnce([
        {
          id: 'flow-backoff',
          type: 'deposit',
          userAddress: 'GABC6',
          amount: '10',
          currency: 'USD',
          destination: null,
          anchorTransactionId: 'tx-backoff',
          anchorUrl: null,
          status: 'pending',
          reconcileAttempts: 1,
          createdAt: oldCreatedAt,
          updatedAt: recentUpdatedAt,
        },
      ]);

      const counts = await reconcilePendingAnchorFlows({
        olderThanMs: 15 * 60 * 1000,
        baseDelayMs: 60000,
        force: false,
      });

      expect(counts.total).toBe(0);
      expect(counts.skipped).toBe(1);
      expect(mockPrisma.anchorFlow.update).not.toHaveBeenCalled();
    });
  });

  describe('Admin trigger POST /api/v1/admin/anchor/reconcile', () => {
    it('returns 401 Unauthorized when admin secret is missing or incorrect', async () => {
      const req = new NextRequest('http://localhost:3000/api/v1/admin/anchor/reconcile', {
        method: 'POST',
      });

      const res = await adminReconcileHandler(req);
      const data = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('succeeds and returns counts when authorized with x-admin-key', async () => {
      mockPrisma.anchorFlow.findMany.mockResolvedValueOnce([]);

      const req = new NextRequest('http://localhost:3000/api/v1/admin/anchor/reconcile', {
        method: 'POST',
        headers: {
          'x-admin-key': 'test-admin-secret',
        },
      });

      const res = await adminReconcileHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.counts).toEqual({
        total: 0,
        completed: 0,
        failed: 0,
        stillPending: 0,
        stale: 0,
        errors: 0,
        skipped: 0,
      });
      expect(mockPrisma.auditEvent.create).toHaveBeenCalled();
    });
  });
});
