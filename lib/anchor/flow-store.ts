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

const flowById = new Map<string, AnchorFlowRecord>();
const flowByAnchorTransactionId = new Map<string, string>();

export function createPendingAnchorFlow(
  input: Omit<AnchorFlowRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): AnchorFlowRecord {
  const now = new Date().toISOString();
  const record: AnchorFlowRecord = {
    id: crypto.randomUUID(),
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  flowById.set(record.id, record);
  if (record.anchorTransactionId) {
    flowByAnchorTransactionId.set(record.anchorTransactionId, record.id);
  }
  return record;
}

export function updateAnchorFlowStatusByTransactionId(
  anchorTransactionId: string,
  status: AnchorFlowStatus
): AnchorFlowRecord | null {
  const flowId = flowByAnchorTransactionId.get(anchorTransactionId);
  if (!flowId) return null;
  const existing = flowById.get(flowId);
  if (!existing) return null;

  const updated: AnchorFlowRecord = {
    ...existing,
    status,
    updatedAt: new Date().toISOString(),
  };
  flowById.set(updated.id, updated);
  return updated;
}

