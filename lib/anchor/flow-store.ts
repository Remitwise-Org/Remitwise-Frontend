import { prisma } from '@/lib/prisma';

export type AnchorFlowType = 'deposit' | 'withdraw';
export type AnchorFlowStatus = 'pending' | 'completed' | 'failed' | 'stale';

export interface AnchorFlowRecord {
  id: string;
  type: AnchorFlowType;
  userAddress: string;
  amount: string;
  currency: string;
  destination?: string;
  anchorTransactionId?: string;
  anchorUrl?: string;
  status: AnchorFlowStatus;
  reconcileAttempts?: number;
  createdAt: string;
  updatedAt: string;
}

interface AnchorFlowRow {
  id: string;
  type: string;
  userAddress: string;
  amount: string;
  currency: string;
  destination: string | null;
  anchorTransactionId: string | null;
  anchorUrl: string | null;
  status: string;
  reconcileAttempts?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface AnchorFlowDelegate {
  create(args: {
    data: {
      type: string;
      userAddress: string;
      amount: string;
      currency: string;
      destination: string | null;
      anchorTransactionId: string | null;
      anchorUrl: string | null;
      status: string;
      reconcileAttempts?: number;
    };
  }): Promise<AnchorFlowRow>;
  findUnique(args: {
    where: {
      anchorTransactionId: string;
    };
  }): Promise<AnchorFlowRow | null>;
  update(args: {
    where: {
      anchorTransactionId: string;
    };
    data: {
      status?: string;
      reconcileAttempts?: number;
    };
  }): Promise<AnchorFlowRow>;
  findMany(args: {
    where?: {
      userAddress?: string;
      status?: string;
      createdAt?: {
        lte?: Date;
      };
    };
    take?: number;
    orderBy?: {
      createdAt: 'asc' | 'desc';
    };
  }): Promise<AnchorFlowRow[]>;
}

const anchorFlowDelegate = (prisma as typeof prisma & {
  anchorFlow?: AnchorFlowDelegate;
}).anchorFlow;

function mapAnchorFlow(record: {
  id: string;
  type: string;
  userAddress: string;
  amount: string;
  currency: string;
  destination: string | null;
  anchorTransactionId: string | null;
  anchorUrl: string | null;
  status: string;
  reconcileAttempts?: number;
  createdAt: Date;
  updatedAt: Date;
}): AnchorFlowRecord {
  const result: AnchorFlowRecord = {
    id: record.id,
    type: record.type as AnchorFlowType,
    userAddress: record.userAddress,
    amount: record.amount,
    currency: record.currency,
    destination: record.destination ?? undefined,
    anchorTransactionId: record.anchorTransactionId ?? undefined,
    anchorUrl: record.anchorUrl ?? undefined,
    status: record.status as AnchorFlowStatus,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };

  if (record.reconcileAttempts !== undefined) {
    result.reconcileAttempts = record.reconcileAttempts;
  }

  return result;
}

export async function createPendingAnchorFlow(
  input: Omit<AnchorFlowRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<AnchorFlowRecord> {
  const anchorFlowClient = (prisma as any).anchorFlow;
  if (!anchorFlowClient?.create) {
    throw new Error('Anchor flow persistence is not configured.');
  }

  const record = await anchorFlowClient.create({
    data: {
      type: input.type,
      userAddress: input.userAddress,
      amount: input.amount,
      currency: input.currency,
      destination: input.destination ?? null,
      anchorTransactionId: input.anchorTransactionId ?? null,
      anchorUrl: input.anchorUrl ?? null,
      status: 'pending',
    },
  });

  return mapAnchorFlow(record);
}

export async function updateAnchorFlowStatusByTransactionId(
  anchorTransactionId: string,
  status: AnchorFlowStatus,
  options?: { reconcileAttempts?: number }
): Promise<AnchorFlowRecord | null> {
  if (!anchorTransactionId) {
    return null;
  }

  const anchorFlowClient = (prisma as any).anchorFlow;
  if (!anchorFlowClient?.findUnique || !anchorFlowClient?.update) {
    return null;
  }

  const existing = await anchorFlowClient.findUnique({
    where: { anchorTransactionId },
  });

  if (!existing) {
    return null;
  }

  const updateData: { status: string; reconcileAttempts?: number } = { status };
  if (options?.reconcileAttempts !== undefined) {
    updateData.reconcileAttempts = options.reconcileAttempts;
  }

  const updated = await anchorFlowClient.update({
    where: { anchorTransactionId },
    data: updateData,
  });

  return mapAnchorFlow(updated);
}

export async function updateAnchorFlowReconcileAttempts(
  anchorTransactionId: string,
  reconcileAttempts: number
): Promise<AnchorFlowRecord | null> {
  if (!anchorTransactionId) {
    return null;
  }

  const anchorFlowClient = (prisma as any).anchorFlow;
  if (!anchorFlowClient?.findUnique || !anchorFlowClient?.update) {
    return null;
  }

  const existing = await anchorFlowClient.findUnique({
    where: { anchorTransactionId },
  });

  if (!existing) {
    return null;
  }

  const updated = await anchorFlowClient.update({
    where: { anchorTransactionId },
    data: { reconcileAttempts },
  });

  return mapAnchorFlow(updated);
}

export async function listStalePendingFlows(
  olderThan: Date | number,
  limit: number = 50
): Promise<AnchorFlowRecord[]> {
  const anchorFlowClient = (prisma as any).anchorFlow;
  if (!anchorFlowClient?.findMany) {
    return [];
  }

  const olderThanDate = olderThan instanceof Date ? olderThan : new Date(olderThan);

  const flows = await anchorFlowClient.findMany({
    where: {
      status: 'pending',
      createdAt: {
        lte: olderThanDate,
      },
    },
    take: limit,
    orderBy: {
      createdAt: 'asc',
    },
  });

  return flows.map(mapAnchorFlow);
}

export async function getAnchorFlowsForUser(
  userAddress: string
): Promise<AnchorFlowRecord[]> {
  const anchorFlowClient = (prisma as any).anchorFlow;
  const flows: any[] = anchorFlowClient?.findMany
    ? await anchorFlowClient.findMany({
    where: { userAddress },
    orderBy: { createdAt: 'desc' },
    })
    : [];

  return flows.map(mapAnchorFlow);
}
