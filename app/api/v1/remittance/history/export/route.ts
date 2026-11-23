import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/session';
import {
  fetchTransactionHistory,
  type TransactionItem,
} from '@/lib/remittance/horizon';
import {
  getExportFilename,
  serializeToCsv,
  serializeToJson,
  type ExportRow,
} from '@/lib/utils/export-serializer';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 200;
const MAX_EXPORT_ROWS = 10_000;
const STREAM_CHUNK_SIZE = 250;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

class ExportRequestError extends Error {}

function parseDateFilter(value: string | null, name: string): string | undefined {
  if (value === null || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ExportRequestError(name + ' must use YYYY-MM-DD format.');
  }

  const parsed = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ExportRequestError(name + ' must be a valid calendar date.');
  }
  return value;
}

function isWithinDateRange(
  transaction: TransactionItem,
  fromTimestamp?: number,
  toTimestamp?: number
): boolean {
  const timestamp = Date.parse(transaction.date);
  if (!Number.isFinite(timestamp)) return false;
  if (fromTimestamp !== undefined && timestamp < fromTimestamp) return false;
  if (toTimestamp !== undefined && timestamp > toTimestamp) return false;
  return true;
}

function toExportRow(transaction: TransactionItem, walletAddress: string): ExportRow {
  const outgoing = transaction.sender === walletAddress;
  const amount = transaction.amount.replace(/^-/, '');
  return {
    id: transaction.id,
    type: 'payment',
    status: transaction.status,
    amount: outgoing ? '-' + amount : amount,
    currency: transaction.currency,
    counterparty: outgoing ? transaction.recipient : transaction.sender,
    date: transaction.date,
    // Horizon payment operations do not include a transaction fee per operation.
    fee: '',
  };
}

function createExportStream(rows: ExportRow[], format: 'csv' | 'json'): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const csvHeader = serializeToCsv([]);
  let offset = 0;
  let started = false;
  let firstJsonChunk = true;

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (format === 'csv') {
        if (!started) {
          controller.enqueue(encoder.encode(csvHeader));
          started = true;
          return;
        }
        if (offset >= rows.length) {
          controller.close();
          return;
        }

        const serialized = serializeToCsv(rows.slice(offset, offset + STREAM_CHUNK_SIZE));
        const data = serialized.slice(csvHeader.length + 1);
        offset += STREAM_CHUNK_SIZE;
        if (data) controller.enqueue(encoder.encode('\n' + data));
        return;
      }

      if (!started) {
        controller.enqueue(encoder.encode('['));
        started = true;
        return;
      }
      if (offset >= rows.length) {
        controller.enqueue(encoder.encode(firstJsonChunk ? ']' : '\n]'));
        controller.close();
        return;
      }

      const serialized = serializeToJson(rows.slice(offset, offset + STREAM_CHUNK_SIZE));
      const data = serialized.slice(1, -1).trim();
      offset += STREAM_CHUNK_SIZE;
      if (data) {
        controller.enqueue(encoder.encode((firstJsonChunk ? '\n' : ',\n') + data));
        firstJsonChunk = false;
      }
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { address } = await requireAuth();
    const params = request.nextUrl.searchParams;
    const format = params.get('format');
    if (format !== 'csv' && format !== 'json') {
      return Response.json({ error: 'format must be csv or json.' }, { status: 400 });
    }

    const from = parseDateFilter(params.get('from'), 'from');
    const to = parseDateFilter(params.get('to'), 'to');
    const fromTimestamp = from ? Date.parse(from + 'T00:00:00.000Z') : undefined;
    const toTimestamp = to ? Date.parse(to + 'T00:00:00.000Z') + DAY_IN_MS - 1 : undefined;
    if (fromTimestamp !== undefined && toTimestamp !== undefined && fromTimestamp > toTimestamp) {
      return Response.json({ error: 'from must be on or before to.' }, { status: 400 });
    }

    const rows: ExportRow[] = [];
    let cursor: string | undefined;
    let truncated = false;
    let reachedFromDate = false;

    do {
      const page = await fetchTransactionHistory(address, { limit: PAGE_SIZE, cursor });
      for (const transaction of page.transactions) {
        const timestamp = Date.parse(transaction.date);
        if (fromTimestamp !== undefined && Number.isFinite(timestamp) && timestamp < fromTimestamp) {
          reachedFromDate = true;
          break;
        }
        if (!isWithinDateRange(transaction, fromTimestamp, toTimestamp)) continue;

        rows.push(toExportRow(transaction, address));
        if (rows.length > MAX_EXPORT_ROWS) {
          truncated = true;
          break;
        }
      }

      if (truncated || reachedFromDate || !page.nextCursor || page.nextCursor === cursor) break;
      cursor = page.nextCursor;
    } while (true);

    const filename = getExportFilename(format, from, to);
    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/json; charset=utf-8';

    return new Response(createExportStream(rows.slice(0, MAX_EXPORT_ROWS), format), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        'Cache-Control': 'no-store',
        'X-Export-Truncated': String(truncated),
      },
    });
  } catch (error) {
    if (error instanceof Response) return error;
    if (error instanceof ExportRequestError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error('Error exporting remittance history:', error);
    return Response.json({ error: 'Failed to export transaction history.' }, { status: 500 });
  }
}
