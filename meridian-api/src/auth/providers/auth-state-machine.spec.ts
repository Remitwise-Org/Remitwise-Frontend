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
  InvalidStateTransitionError,
  TransitionLog,
} from './auth-state-machine';

describe('Auth State Machine (issue #1644)', () => {
  // =====================================================================
  // Session transitions — exhaustive matrix
  // =====================================================================

  describe('Session transitions', () => {
    describe('terminal states → login', () => {
      const terminalStates = [
        SessionState.LoggedOut,
        SessionState.Expired,
        SessionState.Superseded,
      ];

      terminalStates.forEach((state) => {
        it(`transitions from ${state} to Active on Login`, () => {
          expect(validateSessionTransition(state, SessionEvent.Login)).toBe(
            SessionState.Active,
          );
        });
      });
    });

    describe('Active state — all events legal', () => {
      const expected: [SessionEvent, SessionState][] = [
        [SessionEvent.Refresh, SessionState.Active],
        [SessionEvent.Logout, SessionState.LoggedOut],
        [SessionEvent.LogoutAll, SessionState.LoggedOut],
        [SessionEvent.RecoveryRequest, SessionState.RecoveryPending],
        [SessionEvent.RecoveryComplete, SessionState.Recovered],
        [SessionEvent.Expire, SessionState.Expired],
        [SessionEvent.Supersede, SessionState.Superseded],
        [SessionEvent.Login, SessionState.Active],
      ];

      expected.forEach(([event, expectedState]) => {
        it(`Active + ${event} → ${expectedState}`, () => {
          expect(validateSessionTransition(SessionState.Active, event)).toBe(
            expectedState,
          );
        });
      });
    });

    describe('RefreshInProgress — limited events', () => {
      const legal: [SessionEvent, SessionState][] = [
        [SessionEvent.Refresh, SessionState.Active],
        [SessionEvent.Logout, SessionState.LoggedOut],
        [SessionEvent.LogoutAll, SessionState.LoggedOut],
        [SessionEvent.Expire, SessionState.Expired],
        [SessionEvent.RecoveryRequest, SessionState.RecoveryPending],
      ];

      legal.forEach(([event, expectedState]) => {
        it(`RefreshInProgress + ${event} → ${expectedState}`, () => {
          expect(
            validateSessionTransition(SessionState.RefreshInProgress, event),
          ).toBe(expectedState);
        });
      });

      const illegal = [
        SessionEvent.RecoveryComplete,
        SessionEvent.Supersede,
        SessionEvent.Login,
      ];

      illegal.forEach((event) => {
        it(`RefreshInProgress + ${event} → throws`, () => {
          expect(() =>
            validateSessionTransition(SessionState.RefreshInProgress, event),
          ).toThrow(InvalidStateTransitionError);
        });
      });
    });

    describe('RecoveryPending — legal events', () => {
      const legal: [SessionEvent, SessionState][] = [
        [SessionEvent.RecoveryComplete, SessionState.Recovered],
        [SessionEvent.Expire, SessionState.Expired],
        [SessionEvent.Logout, SessionState.LoggedOut],
        [SessionEvent.LogoutAll, SessionState.LoggedOut],
        [SessionEvent.Refresh, SessionState.Active], // recovery cancelled
        [SessionEvent.Login, SessionState.Active], // new login overrides
      ];

      legal.forEach(([event, expectedState]) => {
        it(`RecoveryPending + ${event} → ${expectedState}`, () => {
          expect(
            validateSessionTransition(SessionState.RecoveryPending, event),
          ).toBe(expectedState);
        });
      });
    });

    describe('Recovered — can continue', () => {
      const legal: [SessionEvent, SessionState][] = [
        [SessionEvent.Refresh, SessionState.Active],
        [SessionEvent.Logout, SessionState.LoggedOut],
        [SessionEvent.LogoutAll, SessionState.LoggedOut],
        [SessionEvent.Expire, SessionState.Expired],
        [SessionEvent.Login, SessionState.Active],
      ];

      legal.forEach(([event, expectedState]) => {
        it(`Recovered + ${event} → ${expectedState}`, () => {
          expect(validateSessionTransition(SessionState.Recovered, event)).toBe(
            expectedState,
          );
        });
      });
    });

    describe('terminal states — only Login is legal', () => {
      const terminals = [
        SessionState.LoggedOut,
        SessionState.Expired,
        SessionState.Superseded,
      ];
      const allEvents = [
        SessionEvent.Refresh,
        SessionEvent.Logout,
        SessionEvent.LogoutAll,
        SessionEvent.RecoveryRequest,
        SessionEvent.RecoveryComplete,
        SessionEvent.Expire,
        SessionEvent.Supersede,
      ];

      terminals.forEach((terminal) => {
        allEvents.forEach((event) => {
          it(`${terminal} + ${event} → throws`, () => {
            expect(() => validateSessionTransition(terminal, event)).toThrow(
              InvalidStateTransitionError,
            );
          });
        });
      });
    });
  });

  // =====================================================================
  // Token transitions — exhaustive matrix
  // =====================================================================

  describe('Token transitions', () => {
    describe('Active — all events legal', () => {
      const expected: [TokenEvent, TokenState][] = [
        [TokenEvent.Rotate, TokenState.Refreshed],
        [TokenEvent.Revoke, TokenState.Revoked],
        [TokenEvent.Expire, TokenState.Expired],
        [TokenEvent.Replay, TokenState.Replayed],
      ];

      expected.forEach(([event, expectedState]) => {
        it(`Active + ${event} → ${expectedState}`, () => {
          expect(validateTokenTransition(TokenState.Active, event)).toBe(
            expectedState,
          );
        });
      });
    });

    describe('Refreshed — limited events', () => {
      const legal: [TokenEvent, TokenState][] = [
        [TokenEvent.Revoke, TokenState.Revoked],
        [TokenEvent.Expire, TokenState.Expired],
        [TokenEvent.Replay, TokenState.Replayed],
      ];

      legal.forEach(([event, expectedState]) => {
        it(`Refreshed + ${event} → ${expectedState}`, () => {
          expect(validateTokenTransition(TokenState.Refreshed, event)).toBe(
            expectedState,
          );
        });
      });

      it('Refreshed + Rotate → throws', () => {
        expect(() =>
          validateTokenTransition(TokenState.Refreshed, TokenEvent.Rotate),
        ).toThrow(InvalidStateTransitionError);
      });
    });

    describe('terminal states — all events are no-ops', () => {
      const terminals = [
        TokenState.Revoked,
        TokenState.Expired,
        TokenState.Replayed,
      ];
      const allEvents = [
        TokenEvent.Rotate,
        TokenEvent.Revoke,
        TokenEvent.Expire,
        TokenEvent.Replay,
      ];

      terminals.forEach((terminal) => {
        allEvents.forEach((event) => {
          it(`${terminal} + ${event} stays ${terminal}`, () => {
            expect(validateTokenTransition(terminal, event)).toBe(terminal);
          });
        });
      });
    });
  });

  // =====================================================================
  // Recovery transitions — exhaustive matrix
  // =====================================================================

  describe('Recovery transitions', () => {
    describe('None + Request → Pending', () => {
      it('transitions from None to Pending on Request', () => {
        expect(
          validateRecoveryTransition(
            RecoveryRequestState.None,
            RecoveryEvent.Request,
          ),
        ).toBe(RecoveryRequestState.Pending);
      });
    });

    describe('Pending — all events legal', () => {
      const expected: [RecoveryEvent, RecoveryRequestState][] = [
        [RecoveryEvent.Complete, RecoveryRequestState.Completed],
        [RecoveryEvent.Cancel, RecoveryRequestState.Cancelled],
        [RecoveryEvent.Expire, RecoveryRequestState.Expired],
        [RecoveryEvent.Request, RecoveryRequestState.Pending], // idempotent
      ];

      expected.forEach(([event, expectedState]) => {
        it(`Pending + ${event} → ${expectedState}`, () => {
          expect(
            validateRecoveryTransition(RecoveryRequestState.Pending, event),
          ).toBe(expectedState);
        });
      });
    });

    describe('Completed — terminal', () => {
      const allEvents = [
        RecoveryEvent.Request,
        RecoveryEvent.Complete,
        RecoveryEvent.Cancel,
        RecoveryEvent.Expire,
      ];

      allEvents.forEach((event) => {
        it(`Completed + ${event} → throws`, () => {
          expect(() =>
            validateRecoveryTransition(RecoveryRequestState.Completed, event),
          ).toThrow(InvalidStateTransitionError);
        });
      });
    });

    describe('Cancelled/Expired — can re-request', () => {
      [RecoveryRequestState.Cancelled, RecoveryRequestState.Expired].forEach(
        (state) => {
          it(`${state} + Request → Pending`, () => {
            expect(
              validateRecoveryTransition(state, RecoveryEvent.Request),
            ).toBe(RecoveryRequestState.Pending);
          });
        },
      );
    });

    describe('Illegal transitions from None', () => {
      [
        RecoveryEvent.Complete,
        RecoveryEvent.Cancel,
        RecoveryEvent.Expire,
      ].forEach((event) => {
        it(`None + ${event} → throws`, () => {
          expect(() =>
            validateRecoveryTransition(RecoveryRequestState.None, event),
          ).toThrow(InvalidStateTransitionError);
        });
      });
    });
  });

  // =====================================================================
  // Full lifecycle integration tests
  // =====================================================================

  describe('Full lifecycle integration', () => {
    it('login → refresh → logout → re-login', () => {
      let state = validateSessionTransition(
        SessionState.LoggedOut,
        SessionEvent.Login,
      );
      expect(state).toBe(SessionState.Active);

      state = validateSessionTransition(state, SessionEvent.Refresh);
      expect(state).toBe(SessionState.Active);

      state = validateSessionTransition(state, SessionEvent.Logout);
      expect(state).toBe(SessionState.LoggedOut);

      state = validateSessionTransition(state, SessionEvent.Login);
      expect(state).toBe(SessionState.Active);
    });

    it('login → recovery request → recovery complete → re-login', () => {
      let state = validateSessionTransition(
        SessionState.LoggedOut,
        SessionEvent.Login,
      );
      expect(state).toBe(SessionState.Active);

      state = validateSessionTransition(state, SessionEvent.RecoveryRequest);
      expect(state).toBe(SessionState.RecoveryPending);

      state = validateSessionTransition(state, SessionEvent.RecoveryComplete);
      expect(state).toBe(SessionState.Recovered);

      state = validateSessionTransition(state, SessionEvent.Login);
      expect(state).toBe(SessionState.Active);
    });

    it('token lifecycle: active → rotate → revoke', () => {
      let state = validateTokenTransition(TokenState.Active, TokenEvent.Rotate);
      expect(state).toBe(TokenState.Refreshed);

      state = validateTokenTransition(state, TokenEvent.Revoke);
      expect(state).toBe(TokenState.Revoked);

      // Terminal — stays revoked.
      state = validateTokenTransition(state, TokenEvent.Revoke);
      expect(state).toBe(TokenState.Revoked);
    });

    it('token replay detection: active → rotate → replay', () => {
      let state = validateTokenTransition(TokenState.Active, TokenEvent.Rotate);
      expect(state).toBe(TokenState.Refreshed);

      state = validateTokenTransition(state, TokenEvent.Replay);
      expect(state).toBe(TokenState.Replayed);
    });

    it('recovery full lifecycle: none → request → complete', () => {
      let state = validateRecoveryTransition(
        RecoveryRequestState.None,
        RecoveryEvent.Request,
      );
      expect(state).toBe(RecoveryRequestState.Pending);

      state = validateRecoveryTransition(state, RecoveryEvent.Complete);
      expect(state).toBe(RecoveryRequestState.Completed);
    });

    it('recovery cancel then retry: none → request → cancel → request → complete', () => {
      let state = validateRecoveryTransition(
        RecoveryRequestState.None,
        RecoveryEvent.Request,
      );
      expect(state).toBe(RecoveryRequestState.Pending);

      state = validateRecoveryTransition(state, RecoveryEvent.Cancel);
      expect(state).toBe(RecoveryRequestState.Cancelled);

      state = validateRecoveryTransition(state, RecoveryEvent.Request);
      expect(state).toBe(RecoveryRequestState.Pending);

      state = validateRecoveryTransition(state, RecoveryEvent.Complete);
      expect(state).toBe(RecoveryRequestState.Completed);
    });

    it('recovery expire then retry: none → request → expire → request → complete', () => {
      let state = validateRecoveryTransition(
        RecoveryRequestState.None,
        RecoveryEvent.Request,
      );
      state = validateRecoveryTransition(state, RecoveryEvent.Expire);
      expect(state).toBe(RecoveryRequestState.Expired);

      state = validateRecoveryTransition(state, RecoveryEvent.Request);
      expect(state).toBe(RecoveryRequestState.Pending);

      state = validateRecoveryTransition(state, RecoveryEvent.Complete);
      expect(state).toBe(RecoveryRequestState.Completed);
    });
  });

  // =====================================================================
  // Edge cases: stale, repeated, out-of-order transitions
  // =====================================================================

  describe('Edge cases — stale, repeated, out-of-order', () => {
    it('stale token revoke is idempotent', () => {
      expect(
        validateTokenTransition(TokenState.Revoked, TokenEvent.Revoke),
      ).toBe(TokenState.Revoked);
    });

    it('stale token expire is idempotent', () => {
      expect(
        validateTokenTransition(TokenState.Expired, TokenEvent.Expire),
      ).toBe(TokenState.Expired);
    });

    it('repeated recovery request is idempotent', () => {
      expect(
        validateRecoveryTransition(
          RecoveryRequestState.Pending,
          RecoveryEvent.Request,
        ),
      ).toBe(RecoveryRequestState.Pending);
    });

    it('out-of-order: complete after expire fails', () => {
      let state = validateRecoveryTransition(
        RecoveryRequestState.None,
        RecoveryEvent.Request,
      );
      state = validateRecoveryTransition(state, RecoveryEvent.Expire);
      expect(state).toBe(RecoveryRequestState.Expired);

      expect(() =>
        validateRecoveryTransition(state, RecoveryEvent.Complete),
      ).toThrow(InvalidStateTransitionError);
    });

    it('concurrent refresh and logout: first event wins', () => {
      let state = validateSessionTransition(
        SessionState.Active,
        SessionEvent.Refresh,
      );
      expect(state).toBe(SessionState.Active);

      state = validateSessionTransition(state, SessionEvent.Logout);
      expect(state).toBe(SessionState.LoggedOut);
    });
  });

  // =====================================================================
  // InvalidStateTransitionError
  // =====================================================================

  describe('InvalidStateTransitionError', () => {
    it('has the correct name', () => {
      const err = new InvalidStateTransitionError(
        'session',
        'active',
        'invalid_event',
      );
      expect(err.name).toBe('InvalidStateTransitionError');
    });

    it('includes entity, current state, and event in the message', () => {
      const err = new InvalidStateTransitionError('token', 'revoked', 'rotate');
      expect(err.message).toContain('token');
      expect(err.message).toContain('revoked');
      expect(err.message).toContain('rotate');
    });

    it('is an instance of Error', () => {
      const err = new InvalidStateTransitionError('session', 'active', 'foo');
      expect(err).toBeInstanceOf(Error);
    });
  });

  // =====================================================================
  // Transition log
  // =====================================================================

  describe('TransitionLog', () => {
    let log: TransitionLog;

    beforeEach(() => {
      log = new TransitionLog();
    });

    it('starts empty', () => {
      expect(log.isEmpty).toBe(true);
      expect(log.length).toBe(0);
    });

    it('records entries', () => {
      log.record('session', 1, 'logged_out', 'active', 'login');
      log.record('session', 1, 'active', 'active', 'refresh');
      log.record('session', 2, 'logged_out', 'active', 'login');

      expect(log.length).toBe(3);
      expect(log.isEmpty).toBe(false);
    });

    it('filters entries by entity and id', () => {
      log.record('session', 1, 'logged_out', 'active', 'login');
      log.record('session', 1, 'active', 'active', 'refresh');
      log.record('session', 2, 'logged_out', 'active', 'login');

      const entries = log.entriesFor('session', 1);
      expect(entries).toHaveLength(2);
      expect(entries[0].fromState).toBe('logged_out');
      expect(entries[1].event).toBe('refresh');

      // Different entity id — no entries.
      expect(log.entriesFor('session', 99)).toHaveLength(0);
    });

    it('returns all entries via all()', () => {
      log.record('token', 1, 'active', 'refreshed', 'rotate');
      log.record('token', 1, 'refreshed', 'revoked', 'revoke');

      const all = log.all();
      expect(all).toHaveLength(2);
      expect(all[0].toState).toBe('refreshed');
      expect(all[1].toState).toBe('revoked');
    });

    it('is append-only (entries are in order)', () => {
      log.record('token', 1, 'active', 'refreshed', 'rotate');
      log.record('token', 1, 'refreshed', 'revoked', 'revoke');

      const entries = log.entriesFor('token', 1);
      expect(entries[0].toState).toBe('refreshed');
      expect(entries[1].toState).toBe('revoked');
    });

    it('includes timestamps', () => {
      const before = Date.now();
      log.record('session', 1, 'active', 'active', 'refresh');
      const after = Date.now();

      const entries = log.entriesFor('session', 1);
      expect(entries[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(entries[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('returns a new array from entriesFor (no mutation)', () => {
      log.record('session', 1, 'active', 'active', 'refresh');
      const entries1 = log.entriesFor('session', 1);
      const entries2 = log.entriesFor('session', 1);
      expect(entries1).not.toBe(entries2); // different array references
      expect(entries1).toEqual(entries2); // same content
    });
  });
});
