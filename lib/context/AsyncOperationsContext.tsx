"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export type OperationStatus = 'building' | 'awaiting-signature' | 'submitting' | 'confirmed' | 'failed';

export interface AsyncOperation {
  id: string;
  title: string;
  detail: string;
  status: OperationStatus;
  createdAt: number;
}

export interface State {
  operations: AsyncOperation[];
}

type Action =
  | { type: 'ADD_OPERATION'; payload: AsyncOperation }
  | { type: 'UPDATE_OPERATION'; payload: { id: string; status: OperationStatus } }
  | { type: 'REMOVE_OPERATION'; payload: string };

const MAX_OPERATIONS = 3;

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'ADD_OPERATION':
      return {
        ...state,
        operations: [action.payload, ...state.operations].slice(0, MAX_OPERATIONS),
      };
    case 'UPDATE_OPERATION':
      return {
        ...state,
        operations: state.operations.map((op) =>
          op.id === action.payload.id ? { ...op, status: action.payload.status } : op
        ),
      };
    case 'REMOVE_OPERATION':
      return {
        ...state,
        operations: state.operations.filter((op) => op.id !== action.payload),
      };
    default:
      return state;
  }
};

const AsyncOperationsContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | undefined>(undefined);

export const AsyncOperationsProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, { operations: [] });
  return (
    <AsyncOperationsContext.Provider value={{ state, dispatch }}>
      {children}
    </AsyncOperationsContext.Provider>
  );
};

export const useAsyncOperations = () => {
  const context = useContext(AsyncOperationsContext);
  if (!context) {
    throw new Error('useAsyncOperations must be used within an AsyncOperationsProvider');
  }
  return context;
};
