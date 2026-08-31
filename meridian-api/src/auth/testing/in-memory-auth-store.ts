/**
 * Deterministic in-memory doubles for the auth concurrency tests (issue #1689).
 *
 * These fakes simulate — with the semantics the production SQL relies on —
 * the exact slice of TypeORM the auth providers use:
 *
 *  - `update(target, criteria, patch)` returns `{ affected }` computed by
 *    matching criteria (including `IsNull()` / `MoreThan()` operators and
 *    plain equality) against the CURRENT rows — a compare-and-set.
 *  - `transaction(cb)` gives the callback a manager bound to a private
 *    write set: writes inside the transaction are invisible to other
 *    transactions until commit and are discarded on throw (rollback).
 *  - `query('SELECT pg_advisory_xact_lock($1, $2)')` acquires a REAL async
 *    mutex held until the transaction commits/rolls back, mirroring
 *    PostgreSQL's transaction-scoped advisory locks. This is what the
 *    refresh-vs-logoutAll serialization tests exercise.
 *
 * Determinism: interleavings are orchestrated with explicit deferred
 * promises (`defer()`); no timing-based sleeps anywhere.
 */

/** Deferred promise handle used to orchestrate deterministic interleavings. */
export interface Deferred<T = unknown> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
}

export function defer<T = unknown>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Await N microtask ticks — deterministic hand-off between async ops. */
export async function tick(times = 1): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

type Row = Record<string, any>;

/** Minimal entity-class constructor type used to key the in-memory tables. */
type EntityClass = new (...args: never[]) => unknown;

interface FindOperatorShape {
  _value?: unknown;
  _type: string;
}

function isFindOperator(value: unknown): value is FindOperatorShape {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_type' in (value as Record<string, unknown>)
  );
}

function comparable(value: unknown): number | string {
  return value instanceof Date ? value.getTime() : (value as number | string);
}

function equals(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  return a === b;
}

/** Evaluate one TypeORM FindOperator against a column value. */
function matchesOperator(op: FindOperatorShape, column: unknown): boolean {
  switch (op._type) {
    case 'isNull':
      return column === null || column === undefined;
    case 'moreThan':
      return comparable(column) > comparable(op._value);
    case 'not':
      return !equals(column, op._value);
    case 'equal':
      return equals(column, op._value);
    default:
      throw new Error(`Unsupported operator in test double: ${op._type}`);
  }
}

function matchesCriteria(row: Row, criteria: Row): boolean {
  for (const [key, condition] of Object.entries(criteria)) {
    const column = row[key];
    if (isFindOperator(condition)) {
      if (!matchesOperator(condition, column)) return false;
    } else if (!equals(column, condition)) {
      return false;
    }
  }
  return true;
}

/** Cross-transaction advisory locks, mirroring pg_advisory_xact_lock. */
class AdvisoryLockManager {
  private held = new Map<string, Promise<void>>();

  async acquire(
    namespace: number | string,
    key: number | string,
  ): Promise<() => void> {
    const id = `${namespace}:${key}`;
    const previous = this.held.get(id) ?? Promise.resolve();
    const gate = defer<void>();
    this.held.set(
      id,
      previous.then(() => gate.promise),
    );
    await previous;
    return () => gate.resolve(undefined);
  }
}

/** Shared across all InMemoryDataSource instances (like a shared PG cluster). */
const advisoryLocks = new AdvisoryLockManager();

/** Generic in-memory table with affected-row counting updates. */
export class InMemoryTable<T extends Row> {
  rows: T[] = [];
  private idSeq = 0;

  insert(row: T): T {
    const withId = { id: `row-${++this.idSeq}`, ...row } as T;
    this.rows.push(withId);
    return withId;
  }

  findWhere(criteria: Row): T | undefined {
    return this.rows.find((row) => matchesCriteria(row, criteria));
  }

