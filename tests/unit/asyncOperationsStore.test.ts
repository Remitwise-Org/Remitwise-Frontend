import { describe, it, expect } from 'vitest';
import { reducer, State, AsyncOperation } from '@/lib/context/AsyncOperationsContext';

describe('AsyncOperationsContext reducer', () => {
  const initialState: State = { operations: [] };

  it('should add an operation', () => {
    const op: AsyncOperation = { id: '1', title: 'Test', detail: 'Detail', status: 'building', createdAt: Date.now() };
    const state = reducer(initialState, { type: 'ADD_OPERATION', payload: op });
    expect(state.operations).toHaveLength(1);
    expect(state.operations[0]).toEqual(op);
  });

  it('should cap operations at 3', () => {
    const ops: AsyncOperation[] = [
      { id: '1', title: '1', detail: '', status: 'building', createdAt: 1 },
      { id: '2', title: '2', detail: '', status: 'building', createdAt: 2 },
      { id: '3', title: '3', detail: '', status: 'building', createdAt: 3 },
      { id: '4', title: '4', detail: '', status: 'building', createdAt: 4 },
    ];
    let state = initialState;
    for (const op of ops) {
      state = reducer(state, { type: 'ADD_OPERATION', payload: op });
    }
    expect(state.operations).toHaveLength(3);
    expect(state.operations[0].id).toBe('4');
  });

  it('should update an operation status', () => {
    const op: AsyncOperation = { id: '1', title: 'Test', detail: 'Detail', status: 'building', createdAt: Date.now() };
    let state = reducer(initialState, { type: 'ADD_OPERATION', payload: op });
    state = reducer(state, { type: 'UPDATE_OPERATION', payload: { id: '1', status: 'submitting' } });
    expect(state.operations[0].status).toBe('submitting');
  });

  it('should remove an operation', () => {
    const op: AsyncOperation = { id: '1', title: 'Test', detail: 'Detail', status: 'building', createdAt: Date.now() };
    let state = reducer(initialState, { type: 'ADD_OPERATION', payload: op });
    state = reducer(state, { type: 'REMOVE_OPERATION', payload: '1' });
    expect(state.operations).toHaveLength(0);
  });
});
