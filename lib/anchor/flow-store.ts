import { prisma } from '@/lib/prisma';

export type AnchorFlowType = 'deposit' | 'withdraw';
export type AnchorFlowStatus = 'pending' | 'completed' | 'failed';

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
  createdAt: string;
  updatedAt: string;
}

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
  createdAt: Date;
  updatedAt: Date;
}): AnchorFlowRecord {
  return {
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
}

export async function createPendingAnchorFlow(
  input: Omit<AnchorFlowRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): Promise<AnchorFlowRecord> {
  const record = await prisma.anchorFlow.create({
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
  status: AnchorFlowStatus
): Promise<AnchorFlowRecord | null> {
  if (!anchorTransactionId) {
    return null;
  }

  const existing = await prisma.anchorFlow.findUnique({
    where: { anchorTransactionId },
  });

  if (!existing) {
    return null;
  }

  const updated = await prisma.anchorFlow.update({
    where: { anchorTransactionId },
    data: { status },
  });

  return mapAnchorFlow(updated);
}

export async function getAnchorFlowsForUser(
  userAddress: string
): Promise<AnchorFlowRecord[]> {
  const flows = await prisma.anchorFlow.findMany({
    where: { userAddress },
    orderBy: { createdAt: 'desc' },
  });

  return flows.map(mapAnchorFlow);
}

