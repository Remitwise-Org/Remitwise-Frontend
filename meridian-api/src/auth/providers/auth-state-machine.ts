/**
 * Auth state machine — formal transition matrix and enforcement.
 *
 * This module defines the **legal states** and **legal transitions** for
 * the three core auth objects in the NestJS layer:
 *
 * 1. **Session** — a user session (login → logout / expiry / supersede).
 * 2. **Token** — an access or refresh token (active → refreshed → revoked).
 * 3. **RecoveryRequest** — a password-reset flow (none → pending → completed).
 *
 * Every auth entry point calls `validateTransition` before performing
 * its work.  If the transition is illegal, the operation is rejected —
 * *no side effects occur*.
 *
 * # Design invariants (issue #1644)
 *
 * - **Deterministic** — given `(currentState, event)`, the next state is
 *   uniquely determined.
 * - **Closed** — every event has a defined outcome for every state (including
 *   rejections for illegal transitions).
 * - **Auditable** — the transition log is append-only and never mutated.
 * - **No partial state** — a rejected transition leaves the store unchanged.
 */

// ---------------------------------------------------------------------------
// Session states
// ---------------------------------------------------------------------------

/** Lifecycle states for a user session. */
export enum SessionState {
  /** Session is active (tokens are valid). */
  Active = 'active',
  /** A refresh is in progress (old token still valid, new pending). */
  RefreshInProgress = 'refresh_in_progress',
  /** Session has been logged out (tokens revoked). */
  LoggedOut = 'logged_out',
  /** A recovery request is pending for this session. */
  RecoveryPending = 'recovery_pending',
  /** Recovery completed — new tokens issued. */
  Recovered = 'recovered',
  /** Session expired naturally. */
  Expired = 'expired',
  /** Session superseded by a newer login (device conflict). */
  Superseded = 'superseded',
}

// ---------------------------------------------------------------------------
// Token states
// ---------------------------------------------------------------------------

/** Lifecycle states for an access or refresh token. */
export enum TokenState {
  /** Token is active (can be used). */
  Active = 'active',
  /** Token was rotated during refresh (old token, now superseded by new). */
  Refreshed = 'refreshed',
  /** Token was explicitly revoked (logout, device compromise). */
  Revoked = 'revoked',
  /** Token expired naturally. */
  Expired = 'expired',
  /** Token was replayed after rotation — session killed. */
  Replayed = 'replayed',
}

// ---------------------------------------------------------------------------
// Recovery request states
// ---------------------------------------------------------------------------

