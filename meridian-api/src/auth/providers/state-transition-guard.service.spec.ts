import {
  SessionState,
  SessionEvent,
  TokenState,
  TokenEvent,
  RecoveryRequestState,
  RecoveryEvent,
  InvalidStateTransitionError,
} from './auth-state-machine';
import { StateTransitionGuardService } from './state-transition-guard.service';

describe('StateTransitionGuardService (issue #1644)', () => {
  let guard: StateTransitionGuardService;

  beforeEach(() => {
    guard = new StateTransitionGuardService();
  });

  // =====================================================================
  // Session transitions
  // =====================================================================

  describe('validateSession', () => {
    it('allows login from expired (default) state', () => {
      const next = guard.validateSession('s1', SessionEvent.Login);
      expect(next).toBe(SessionState.Active);
    });

    it('allows logout from active state', () => {
      guard.validateSession('s1', SessionEvent.Login);
      const next = guard.validateSession('s1', SessionEvent.Logout);
      expect(next).toBe(SessionState.LoggedOut);
    });

    it('allows refresh from active state', () => {
      guard.validateSession('s1', SessionEvent.Login);
      const next = guard.validateSession('s1', SessionEvent.Refresh);
      expect(next).toBe(SessionState.Active);
    });

    it('rejects refresh from expired state', () => {
      expect(() => guard.validateSession('s1', SessionEvent.Refresh)).toThrow(
        InvalidStateTransitionError,
      );
    });

    it('rejects logout from expired state', () => {
      expect(() => guard.validateSession('s1', SessionEvent.Logout)).toThrow(
        InvalidStateTransitionError,
      );
    });

    it('tracks state across multiple operations', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateSession('s1', SessionEvent.Refresh);
      guard.validateSession('s1', SessionEvent.RecoveryRequest);
      const next = guard.validateSession('s1', SessionEvent.RecoveryComplete);
      expect(next).toBe(SessionState.Recovered);
    });

    it('allows login from logged out state', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateSession('s1', SessionEvent.Logout);
      const next = guard.validateSession('s1', SessionEvent.Login);
      expect(next).toBe(SessionState.Active);
    });

    it('handles concurrent logins for different sessions', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateSession('s2', SessionEvent.Login);

      const e1 = guard.getEntity('s1');
      const e2 = guard.getEntity('s2');
      expect(e1?.sessionState).toBe(SessionState.Active);
      expect(e2?.sessionState).toBe(SessionState.Active);
    });

    it('handles concurrent login on same session (multi-device)', () => {
      guard.validateSession('s1', SessionEvent.Login);
      const next = guard.validateSession('s1', SessionEvent.Login);
      expect(next).toBe(SessionState.Active);
    });

    it('logs rejected transitions', () => {
      try {
        guard.validateSession('s1', SessionEvent.Refresh);
      } catch {
        // Expected
      }

      const log = guard.getTransitionLog();
      expect(log.length).toBe(1);
      expect(log.all()[0].toState).toBe('REJECTED');
    });
  });

  // =====================================================================
  // Token transitions
  // =====================================================================

  describe('validateToken', () => {
    it('allows rotate on active access token', () => {
      guard.validateSession('s1', SessionEvent.Login);
      const next = guard.validateToken(
        'access',
        'tok1',
        's1',
        TokenEvent.Rotate,
      );
      expect(next).toBe(TokenState.Refreshed);
    });

    it('allows revoke on active access token', () => {
      guard.validateSession('s1', SessionEvent.Login);
      const next = guard.validateToken(
        'access',
        'tok1',
        's1',
        TokenEvent.Revoke,
      );
      expect(next).toBe(TokenState.Revoked);
    });

    it('allows rotate on active refresh token', () => {
      guard.validateSession('s1', SessionEvent.Login);
      const next = guard.validateToken(
        'refresh',
        'rtok1',
        's1',
        TokenEvent.Rotate,
      );
      expect(next).toBe(TokenState.Refreshed);
    });

    it('rejects rotate on refreshed token', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateToken('access', 'tok1', 's1', TokenEvent.Rotate);
      expect(() =>
        guard.validateToken('access', 'tok1', 's1', TokenEvent.Rotate),
      ).toThrow(InvalidStateTransitionError);
    });

    it('handles replay detection', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateToken('refresh', 'rtok1', 's1', TokenEvent.Rotate);
      const next = guard.validateToken(
        'refresh',
        'rtok1',
        's1',
        TokenEvent.Replay,
      );
      expect(next).toBe(TokenState.Replayed);
    });

    it('tracks access and refresh tokens independently', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateToken('access', 'tok1', 's1', TokenEvent.Rotate);
      guard.validateToken('refresh', 'rtok1', 's1', TokenEvent.Rotate);

      const entity = guard.getEntity('s1');
      expect(entity?.tokenState).toBe(TokenState.Refreshed);
      expect(entity?.refreshTokenState).toBe(TokenState.Refreshed);
    });

    it('records transitions in the log', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateToken('access', 'tok1', 's1', TokenEvent.Rotate);

      const log = guard.getTransitionLog();
      const tokenTransitions = log.entriesFor('token:access', 'tok1');
      expect(tokenTransitions).toHaveLength(1);
      expect(tokenTransitions[0].fromState).toBe('active');
      expect(tokenTransitions[0].toState).toBe('refreshed');
    });
  });

  // =====================================================================
  // Recovery transitions
  // =====================================================================

  describe('validateRecovery', () => {
    it('allows request from none state', () => {
      const next = guard.validateRecovery('s1', RecoveryEvent.Request);
      expect(next).toBe(RecoveryRequestState.Pending);
    });

    it('allows complete from pending state', () => {
      guard.validateRecovery('s1', RecoveryEvent.Request);
      const next = guard.validateRecovery('s1', RecoveryEvent.Complete);
      expect(next).toBe(RecoveryRequestState.Completed);
    });

    it('allows cancel from pending state', () => {
      guard.validateRecovery('s1', RecoveryEvent.Request);
      const next = guard.validateRecovery('s1', RecoveryEvent.Cancel);
      expect(next).toBe(RecoveryRequestState.Cancelled);
    });

    it('allows expire from pending state', () => {
      guard.validateRecovery('s1', RecoveryEvent.Request);
      const next = guard.validateRecovery('s1', RecoveryEvent.Expire);
      expect(next).toBe(RecoveryRequestState.Expired);
    });

    it('rejects complete from none state', () => {
      expect(() =>
        guard.validateRecovery('s1', RecoveryEvent.Complete),
      ).toThrow(InvalidStateTransitionError);
    });

    it('allows re-request after cancellation', () => {
      guard.validateRecovery('s1', RecoveryEvent.Request);
      guard.validateRecovery('s1', RecoveryEvent.Cancel);
      const next = guard.validateRecovery('s1', RecoveryEvent.Request);
      expect(next).toBe(RecoveryRequestState.Pending);
    });

    it('allows re-request after expiry', () => {
      guard.validateRecovery('s1', RecoveryEvent.Request);
      guard.validateRecovery('s1', RecoveryEvent.Expire);
      const next = guard.validateRecovery('s1', RecoveryEvent.Request);
      expect(next).toBe(RecoveryRequestState.Pending);
    });

    it('rejects all events from completed state', () => {
      guard.validateRecovery('s1', RecoveryEvent.Request);
      guard.validateRecovery('s1', RecoveryEvent.Complete);

      const events = [
        RecoveryEvent.Request,
        RecoveryEvent.Complete,
        RecoveryEvent.Cancel,
        RecoveryEvent.Expire,
      ];

      events.forEach((event) => {
        expect(() => guard.validateRecovery('s1', event)).toThrow(
          InvalidStateTransitionError,
        );
      });
    });

    it('handles idempotent re-request from pending state', () => {
      guard.validateRecovery('s1', RecoveryEvent.Request);
      const next = guard.validateRecovery('s1', RecoveryEvent.Request);
      expect(next).toBe(RecoveryRequestState.Pending);
    });
  });

  // =====================================================================
  // Query API
  // =====================================================================

  describe('getEntity', () => {
    it('returns undefined for unknown session', () => {
      expect(guard.getEntity('unknown')).toBeUndefined();
    });

    it('returns entity after session creation', () => {
      guard.validateSession('s1', SessionEvent.Login);
      const entity = guard.getEntity('s1');
      expect(entity).toBeDefined();
      expect(entity?.sessionId).toBe('s1');
      expect(entity?.sessionState).toBe(SessionState.Active);
    });

    it('updates entity state on transitions', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateSession('s1', SessionEvent.Logout);
      const entity = guard.getEntity('s1');
      expect(entity?.sessionState).toBe(SessionState.LoggedOut);
    });
  });

  describe('removeEntity', () => {
    it('removes a tracked entity', () => {
      guard.validateSession('s1', SessionEvent.Login);
      expect(guard.getEntity('s1')).toBeDefined();

      guard.removeEntity('s1');
      expect(guard.getEntity('s1')).toBeUndefined();
    });

    it('removing unknown entity is a no-op', () => {
      guard.removeEntity('unknown');
      // No error thrown.
    });
  });

  describe('getTransitionLog', () => {
    it('returns the transition log', () => {
      const log = guard.getTransitionLog();
      expect(log).toBeDefined();
      expect(log.isEmpty).toBe(true);
    });

    it('accumulates entries across operations', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateSession('s1', SessionEvent.Refresh);
      guard.validateSession('s1', SessionEvent.Logout);

      const log = guard.getTransitionLog();
      expect(log.length).toBe(3);
    });
  });

  describe('getTransitionsFor', () => {
    it('returns transitions for a specific entity', () => {
      guard.validateSession('s1', SessionEvent.Login);
      guard.validateSession('s1', SessionEvent.Logout);
      guard.validateSession('s2', SessionEvent.Login);

      const transitions = guard.getTransitionsFor('session', 's1');
      expect(transitions).toHaveLength(2);
    });
  });

  // =====================================================================
  // Full lifecycle integration via guard
  // =====================================================================

  describe('Full lifecycle via guard', () => {
    it('complete sign-in → refresh → logout → re-login cycle', () => {
      // Login
      let state = guard.validateSession('s1', SessionEvent.Login);
      expect(state).toBe(SessionState.Active);

      // Refresh
      state = guard.validateSession('s1', SessionEvent.Refresh);
      expect(state).toBe(SessionState.Active);

      // Logout
      state = guard.validateSession('s1', SessionEvent.Logout);
      expect(state).toBe(SessionState.LoggedOut);

      // Re-login
      state = guard.validateSession('s1', SessionEvent.Login);
      expect(state).toBe(SessionState.Active);

      // Verify log has all transitions.
      const log = guard.getTransitionLog();
      expect(log.length).toBe(4);
    });

    it('complete recovery cycle', () => {
      guard.validateSession('s1', SessionEvent.Login);

      // Request recovery.
      let rState = guard.validateRecovery('s1', RecoveryEvent.Request);
      expect(rState).toBe(RecoveryRequestState.Pending);

      // Complete recovery.
      rState = guard.validateRecovery('s1', RecoveryEvent.Complete);
      expect(rState).toBe(RecoveryRequestState.Completed);

      // Session should reflect recovery.
      const session = guard.getEntity('s1');
      expect(session?.recoveryState).toBe(RecoveryRequestState.Completed);
    });

    it('token rotation lifecycle', () => {
      guard.validateSession('s1', SessionEvent.Login);

      // Rotate access token.
      let tState = guard.validateToken(
        'access',
        'tok1',
        's1',
        TokenEvent.Rotate,
      );
      expect(tState).toBe(TokenState.Refreshed);

      // Rotate refresh token.
      tState = guard.validateToken('refresh', 'rtok1', 's1', TokenEvent.Rotate);
      expect(tState).toBe(TokenState.Refreshed);

      // Revoke access token.
      tState = guard.validateToken('access', 'tok1', 's1', TokenEvent.Revoke);
      expect(tState).toBe(TokenState.Revoked);
    });

    it('replay detection lifecycle', () => {
      guard.validateSession('s1', SessionEvent.Login);

      // Rotate refresh token.
      guard.validateToken('refresh', 'rtok1', 's1', TokenEvent.Rotate);

      // Replay the old refresh token.
      const tState = guard.validateToken(
        'refresh',
        'rtok1',
        's1',
        TokenEvent.Replay,
      );
      expect(tState).toBe(TokenState.Replayed);
    });
  });
});
