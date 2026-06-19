/**
 * Client-side store for tracking interactive anchor SEP-6/SEP-24 flow status.
 *
 * The store holds a single in-progress flow at a time.  Components should
 * poll the status endpoint and call `updateFlow` with each response.
 */

export type FlowDirection = "deposit" | "withdraw";

export type FlowStatus =
  | "idle"
  | "building"
  | "pending_user_transfer"
  | "pending_anchor"
  | "completed"
  | "error"
  | "timeout";

export interface AnchorFlow {
  id: string;
  direction: FlowDirection;
  asset: string;
  amount: number;
  status: FlowStatus;
  message?: string;
  more_info_url?: string;
  started_at: number;
  updated_at: number;
}

type Listener = (flow: AnchorFlow | null) => void;

let currentFlow: AnchorFlow | null = null;
const listeners = new Set<Listener>();

export function getFlow(): AnchorFlow | null {
  return currentFlow;
}

export function startFlow(
  direction: FlowDirection,
  asset: string,
  amount: number,
): AnchorFlow {
  const now = Date.now();
  currentFlow = {
    id: `flow-${now}`,
    direction,
    asset,
    amount,
    status: "building",
    started_at: now,
    updated_at: now,
  };
  notifyListeners();
  return currentFlow;
}

export function updateFlow(patch: Partial<AnchorFlow>): AnchorFlow | null {
  if (!currentFlow) return null;
  currentFlow = { ...currentFlow, ...patch, updated_at: Date.now() };
  notifyListeners();
  return currentFlow;
}

export function clearFlow(): void {
  currentFlow = null;
  notifyListeners();
}

export function subscribeFlow(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyListeners(): void {
  listeners.forEach((l) => l(currentFlow));
}