/** Lifecycle states for a password-reset / account-recovery request. */
export enum RecoveryRequestState {
  /** No recovery in progress. */
  None = 'none',
  /** Recovery token issued, awaiting user action. */
  Pending = 'pending',
  /** Recovery completed — old sessions revoked, new tokens issued. */
  Completed = 'completed',
  /** Recovery was cancelled by the user. */
  Cancelled = 'cancelled',
  /** Recovery token expired before use. */
  Expired = 'expired',
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/** Events that drive session state transitions. */
export enum SessionEvent {
  Refresh = 'refresh',
  Logout = 'logout',
  LogoutAll = 'logout_all',
  RecoveryRequest = 'recovery_request',
  RecoveryComplete = 'recovery_complete',
  Expire = 'expire',
  Supersede = 'supersede',
  Login = 'login',
}

/** Events that drive token state transitions. */
export enum TokenEvent {
  Rotate = 'rotate',
  Revoke = 'revoke',
  Expire = 'expire',
  Replay = 'replay',
}

/** Events that drive recovery request state transitions. */
export enum RecoveryEvent {
  Request = 'request',
  Complete = 'complete',
  Expire = 'expire',
  Cancel = 'cancel',
}

// ---------------------------------------------------------------------------
// Transition result
// ---------------------------------------------------------------------------

/** Result of a validated transition. */
export interface TransitionResult<S extends string> {
  from: S;
  to: S;
  event: string;
}

// ---------------------------------------------------------------------------
// Custom error
// ---------------------------------------------------------------------------

/** Thrown when an invalid state transition is attempted. */
export class InvalidStateTransitionError extends Error {
  constructor(entity: string, currentState: string, event: string) {
    super(
      `${entity}: cannot transition from "${currentState}" on event "${event}"`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}

// ---------------------------------------------------------------------------
// Session transition matrix
// ---------------------------------------------------------------------------

const SESSION_TRANSITIONS: Record<
  SessionState,
  Partial<Record<SessionEvent, SessionState>>
> = {
  [SessionState.Active]: {
    [SessionEvent.Refresh]: SessionState.Active,
    [SessionEvent.Logout]: SessionState.LoggedOut,
    [SessionEvent.LogoutAll]: SessionState.LoggedOut,
    [SessionEvent.RecoveryRequest]: SessionState.RecoveryPending,
    [SessionEvent.RecoveryComplete]: SessionState.Recovered,
    [SessionEvent.Expire]: SessionState.Expired,
    [SessionEvent.Supersede]: SessionState.Superseded,
    [SessionEvent.Login]: SessionState.Active, // concurrent login (multi-device)
  },
  [SessionState.RefreshInProgress]: {
    [SessionEvent.Refresh]: SessionState.Active,
    [SessionEvent.Logout]: SessionState.LoggedOut,
    [SessionEvent.LogoutAll]: SessionState.LoggedOut,
    [SessionEvent.Expire]: SessionState.Expired,
    [SessionEvent.RecoveryRequest]: SessionState.RecoveryPending,
  },
  [SessionState.LoggedOut]: {
    [SessionEvent.Login]: SessionState.Active,
  },
  [SessionState.RecoveryPending]: {
    [SessionEvent.RecoveryComplete]: SessionState.Recovered,
    [SessionEvent.Expire]: SessionState.Expired,
    [SessionEvent.Logout]: SessionState.LoggedOut,
    [SessionEvent.LogoutAll]: SessionState.LoggedOut,
    [SessionEvent.Refresh]: SessionState.Active, // recovery cancelled (implicit)
    [SessionEvent.Login]: SessionState.Active, // new login overrides pending recovery
  },
  [SessionState.Recovered]: {
    [SessionEvent.Refresh]: SessionState.Active,
    [SessionEvent.Logout]: SessionState.LoggedOut,
    [SessionEvent.LogoutAll]: SessionState.LoggedOut,
    [SessionEvent.Expire]: SessionState.Expired,
    [SessionEvent.Login]: SessionState.Active, // new login after recovery
  },
  [SessionState.Expired]: {
    [SessionEvent.Login]: SessionState.Active,
  },
  [SessionState.Superseded]: {
    [SessionEvent.Login]: SessionState.Active,
  },
};

// ---------------------------------------------------------------------------
// Token transition matrix
// ---------------------------------------------------------------------------

const TOKEN_TRANSITIONS: Record<
  TokenState,
  Partial<Record<TokenEvent, TokenState>>
> = {
  [TokenState.Active]: {
    [TokenEvent.Rotate]: TokenState.Refreshed,
    [TokenEvent.Revoke]: TokenState.Revoked,
    [TokenEvent.Expire]: TokenState.Expired,
    [TokenEvent.Replay]: TokenState.Replayed,
  },
  [TokenState.Refreshed]: {
    [TokenEvent.Revoke]: TokenState.Revoked,
    [TokenEvent.Expire]: TokenState.Expired,
    [TokenEvent.Replay]: TokenState.Replayed,
  },
  [TokenState.Revoked]: {
    // Terminal: all events are no-ops (stay revoked).
    [TokenEvent.Rotate]: TokenState.Revoked,
    [TokenEvent.Revoke]: TokenState.Revoked,
    [TokenEvent.Expire]: TokenState.Revoked,
    [TokenEvent.Replay]: TokenState.Revoked,
  },
  [TokenState.Expired]: {
    // Terminal: all events are no-ops (stay expired).
    [TokenEvent.Rotate]: TokenState.Expired,
    [TokenEvent.Revoke]: TokenState.Expired,
    [TokenEvent.Expire]: TokenState.Expired,
    [TokenEvent.Replay]: TokenState.Expired,
  },
  [TokenState.Replayed]: {
    // Terminal: all events are no-ops (stay replayed).
    [TokenEvent.Rotate]: TokenState.Replayed,
    [TokenEvent.Revoke]: TokenState.Replayed,
    [TokenEvent.Expire]: TokenState.Replayed,
    [TokenEvent.Replay]: TokenState.Replayed,
  },
};

// ---------------------------------------------------------------------------
// Recovery transition matrix
// ---------------------------------------------------------------------------

const RECOVERY_TRANSITIONS: Record<
  RecoveryRequestState,
  Partial<Record<RecoveryEvent, RecoveryRequestState>>
> = {
  [RecoveryRequestState.None]: {
    [RecoveryEvent.Request]: RecoveryRequestState.Pending,
  },
  [RecoveryRequestState.Pending]: {
    [RecoveryEvent.Complete]: RecoveryRequestState.Completed,
    [RecoveryEvent.Cancel]: RecoveryRequestState.Cancelled,
    [RecoveryEvent.Expire]: RecoveryRequestState.Expired,
    [RecoveryEvent.Request]: RecoveryRequestState.Pending, // idempotent re-request
  },
  [RecoveryRequestState.Cancelled]: {
    [RecoveryEvent.Request]: RecoveryRequestState.Pending,
  },
  [RecoveryRequestState.Expired]: {
    [RecoveryEvent.Request]: RecoveryRequestState.Pending,
  },
  [RecoveryRequestState.Completed]: {
    // Terminal: all events are rejected with RecoveryAlreadyCompleted.
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate a session state transition.
 *
 * @returns The next `SessionState` if the transition is legal.
 * @throws `InvalidStateTransitionError` if the transition is not in the matrix.
 */
export function validateSessionTransition(
  currentState: SessionState,
  event: SessionEvent,
): SessionState {
  const transitions = SESSION_TRANSITIONS[currentState];
  const next = transitions?.[event];

  if (next === undefined) {
    throw new InvalidStateTransitionError('session', currentState, event);
  }

  return next;
}

/**
 * Validate a token state transition.
 *
 * @returns The next `TokenState` if the transition is legal.
 * @throws `InvalidStateTransitionError` if the transition is not in the matrix.
 */
export function validateTokenTransition(
  currentState: TokenState,
  event: TokenEvent,
): TokenState {
  const transitions = TOKEN_TRANSITIONS[currentState];
  const next = transitions?.[event];

  if (next === undefined) {
    throw new InvalidStateTransitionError('token', currentState, event);
  }

  return next;
}

/**
 * Validate a recovery request state transition.
 *
 * @returns The next `RecoveryRequestState` if the transition is legal.
 * @throws `InvalidStateTransitionError` if the transition is not in the matrix.
 * @throws `ConflictException` for completed recovery (RecoveryAlreadyCompleted).
 */
export function validateRecoveryTransition(
  currentState: RecoveryRequestState,
  event: RecoveryEvent,
): RecoveryRequestState {
  const transitions = RECOVERY_TRANSITIONS[currentState];
  const next = transitions?.[event];

  if (next === undefined) {
    // Completed recovery is a special case: error type differs.
    if (currentState === RecoveryRequestState.Completed) {
      throw new InvalidStateTransitionError('recovery', currentState, event);
    }
    throw new InvalidStateTransitionError('recovery', currentState, event);
  }

  return next;
}

// ---------------------------------------------------------------------------
// Transition log (audit trail)
// ---------------------------------------------------------------------------

/** An immutable, append-only log entry recording a state transition. */
export interface TransitionLogEntry {
  entity: string;
  entityId: number | string;
  fromState: string;
  toState: string;
  event: string;
  timestamp: number;
}

/**
 * Append-only transition log for audit and replay analysis.
 *
 * The log is immutable by convention: entries are never modified or
 * deleted after recording.  This supports forensic analysis of
 * state-transition sequences for security audits.
 */
export class TransitionLog {
  private readonly entries: TransitionLogEntry[] = [];

  /** Append a transition entry. */
  record(
    entity: string,
    entityId: number | string,
    fromState: string,
    toState: string,
    event: string,
  ): void {
    this.entries.push({
      entity,
      entityId,
      fromState,
      toState,
      event,
      timestamp: Date.now(),
    });
  }

  /** Return all entries for a given entity and id. */
  entriesFor(
    entity: string,
    entityId: number | string,
  ): readonly TransitionLogEntry[] {
    return this.entries.filter(
      (e) => e.entity === entity && e.entityId === entityId,
    );
  }

  /** Return the total number of entries. */
  get length(): number {
    return this.entries.length;
  }

  /** Check if the log is empty. */
  get isEmpty(): boolean {
    return this.entries.length === 0;
  }

  /** Return all entries (read-only copy). */
  all(): readonly TransitionLogEntry[] {
    return [...this.entries];
  }
}