  /** UPDATE ... WHERE criteria → patch; returns the number of affected rows. */
  updateWhere(criteria: Row, patch: Row): number {
    let affected = 0;
    for (const row of this.rows) {
      if (matchesCriteria(row, criteria)) {
        Object.assign(row, patch);
        affected++;
      }
    }
    return affected;
  }
}

/**
 * A manager bound to a transaction's private write set. The transaction's
 * view = committed rows, overlaid with its own writes (matched by row id),
 * plus its own inserts. Other transactions' uncommitted writes are invisible
 * (Read Committed emulation).
 */
class TransactionalManager {
  /** Advisory-lock release fns, populated by `query(...)`. */
  readonly releaseLocks: Array<() => void> = [];

  constructor(
    private readonly tables: Map<EntityClass, InMemoryTable<any>>,
    private readonly own: Map<EntityClass, Row[]>,
  ) {}

  private table(target: EntityClass): InMemoryTable<any> {
    const table = this.tables.get(target);
    if (!table) throw new Error(`No table registered for ${target?.name}`);
    return table;
  }

  private ownRows(target: EntityClass): Row[] {
    if (!this.own.has(target)) this.own.set(target, []);
    return this.own.get(target)!;
  }

  /** The transaction's read view for a target. */
  private view(target: EntityClass): Row[] {
    const committed = this.table(target).rows;
    const own = this.ownRows(target);
    const ownById = new Map(own.map((row) => [row.id, row]));
    const merged: Row[] = committed.map(
      (row) => ownById.get(row.id) ?? { ...row },
    );
    const committedIds = new Set(committed.map((row) => row.id));
    for (const row of own) {
      if (!committedIds.has(row.id)) merged.push({ ...row });
    }
    return merged;
  }

  async findOne(
    target: EntityClass,
    options: { where: Row },
  ): Promise<Row | null> {
    const found = this.view(target).find((row) =>
      matchesCriteria(row, options.where),
    );
    return found ? { ...found } : null;
  }

  async find(
    target: EntityClass,
    options: { where: Row | Row[] },
  ): Promise<Row[]> {
    const view = this.view(target);
    const criteriaList = Array.isArray(options.where)
      ? options.where
      : [options.where];
    const out: Row[] = [];
    const seen = new Set<unknown>();
    for (const criteria of criteriaList) {
      for (const row of view) {
        if (!seen.has(row.id) && matchesCriteria(row, criteria)) {
          out.push({ ...row });
          seen.add(row.id);
        }
      }
    }
    return out;
  }

  async update(
    target: EntityClass,
    criteria: Row,
    patch: Row,
  ): Promise<{ affected: number }> {
    let affected = 0;
    const view = this.view(target);
    const own = this.ownRows(target);
    const ownIds = new Set(own.map((row) => row.id));

    for (const row of view) {
      if (!matchesCriteria(row, criteria)) continue;
      if (ownIds.has(row.id)) {
        Object.assign(own.find((candidate) => candidate.id === row.id)!, patch);
      } else {
        own.push({ ...row, ...patch }); // shadow the committed row
      }
      affected++;
    }
    return { affected };
  }

  /** INSERT (or upsert by jti) as an uncommitted write of this transaction. */
  async saveFor(target: EntityClass, entity: Row): Promise<Row> {
    const own = this.ownRows(target);
    const id = entity.id ?? `row-${own.length + 1}-txn`;
    const row: Row = { id, ...entity };

    const existingOwn = row.jti
      ? own.find((candidate) => candidate.jti === row.jti)
      : undefined;
    if (existingOwn) {
      Object.assign(existingOwn, row);
      return { ...existingOwn };
    }

    const committed = this.table(target).rows;
    const existingCommitted = row.jti
      ? committed.find((candidate) => candidate.jti === row.jti)
      : undefined;
    if (existingCommitted) {
      const shadow = { ...existingCommitted, ...row };
      own.push(shadow);
      return { ...shadow };
    }

    own.push(row);
    return { ...row };
  }

  getRepository(target: EntityClass) {
    return {
      save: (entity: Row) => this.saveFor(target, entity),
    };
  }

