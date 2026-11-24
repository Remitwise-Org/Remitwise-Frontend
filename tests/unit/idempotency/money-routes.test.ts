import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  clearIdempotencyStore,
  withIdempotency,
} from '../../../lib/idempotency';

function request(key: string, body: object): NextRequest {
  return new NextRequest('http://localhost/api/money', {
    method: 'POST',
    headers: { 'idempotency-key': key },
    body: JSON.stringify(body),
  });
}

describe('money route idempotency', () => {
  beforeEach(() => {
    clearIdempotencyStore();
  });

  it('executes the handler once for duplicate requests', async () => {
    let executions = 0;
    const handler = async () => {
      executions++;
      return NextResponse.json({ flowId: 'flow-1' }, { status: 200 });
    };

    const first = await withIdempotency(request('money-duplicate', { amount: 100 }), handler);
    const replay = await withIdempotency(request('money-duplicate', { amount: 100 }), handler);

    expect(executions).toBe(1);
    expect(first.status).toBe(200);
    expect(replay.status).toBe(200);
    expect(replay.headers.get('x-idempotent-replay')).toBe('true');
  });

  it('rejects a different payload with the same key', async () => {
    const handler = async () => NextResponse.json({ flowId: 'flow-1' }, { status: 200 });
    await withIdempotency(request('money-conflict', { amount: 100 }), handler);

    const conflict = await withIdempotency(
      request('money-conflict', { amount: 200 }),
      handler,
    );

    expect(conflict.status).toBe(422);
  });

  it('returns 409 while an identical request is in flight', async () => {
    let release!: () => void;
    const waiting = new Promise<void>((resolve) => {
      release = resolve;
    });
    const handler = async () => {
      await waiting;
      return NextResponse.json({ flowId: 'flow-1' }, { status: 200 });
    };

    const first = withIdempotency(request('money-in-flight', { amount: 100 }), handler);
    await Promise.resolve();
    const duplicate = await withIdempotency(
      request('money-in-flight', { amount: 100 }),
      handler,
    );

    expect(duplicate.status).toBe(409);
    release();
    await first;
  });

  it('allows distinct keys and requires keys on anchor-style flows', async () => {
    const handler = async () => NextResponse.json({ flowId: 'flow-1' }, { status: 200 });

    const missing = await withIdempotency(
      new NextRequest('http://localhost/api/v1/anchor/deposit', {
        method: 'POST',
        body: JSON.stringify({ amount: 100 }),
      }),
      handler,
      { required: true },
    );
    const distinct = await withIdempotency(request('money-distinct', { amount: 100 }), handler);

    expect(missing.status).toBe(400);
    expect(distinct.status).toBe(200);
  });
});
