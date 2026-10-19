"use client";

import { CHANGELOG } from "@/lib/changelog";

const STORAGE_KEY = "remitwise_whats_new_last_seen";

export interface WhatsNewState {
  isOpen: boolean;
  lastSeenId: string | null;
  mounted: boolean;
}

export type WhatsNewAction =
  | { type: "INITIALIZE"; payload: { lastSeenId: string | null; hasStored: boolean } }
  | { type: "OPEN" }
  | { type: "CLOSE" }
  | { type: "TOGGLE" }
  | { type: "MARK_ALL_READ" }
  | { type: "REPLAY" };

export const initialState: WhatsNewState = {
  isOpen: false,
  lastSeenId: null,
  mounted: false,
};

export function whatsNewReducer(state: WhatsNewState, action: WhatsNewAction): WhatsNewState {
  switch (action.type) {
    case "INITIALIZE": {
      if (state.mounted) return state;
      const { lastSeenId, hasStored } = action.payload;
      return {
        ...state,
        mounted: true,
        lastSeenId,
        isOpen: !hasStored,
      };
    }

    case "OPEN":
      return { ...state, isOpen: true };

    case "CLOSE":
      return { ...state, isOpen: false };

    case "TOGGLE":
      return { ...state, isOpen: !state.isOpen };

    case "MARK_ALL_READ": {
      const newestId = CHANGELOG[0]?.id ?? null;
      return { ...state, lastSeenId: newestId };
    }

    case "REPLAY":
      return { ...state, lastSeenId: null, isOpen: true };

    default:
      return state;
  }
}

export function computeUnreadCount(state: WhatsNewState): number {
  if (!state.mounted) return 0;
  if (state.lastSeenId === null) return CHANGELOG.length;
  const seenIndex = CHANGELOG.findIndex((entry) => entry.id === state.lastSeenId);
  return seenIndex === -1 ? CHANGELOG.length : seenIndex;
}

export function computeReadIds(state: WhatsNewState): Set<string> {
  if (!state.mounted) return new Set();
  const unreadCount = computeUnreadCount(state);
  return new Set(CHANGELOG.slice(unreadCount).map((entry) => entry.id));
}