/**
 * State-transition guard — enforces auth state-transition invariants.
 *
 * This service wraps every sensitive auth entry point with a
 * state-transition validation check.  It ensures:
 *
 * 1. Only legal state transitions are permitted.
 * 2. Rejected transitions leave no side effects.
 * 3. Every transition is logged for audit and forensic analysis.
 *
 * # Usage
 *
 * Inject `StateTransitionGuard` into auth providers and call
 * `validateSessionTransition`, `validateTokenTransition`, or
 * `validateRecoveryTransition` before performing the operation.
 *
 * # Invariants (issue #1644)
 *
 * - **No partial state** — if the transition is rejected, the calling
 *   operation must not execute any state change.
 * - **Deterministic** — given `(currentState, event)`, the next state
 *   is uniquely determined by the transition matrix.
 * - **Auditable** — every transition (legal or rejected) is recorded
 *   in the transition log.
 *
 * # Thread safety
 *
 * This service uses an in-memory store.  For horizontally scaled
 * deployments, replace with Redis or equivalent.
 */

import { Logger } from '@nestjs/common';
import {
  SessionState,
  SessionEvent,
  TokenState,
  TokenEvent,
  RecoveryRequestState,
  RecoveryEvent,
  validateSessionTransition,
  validateTokenTransition,
  validateRecoveryTransition,
  TransitionLog,
} from './auth-state-machine';

/** A tracked entity (session, token, or recovery request). */
interface TrackedEntity {
  sessionId: string;
  sessionState: SessionState;
  accessTokenId?: string;
  tokenState?: TokenState;
  refreshTokenId?: string;
  refreshTokenState?: TokenState;
  recoveryState?: RecoveryRequestState;
}

/**
 * State-transition guard service.
 *
 * Validates every auth entry point against the legal transition matrix
 * and logs every transition for audit.
 */
export class StateTransitionGuardService {
  private readonly logger = new Logger(StateTransitionGuardService.name);

  /** In-memory entity state store. */
  private readonly entityStore = new Map<string, TrackedEntity>();

  /** Append-only transition log. */
  private readonly transitionLog = new TransitionLog();

  // -----------------------------------------------------------------------
  // Session transitions
  // -----------------------------------------------------------------------

  /**
   * Validate a session state transition.
   *
   * @param sessionId - The session identifier.
   * @param event - The event triggering the transition.
   * @returns The next `SessionState` if legal.
   * @throws `InvalidStateTransitionError` if the transition is not in the matrix.
   */
  validateSession(sessionId: string, event: SessionEvent): SessionState {
    const entity = this.entityStore.get(sessionId);
    const currentState = entity?.sessionState ?? SessionState.Expired;

    try {
      const nextState = validateSessionTransition(currentState, event);

      // Record the transition.
      this.transitionLog.record(
        'session',
        sessionId,
        currentState,
        nextState,
        event,
      );

      // Update stored state.
      if (entity) {
        entity.sessionState = nextState;
      } else {
        this.entityStore.set(sessionId, {
          sessionId,
          sessionState: nextState,
        });
      }

      this.logger.debug(
        `session ${sessionId}: ${currentState} → ${nextState} (${event})`,
      );

      return nextState;
    } catch (error) {
      // Log the rejected transition for audit.
      this.transitionLog.record(
        'session',
        sessionId,
        currentState,
        'REJECTED',
        event,
      );

      this.logger.warn(
        `session ${sessionId}: REJECTED ${currentState} → ? (${event})`,
      );

      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Token transitions
  // -----------------------------------------------------------------------

  /**
   * Validate a token state transition.
   *
   * @param tokenType - 'access' or 'refresh'.
   * @param tokenId - The token identifier (jti).
   * @param sessionId - The parent session identifier.
   * @param event - The event triggering the transition.
   * @returns The next `TokenState` if legal.
   * @throws `InvalidStateTransitionError` if the transition is not in the matrix.
   */
  validateToken(
    tokenType: 'access' | 'refresh',
    tokenId: string,
    sessionId: string,
    event: TokenEvent,
  ): TokenState {
    const entity = this.entityStore.get(sessionId);
    const currentState =
      tokenType === 'access'
        ? (entity?.tokenState ?? TokenState.Active)
        : (entity?.refreshTokenState ?? TokenState.Active);

    try {
      const nextState = validateTokenTransition(currentState, event);

      // Record the transition.
      this.transitionLog.record(
        `token:${tokenType}`,
        tokenId,
        currentState,
        nextState,
        event,
      );

      // Update stored state.
      const e = entity ?? {
        sessionId,
        sessionState: SessionState.Active,
      };
      if (tokenType === 'access') {
        e.accessTokenId = tokenId;
        e.tokenState = nextState;
      } else {
        e.refreshTokenId = tokenId;
        e.refreshTokenState = nextState;
      }
      this.entityStore.set(sessionId, e);

      this.logger.debug(
        `${tokenType} token ${tokenId}: ${currentState} → ${nextState} (${event})`,
      );

      return nextState;
    } catch (error) {
      this.transitionLog.record(
        `token:${tokenType}`,
        tokenId,
        currentState,
        'REJECTED',
        event,
      );

      this.logger.warn(
        `${tokenType} token ${tokenId}: REJECTED ${currentState} → ? (${event})`,
      );

      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Recovery transitions
  // -----------------------------------------------------------------------

  /**
   * Validate a recovery request state transition.
   *
   * @param sessionId - The parent session identifier.
   * @param event - The event triggering the transition.
   * @returns The next `RecoveryRequestState` if legal.
   * @throws `InvalidStateTransitionError` if the transition is not in the matrix.
   */
  validateRecovery(
    sessionId: string,
    event: RecoveryEvent,
  ): RecoveryRequestState {
    const entity = this.entityStore.get(sessionId);
    const currentState = entity?.recoveryState ?? RecoveryRequestState.None;

    try {
      const nextState = validateRecoveryTransition(currentState, event);

      // Record the transition.
      this.transitionLog.record(
        'recovery',
        sessionId,
        currentState,
        nextState,
        event,
      );

      // Update stored state.
      const e = entity ?? {
        sessionId,
        sessionState: SessionState.Active,
      };
      e.recoveryState = nextState;
      this.entityStore.set(sessionId, e);

      this.logger.debug(
        `recovery ${sessionId}: ${currentState} → ${nextState} (${event})`,
      );

      return nextState;
    } catch (error) {
      this.transitionLog.record(
        'recovery',
        sessionId,
        currentState,
        'REJECTED',
        event,
      );

      this.logger.warn(
        `recovery ${sessionId}: REJECTED ${currentState} → ? (${event})`,
      );

      throw error;
    }
  }

  // -----------------------------------------------------------------------
  // Query API
  // -----------------------------------------------------------------------

  /** Get the current state of a tracked entity. */
  getEntity(sessionId: string): TrackedEntity | undefined {
    return this.entityStore.get(sessionId);
  }

  /** Get the transition log (read-only). */
  getTransitionLog(): TransitionLog {
    return this.transitionLog;
  }

  /** Get transition log entries for a specific entity. */
  getTransitionsFor(entity: string, entityId: string) {
    return this.transitionLog.entriesFor(entity, entityId);
  }

  /** Remove a tracked entity (e.g. after session deletion). */
  removeEntity(sessionId: string): void {
    this.entityStore.delete(sessionId);
  }
}