  async query(sql: string, params?: unknown[]): Promise<unknown> {
    if (sql.includes('pg_advisory_xact_lock')) {
      const release = await advisoryLocks.acquire(
        params?.[0] as number,
        params?.[1] as number,
      );
      this.releaseLocks.push(release);
      return { rows: [] };
    }
    return { rows: [] };
  }
}

/**
 * Fake TypeORM DataSource. `transaction(cb)` runs `cb` with a snapshotting
 * manager, commits the write set into the shared tables on success, discards
 * it on failure (rollback), and holds advisory locks for the duration.
 */
export class InMemoryDataSource {
  readonly isDataSource = true;

  constructor(
    private readonly tables: Map<EntityClass, InMemoryTable<any>>,
    public readonly hooks: {
      beforeCommit?: () => Promise<void> | void;
      afterManagerCreated?: (
        manager: TransactionalManager,
      ) => Promise<void> | void;
    } = {},
  ) {}

  async transaction<T>(cb: (manager: any) => Promise<T>): Promise<T> {
    const own = new Map<EntityClass, Row[]>();
    const manager = new TransactionalManager(this.tables, own);

    if (this.hooks.afterManagerCreated) {
      await this.hooks.afterManagerCreated(manager);
    }

    let result: T;
    try {
      result = await cb(manager);
      // Test seam: pause just before the commit becomes visible (the
      // transaction still holds its advisory locks at this point).
      if (this.hooks.beforeCommit) {
        await this.hooks.beforeCommit();
      }
    } catch (error) {
      for (const release of manager.releaseLocks.splice(0)) {
        await release();
      }
      throw error; // rollback: the write set in `own` is discarded
    }

    // Commit: merge the write set into the shared tables FIRST, then release
    // the advisory locks — mirroring PostgreSQL, where the lock guards until
    // the commit is durable, so the next lock acquirer observes the writes.
    for (const [target, rows] of own) {
      const table = this.tables.get(target)!;
      for (const row of rows) {
        const idx = table.rows.findIndex(
          (candidate) => candidate.id === row.id,
        );
        if (idx >= 0) {
          table.rows[idx] = { ...table.rows[idx], ...row };
        } else {
          table.rows.push({ ...row });
        }
      }
    }
    for (const release of manager.releaseLocks.splice(0)) {
      await release();
    }
    return result;
  }
}

/** Repository-style façade over a shared table (non-transactional calls). */
export class InMemoryRepository<T extends Row> {
  constructor(private readonly table: InMemoryTable<T>) {}

  async findOne(options: { where: Row | Row[] }): Promise<T | null> {
    const criteriaList = Array.isArray(options.where)
      ? options.where
      : [options.where];
    for (const criteria of criteriaList) {
      const row = this.table.findWhere(criteria);
      if (row) return { ...row } as T;
    }
    return null;
  }

  async find(options: { where: Row | Row[] }): Promise<T[]> {
    const criteriaList = Array.isArray(options.where)
      ? options.where
      : [options.where];
    const out: T[] = [];
    const seen = new Set<unknown>();
    for (const criteria of criteriaList) {
      for (const row of this.table.rows) {
        if (!seen.has(row.id) && matchesCriteria(row, criteria)) {
          out.push({ ...row } as T);
          seen.add(row.id);
        }
      }
    }
    return out;
  }

  async update(criteria: Row, patch: Row): Promise<{ affected: number }> {
    return { affected: this.table.updateWhere(criteria, patch) };
  }

  async save(entity: Partial<T> & Row): Promise<T> {
    if (entity.jti) {
      const idx = this.table.rows.findIndex(
        (row) => (row as Row).jti === entity.jti,
      );
      if (idx >= 0) {
        this.table.rows[idx] = { ...this.table.rows[idx], ...entity } as T;
        return { ...this.table.rows[idx] };
      }
    }
    return this.table.insert(entity as T);
  }
}
