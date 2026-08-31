/**
 * useEmergencyTransfer
 *
 * Manages the full lifecycle of an emergency-transfer operation:
 *
 *   idle → reviewing → confirmed → submitting → succeeded | failed
 *                   ↘ expired | config_changed | unauthorized | capability_revoked | dismissed
 *
 * Security guarantees
 * -------------------
 * 1. The confirmation payload is constructed once (in `bindConfirmation`) and
 *    stored in a ref.  It is never updated after that point — the sign step
 *    reads only from the ref, never from component state.
 * 2. Before every submit the hook re-validates:
 *      a. The config has not expired.
 *      b. The live config still matches the reviewed config (stale-state check).
 *      c. The user is still authorised.
 *      d. No submit is already in flight (duplicate-submit guard).
 *      e. The server-derived capability is still granted (when a
 *         `capabilityResolver` is provided).
 * 3. An expiry timer runs while the hook is in the `reviewing` or `confirmed`
 *    state and transitions to `expired` automatically.
 * 4. If the caller replaces `config` between review and sign the hook
 *    transitions to `config_changed` and requires a fresh review.
 * 5. Capability gating (issue #1633): authority to mutate is re-derived from
 *    the server, never from the config claim.  `bindConfirmation` refuses to
 *    bind without a fresh grant; `submit` re-resolves and re-verified the
 *    capability version.  A denied / expired / version-bumped capability
 *    transitions to `capability_revoked`, invalidating any pending
 *    confirmation before the provider is called.
 */

'use client'

import {
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from 'react'

import {
  isConfigExpired,
  configsMatch,
  type EmergencyTransferConfig,
} from '@/models/emergency-transfer-config'

import {
  createEvent,
  deriveBindingKey,
  type EmergencyTransferEvent,
  type ReviewStartedEvent,
  type RiskAcknowledgedEvent,
  type RiskUnacknowledgedEvent,
  type ConfirmationBoundEvent,
  type SubmitAttemptedEvent,
  type SubmitSucceededEvent,
  type SubmitFailedEvent,
  type DuplicateBlockedEvent,
  type ConflictingKeyReusedEvent,
  type ExpiredEvent,
  type ConfigChangedEvent,
  type UnauthorizedEvent,
  type DismissedEvent,
} from '@/models/emergency-transfer-event'

import {
  ConfirmationPayloadSchema,
  RISK_ACKNOWLEDGEMENT_TEXT,
  assertPayloadMatchesConfig,
  type ConfirmationPayload,
} from '@/lib/validations/emergency-transfer'

import {
  isCapabilityUsable,
  type GrantedTransferCapability,
  type TransferCapability,
} from '@/models/emergency-transfer-capability'
import type { TransferCapabilityResolver } from '@/lib/api/transfer-capability'

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

export type TransferPhase =
  | 'idle'
  | 'reviewing'
  | 'confirmed'
  | 'submitting'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'config_changed'
  | 'unauthorized'
  | 'capability_revoked'
  | 'dismissed'

export interface EmergencyTransferState {
  phase: TransferPhase
  riskAcknowledged: boolean
  /** Explicit server-capability state (issue #1633). `unconfigured` when no
   *  resolver is provided (legacy behaviour preserved). */
  capabilityState: 'granted' | 'denied' | 'checking' | 'unconfigured'
  /** Set once `bindConfirmation` succeeds. */
  bindingKey: string | null
  /** The config that was active when review started. */
  reviewedConfig: EmergencyTransferConfig | null
  /** Transaction hash returned by the provider on success. */
  txHash: string | null
  /** Error message from the last failed submit attempt. */
  errorMessage: string | null
  /** Human-readable reason the action is unavailable (expired, unauthorized…). */
  unavailableReason: string | null
  /** All events emitted so far — append-only. */
  events: EmergencyTransferEvent[]
}

type Action =
  | { type: 'START_REVIEW'; config: EmergencyTransferConfig }
  | { type: 'ACKNOWLEDGE_RISK' }
  | { type: 'UNACKNOWLEDGE_RISK' }
  | { type: 'BIND_CONFIRMATION'; bindingKey: string }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_SUCCESS'; txHash: string }
  | { type: 'SUBMIT_FAILURE'; errorCode: string; errorMessage: string }
  | { type: 'DUPLICATE_BLOCKED' }
  | { type: 'CONFLICTING_KEY_REUSED'; reason: string }
  | { type: 'EXPIRE' }
  | { type: 'CONFIG_CHANGED'; newConfig: EmergencyTransferConfig }
  | { type: 'UNAUTHORIZED'; reason: string }
  | { type: 'CAPABILITY_GRANTED'; capability: GrantedTransferCapability }
  | { type: 'CAPABILITY_CHECKING' }
  | { type: 'CAPABILITY_REVOKED'; capability: TransferCapability }
  | { type: 'DISMISS' }
  | { type: 'RESET' }
  | { type: 'APPEND_EVENT'; event: EmergencyTransferEvent }

const initialState: EmergencyTransferState = {
  phase: 'idle',
  riskAcknowledged: false,
  capabilityState: 'unconfigured',
  bindingKey: null,
  reviewedConfig: null,
  txHash: null,
  errorMessage: null,
  unavailableReason: null,
  events: [],
}

// ---------------------------------------------------------------------------
// Transition matrix
// ---------------------------------------------------------------------------

/**
 * Legal transition matrix: maps each action type to the set of phases from
 * which it may fire.  Any dispatch that violates this matrix is silently
 * ignored — the reducer is a pure state machine and only advances on legal
 * transitions.
 *
 * Actions not listed here (RESET, APPEND_EVENT, START_REVIEW) are universal:
 *  - RESET: always allowed (resets to initial state)
 *  - APPEND_EVENT: always allowed (append-only audit trail)
 *  - START_REVIEW: always allowed (resets state for a new review cycle)
 */
/** @internal exported for testing only */
export const VALID_TRANSITIONS: Partial<Record<Action['type'], readonly TransferPhase[]>> = {
  ACKNOWLEDGE_RISK:  ['reviewing'],
  UNACKNOWLEDGE_RISK: ['reviewing'],
  BIND_CONFIRMATION: ['reviewing'],
  SUBMIT:            ['confirmed'],
  SUBMIT_SUCCESS:    ['submitting'],
  SUBMIT_FAILURE:    ['submitting'],
  DUPLICATE_BLOCKED: ['submitting'],
  // EXPIRE and UNAUTHORIZED can originate from idle (pre-review policy checks
  // in startReview) as well as the active review/submit lifecycle phases.
  EXPIRE:            ['idle', 'reviewing', 'confirmed', 'submitting'],
  CONFIG_CHANGED:    ['reviewing', 'confirmed', 'submitting'],
  UNAUTHORIZED:      ['idle', 'reviewing', 'confirmed', 'submitting'],
  // CAPABILITY_GRANTED: server re-derived a fresh grant.  Updates the exposed
  // capability state so the UI shows whether the confirmed action is real.
  CAPABILITY_GRANTED: ['idle', 'reviewing', 'confirmed', 'submitting'],
  // CAPABILITY_CHECKING: a capability resolution is in flight.
  CAPABILITY_CHECKING: ['idle', 'reviewing', 'confirmed', 'submitting'],
  // CAPABILITY_REVOKED: a server-derived capability is missing / stale /
  // superseded.  Fireable from any live phase — it invalidates pending
  // confirmations even while the submit is in flight.
  CAPABILITY_REVOKED: ['idle', 'reviewing', 'confirmed', 'submitting'],
  DISMISS:           ['reviewing', 'confirmed', 'submitting', 'succeeded', 'failed', 'expired', 'config_changed', 'unauthorized', 'capability_revoked'],
}

function appendEvent(
  state: EmergencyTransferState,
  event: EmergencyTransferEvent,
): EmergencyTransferState {
  return { ...state, events: [...state.events, event] }
}

function reducer(
  state: EmergencyTransferState,
  action: Action,
): EmergencyTransferState {
  // ---- Transition matrix guard ----
  const allowed = VALID_TRANSITIONS[action.type]
  if (allowed && !allowed.includes(state.phase)) {
    return state // illegal transition — no-op
  }

  switch (action.type) {
    case 'START_REVIEW': {
      const event = createEvent<ReviewStartedEvent>({
        eventType: 'REVIEW_STARTED',
        configSnapshot: action.config,
      })
      return appendEvent(
        {
          ...initialState,
          phase: 'reviewing',
          reviewedConfig: action.config,
          events: state.events, // preserve existing audit trail
        },
        event,
      )
    }

    case 'ACKNOWLEDGE_RISK': {
      if (state.phase !== 'reviewing') return state
      const event = createEvent<RiskAcknowledgedEvent>({
        eventType: 'RISK_ACKNOWLEDGED',
        configSnapshot: state.reviewedConfig!,
        acknowledgedText: RISK_ACKNOWLEDGEMENT_TEXT,
      })
      return appendEvent(
        { ...state, riskAcknowledged: true },
        event,
      )
    }

    case 'UNACKNOWLEDGE_RISK': {
      if (state.phase !== 'reviewing') return state
      const event = createEvent<RiskUnacknowledgedEvent>({
        eventType: 'RISK_UNACKNOWLEDGED',
        configSnapshot: state.reviewedConfig!,
      })
      return appendEvent(
        { ...state, riskAcknowledged: false, bindingKey: null },
        event,
      )
    }

    case 'BIND_CONFIRMATION': {
      if (state.phase !== 'reviewing' || !state.riskAcknowledged) return state
      const event = createEvent<ConfirmationBoundEvent>({
        eventType: 'CONFIRMATION_BOUND',
        configSnapshot: state.reviewedConfig!,
        bindingKey: action.bindingKey,
      })
      return appendEvent(
        { ...state, phase: 'confirmed', bindingKey: action.bindingKey },
        event,
      )
    }

    case 'SUBMIT': {
      if (state.phase !== 'confirmed') return state
      const event = createEvent<SubmitAttemptedEvent>({
        eventType: 'SUBMIT_ATTEMPTED',
        configSnapshot: state.reviewedConfig!,
        bindingKey: state.bindingKey!,
      })
      return appendEvent({ ...state, phase: 'submitting', errorMessage: null }, event)
    }

    case 'SUBMIT_SUCCESS': {
      if (state.phase !== 'submitting' && state.phase !== 'confirmed') return state
      const event = createEvent<SubmitSucceededEvent>({
        eventType: 'SUBMIT_SUCCEEDED',
        configSnapshot: state.reviewedConfig!,
        txHash: action.txHash,
        bindingKey: state.bindingKey!,
      })
      return appendEvent(
        { ...state, phase: 'succeeded', txHash: action.txHash },
        event,
      )
    }

    case 'SUBMIT_FAILURE': {
      if (state.phase !== 'submitting') return state
      const event = createEvent<SubmitFailedEvent>({
        eventType: 'SUBMIT_FAILED',
        configSnapshot: state.reviewedConfig!,
        errorCode: action.errorCode,
        errorMessage: action.errorMessage,
        bindingKey: state.bindingKey!,
      })
      return appendEvent(
        { ...state, phase: 'failed', errorMessage: action.errorMessage, bindingKey: null, txHash: null },
        event,
      )
    }

    case 'DUPLICATE_BLOCKED': {
      // Acceptable from either the previous committed phase or the in-flight
      // phase: a concurrent submit recorded from a stale 'confirmed' closure
      // arrives before the SUBMIT dispatch has flushed the phase shift.
      if (state.phase !== 'submitting' && state.phase !== 'confirmed') {
        return state
      }
      const event = createEvent<EmergencyTransferEvent>({
        eventType: 'DUPLICATE_BLOCKED',
        configSnapshot: state.reviewedConfig!,
        bindingKey: state.bindingKey!,
      })
      return appendEvent(state, event)
    }

    case 'EXPIRE': {
      if (
        state.phase !== 'idle' &&
        state.phase !== 'reviewing' &&
        state.phase !== 'confirmed' &&
        state.phase !== 'submitting'
      )
    }

    case 'EXPIRE': {
      const event = createEvent<ExpiredEvent>({
        eventType: 'EXPIRED',
        configSnapshot: state.reviewedConfig ?? ({} as EmergencyTransferConfig),
      })
      return appendEvent(
        {
          ...state,
          phase: 'expired',
          bindingKey: null,
          txHash: null,
          unavailableReason:
            'This transfer configuration has expired. Please start a new review.',
        },
        event,
      )
    }


    case 'CONFIG_CHANGED': {
      if (
        state.phase !== 'reviewing' &&
        state.phase !== 'confirmed' &&
        state.phase !== 'submitting'
      )
      return state
      const event = createEvent<EmergencyTransferEvent>({
        eventType: 'CONFIG_CHANGED',
        configSnapshot: state.reviewedConfig,
        newConfig: action.newConfig,
      })
      return appendEvent(
        {
          ...state,
          phase: 'config_changed',
          bindingKey: null,
          txHash: null,
          unavailableReason:
            'Transfer details have changed since review. Please start a new review.',
        },
        event,
      )
    }

    case 'UNAUTHORIZED': {
      if (
        state.phase !== 'idle' &&
        state.phase !== 'reviewing' &&
        state.phase !== 'confirmed' &&
        state.phase !== 'submitting'
      )
        return state
      const event = createEvent<EmergencyTransferEvent>({
        eventType: 'UNAUTHORIZED',
        configSnapshot: state.reviewedConfig ?? ({} as EmergencyTransferConfig),
        reason: action.reason,
      })
      return appendEvent(
        {
          ...state,
          phase: 'unauthorized',
          unavailableReason: action.reason,
        },
        event,
      )
    }

    case 'CAPABILITY_REVOKED': {
      if (
        state.phase !== 'idle' &&
        state.phase !== 'reviewing' &&
        state.phase !== 'confirmed' &&
        state.phase !== 'submitting'
      )
        return state
      const event = createEvent<EmergencyTransferEvent>({
        eventType: 'UNAUTHORIZED',
        configSnapshot: state.reviewedConfig ?? ({} as EmergencyTransferConfig),
        reason: 'Server-derived transfer capability was not granted.',
      })
      return appendEvent(
        {
          ...state,
          phase: 'capability_revoked',
          capabilityState: 'denied',
          // Never echo the server's internal deny reason to the client — the
          // capability body may contain policy internals.  The stored message
          // is deliberately generic.
          unavailableReason:
            'Emergency transfer capability is not currently granted. ' +
            'Your session does not permit this action right now. ' +
            'Contact your administrator if you believe this is an error.',
        },
        event,
      )
    }

    case 'CAPABILITY_GRANTED': {
      if (
        state.phase !== 'idle' &&
        state.phase !== 'reviewing' &&
        state.phase !== 'confirmed' &&
        state.phase !== 'submitting'
      )
        return state
      return { ...state, capabilityState: 'granted' }
    }

    case 'CAPABILITY_CHECKING': {
      if (
        state.phase !== 'idle' &&
        state.phase !== 'reviewing' &&
        state.phase !== 'confirmed' &&
        state.phase !== 'submitting'
      )
        return state
      return { ...state, capabilityState: 'checking' }
    }

    case 'DISMISS': {
      if (state.reviewedConfig) {
        const event = createEvent<DismissedEvent>({
          eventType: 'DISMISSED',
          configSnapshot: state.reviewedConfig,
        })
        return appendEvent({ ...initialState, events: state.events }, event)
      }
      return initialState
    }


    case 'RESET':
      return { ...initialState }

    case 'APPEND_EVENT':
      return appendEvent(state, action.event)

    default:
      return state
  }
}

// ---------------------------------------------------------------------------
// Provider callback type
// ---------------------------------------------------------------------------

export type TransferProvider = (payload: ConfirmationPayload) => Promise<{ txHash: string }>

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export interface UseEmergencyTransferOptions {
  /**
   * The current config supplied by the parent.  The hook watches this value
   * and transitions to `config_changed` if it changes after a review starts.
   */
  config: EmergencyTransferConfig | null
  /**
   * Async function that submits the transfer to the provider.
   * Must resolve with `{ txHash }` on success or throw on failure.
   */
  provider: TransferProvider
  /**
   * Optional override for "now" — useful in tests.
   * Defaults to `Date.now`.
   */
  getNow?: () => number
  /**
   * Resolver that derives the current emergency-transfer capability from
   * server state.  When provided, the confirmation and submit boundaries
   * become capability-gated: a pending review is invalidated the moment the
   * server capability is denied, expired, or bumped to a new version
   * (role removal / policy change).
   *
   * When omitted the hook preserves existing behaviour (authorization is
   * derived from the config claim only) so existing consumers keep working.
   */
  capabilityResolver?: TransferCapabilityResolver
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export interface UseEmergencyTransferReturn {
  state: EmergencyTransferState

  /** Whether the action can be started at all (policy + auth satisfied). */
  isAvailable: boolean
  /** Whether the user can proceed to the confirmation step. */
  canConfirm: boolean
  /** Whether the submit button should be enabled. */
  canSubmit: boolean

  /** Begin the review phase. Fails silently if config is missing / invalid. */
  startReview: () => void
  /** Toggle the risk acknowledgement checkbox. */
  setRiskAcknowledged: (value: boolean) => void
  /**
   * Binds and freezes the confirmation payload.
   * Transitions phase to `confirmed`.
   * Returns the payload so the caller can display it, or `null` on failure.
   */
  bindConfirmation: () => ConfirmationPayload | null
  /**
   * Executes the transfer via the provider.
   * Performs all pre-submit guards before calling `provider`.
   */
  submit: () => Promise<void>
  /**
   * Refreshes the capability from the server.  A revoked / expired result
   * transitions the flow to `capability_revoked` — invalidating any pending
   * confirmation.  Safe to call at any time.
   */
  resolveCapability: () => Promise<void>
  /** Reset to idle. */
  dismiss: () => void

  /** Milliseconds remaining before the config expires (0 when expired). */
  msUntilExpiry: number
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------

export function useEmergencyTransfer({
  config,
  provider,
  getNow = Date.now,
  capabilityResolver,
}: UseEmergencyTransferOptions): UseEmergencyTransferReturn {
  const [state, dispatch] = useReducer(reducer, initialState)

  /**
   * Frozen confirmation payload ref — written exactly once in `bindConfirmation`,
   * read by `submit`.  Never stored in React state to prevent React from
   * re-rendering with a mutated value.
   */
  const payloadRef = useRef<ConfirmationPayload | null>(null)

  /** Guards against concurrent submits. */
  const submittingRef = useRef(false)

  /** Stores completed operations for safe retries and idempotency enforcement. */
  const completedOperationsRef = useRef<
    Map<string, { payload: ConfirmationPayload; result: { txHash: string } }>
  >(new Map())

  /**
   * Latest server-derived capability.  Written by `resolveCapability`;
   * read by the bind and submit gates.  Not stored in React state because it
   * must not re-render the tree mid-gesture.
   */
  const capabilityRef = useRef<GrantedTransferCapability | null>(null)

  /** Capability version captured when the confirmation was bound. */
  const boundVersionRef = useRef<number | null>(null)

  /** Latest config, kept in a ref so the capability check can read it freely. */
  const configRef = useRef(config)
  configRef.current = config

  // -------------------------------------------------------------------------
  // Derived: msUntilExpiry — recomputed each render, no extra state needed
  // -------------------------------------------------------------------------
  const msUntilExpiry =
    config && state.reviewedConfig
      ? Math.max(0, state.reviewedConfig.expiresAt - getNow())
      : 0

  // -------------------------------------------------------------------------
  // Effect: expiry timer
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (
      state.phase !== 'reviewing' &&
      state.phase !== 'confirmed' &&
      state.phase !== 'submitting'
    )
      return
    if (!state.reviewedConfig) return

    const remaining = state.reviewedConfig.expiresAt - getNow()
    if (remaining <= 0) {
      dispatch({ type: 'EXPIRE' })
      return
    }

    const timer = setTimeout(() => {
      dispatch({ type: 'EXPIRE' })
    }, remaining)

    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.reviewedConfig?.expiresAt])

  // -------------------------------------------------------------------------
  // Effect: config drift detection
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (
      state.phase !== 'reviewing' &&
      state.phase !== 'confirmed' &&
      state.phase !== 'submitting'
    )
      return
    if (!state.reviewedConfig || !config) return

    // Only flag a change if the identity fields differ.
    if (!configsMatch(state.reviewedConfig, config)) {
      dispatch({ type: 'CONFIG_CHANGED', newConfig: config })
    }
  // We intentionally depend on the whole config object reference and its key
  // identity fields so that a new object with the same values doesn't trigger.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config?.configId,
    config?.recipient,
    config?.amountRaw,
    config?.asset?.symbol,
    config?.asset?.contractAddress,
    config?.networkId,
    config?.expiresAt,
    config?.memo,
    config?.quoteId,
    config?.quoteHash,
    config?.requestKey,
    config?.nonce,
    state.phase,
  ])

  // -------------------------------------------------------------------------
  // Derived booleans
  // -------------------------------------------------------------------------
  const isAvailable =
    config !== null &&
    config.authorizedBy !== null &&
    !isConfigExpired(config, getNow())

  const canConfirm =
    state.phase === 'reviewing' && state.riskAcknowledged

  const canSubmit =
    state.phase === 'confirmed' &&
    payloadRef.current !== null &&
    !submittingRef.current

  // -------------------------------------------------------------------------
  // Capability resolution — the sole authority for the mutation boundaries
  // -------------------------------------------------------------------------

  const resolveCapability = useCallback(async (): Promise<void> => {
    if (!capabilityResolver) return

    dispatch({ type: 'CAPABILITY_CHECKING' })
    try {
      const capability = await capabilityResolver({
        config: configRef.current,
        pendingPayload: payloadRef.current,
      })

      // Hard-fail closed on malformed / adversarial responses.
      if (!isCapabilityUsable(capability, getNow())) {
        capabilityRef.current = null
        dispatch({ type: 'CAPABILITY_REVOKED', capability })
        return
      }

      capabilityRef.current = capability
      // Signal the grant so the UI can update (e.g. re-enable confirm).
      dispatch({ type: 'CAPABILITY_GRANTED', capability })
    } catch {
      // A failed capability check must never unlock the action.
      capabilityRef.current = null
      dispatch({
        type: 'CAPABILITY_REVOKED',
        capability: Object.freeze({
          effect: 'denied',
          reason: 'POLICY_NOT_ENABLED',
        }),
      })
    }
  }, [capabilityResolver, getNow])

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  const startReview = useCallback(() => {
    if (!config) return

    if (!config.authorizedBy) {
      dispatch({
        type: 'UNAUTHORIZED',
        reason: 'Emergency transfer policy is not satisfied or you are not authorised.',
      })
      return
    }

    if (isConfigExpired(config, getNow())) {
      dispatch({ type: 'EXPIRE' })
      return
    }

    payloadRef.current = null
    submittingRef.current = false
    // A new review binds against the capability already proven at open; the
    // submit boundary re-proves it.  Only the bound version resets here.
    boundVersionRef.current = null
    dispatch({ type: 'START_REVIEW', config })
  }, [config, getNow])

  const setRiskAcknowledged = useCallback((value: boolean) => {
    if (value) {
      dispatch({ type: 'ACKNOWLEDGE_RISK' })
    } else {
      payloadRef.current = null
      dispatch({ type: 'UNACKNOWLEDGE_RISK' })
    }
  }, [])

  const bindConfirmation = useCallback((): ConfirmationPayload | null => {
    if (!state.reviewedConfig || !state.riskAcknowledged) return null
    // A confirmation can only be bound from the review step.
    if (state.phase !== 'reviewing') return null
    if (state.phase !== 'reviewing' || !state.reviewedConfig || !state.riskAcknowledged)
      return null


    if (isConfigExpired(state.reviewedConfig, getNow())) {
      dispatch({ type: 'EXPIRE' })
      return null
    }

    // ---- Capability gate: a confirmation may only be bound while a
    // server-derived capability is present and fresh.  If it is missing or
    // stale, request a refresh — the async result will invalidate the flow
    // via CAPABILITY_REVOKED. ----
    if (capabilityResolver) {
      const capability = capabilityRef.current
      if (!capability || !isCapabilityUsable(capability, getNow())) {
        void resolveCapability()
        return null
      }
      boundVersionRef.current = capability.version
    }

    const bindingKey = deriveBindingKey(state.reviewedConfig)

    const rawPayload = {
      configId: state.reviewedConfig.configId,
      bindingKey,
      reviewedAt: getNow(),
      expiresAt: state.reviewedConfig.expiresAt,
      recipient: state.reviewedConfig.recipient,
      amountRaw: state.reviewedConfig.amountRaw,
      amountDisplay: state.reviewedConfig.amountDisplay,
      asset: { ...state.reviewedConfig.asset },
      networkId: state.reviewedConfig.networkId,
      authorizedBy: state.reviewedConfig.authorizedBy,
      memo: state.reviewedConfig.memo,
      quoteId: state.reviewedConfig.quoteId,
      quoteHash: state.reviewedConfig.quoteHash,
      requestKey: state.reviewedConfig.requestKey,
      nonce: state.reviewedConfig.nonce,
      riskAcknowledged: true as const,
      acknowledgedText: RISK_ACKNOWLEDGEMENT_TEXT,
    }

    const result = ConfirmationPayloadSchema.safeParse(rawPayload)
    if (!result.success) {
      // Validation failed — should not happen with valid config, but guard anyway.
      dispatch({
        type: 'UNAUTHORIZED',
        reason: `Payload validation failed: ${result.error.issues[0]?.message ?? 'unknown'}`,
      })
      return null
    }

    // Freeze the payload so it can never be mutated after this point.
    const frozen = Object.freeze(result.data)
    payloadRef.current = frozen
    dispatch({ type: 'BIND_CONFIRMATION', bindingKey })
    return frozen
  }, [state.reviewedConfig, state.phase, state.riskAcknowledged, getNow, capabilityResolver, resolveCapability])
  }, [state.phase, state.reviewedConfig, state.riskAcknowledged, getNow])



  const submit = useCallback(async (): Promise<void> => {
    // ---- Duplicate-submit guard (ref-based; immune to stale closures) ----
    if (submittingRef.current) {
      dispatch({ type: 'DUPLICATE_BLOCKED' })
      return
    }

    // ---- Phase guard: only a bound confirmation may be submitted ----
    if (state.phase !== 'confirmed') {
      return
    }

    const payload = payloadRef.current
    if (!payload || (state.phase !== 'confirmed' && state.phase !== 'succeeded')) return


    // ---- Re-check expiry ----
    if (getNow() >= payload.expiresAt) {
      dispatch({ type: 'EXPIRE' })
      return
    }

    // ---- Re-check config drift ----
    if (config && !configsMatch(state.reviewedConfig!, config)) {
      dispatch({ type: 'CONFIG_CHANGED', newConfig: config })
      return
    }

    // ---- Re-check authorisation (config claim) ----
    if (!config?.authorizedBy) {
      dispatch({
        type: 'UNAUTHORIZED',
        reason: 'You are no longer authorised to perform this transfer.',
      })
      return
    }

    // ---- Capability gate: re-derive from server state and verify the
    // revision that authorised this confirmation is still current.
    // A role removal or policy change during the modal's lifetime bumps the
    // version and invalidates the pending confirmation. ----
    if (capabilityResolver) {
      let usable = true
      try {
        const capability = await capabilityResolver({
          config: configRef.current,
          pendingPayload: payload,
        })
        if (!isCapabilityUsable(capability, getNow())) {
          capabilityRef.current = null
          dispatch({ type: 'CAPABILITY_REVOKED', capability })
          return
        }
        capabilityRef.current = capability

        // Version drift ⇒ the authorising policy was changed since bind.
        if (boundVersionRef.current !== null &&
            capability.version !== boundVersionRef.current) {
          capabilityRef.current = null
          dispatch({ type: 'CAPABILITY_REVOKED', capability })
          return
        }
      } catch {
        // Fail closed — never dispatch SUBMIT on a failed capability check.
        usable = false
      }
      if (!usable) {
        capabilityRef.current = null
        dispatch({
          type: 'CAPABILITY_REVOKED',
          capability: Object.freeze({
            effect: 'denied',
            reason: 'POLICY_NOT_ENABLED',
          }),
        })
        return
      }
    }

    // ---- Cross-field payload ↔ config binding check ----
    try {
      assertPayloadMatchesConfig(payload, state.reviewedConfig!)
    } catch (err) {
      dispatch({
        type: 'CONFIG_CHANGED',
        newConfig: config ?? state.reviewedConfig!,
      })
      return
    }

    // ---- Idempotency & Safe Retry vs Conflicting Key Guard ----
    const keysToCheck = [
      payload.bindingKey,
      payload.requestKey,
      payload.nonce,
    ].filter(Boolean) as string[]

    for (const key of keysToCheck) {
      const record = completedOperationsRef.current.get(key)
      if (record) {
        const matches =
          record.payload.configId === payload.configId &&
          record.payload.recipient === payload.recipient &&
          record.payload.amountRaw === payload.amountRaw &&
          record.payload.asset.symbol === payload.asset.symbol &&
          record.payload.asset.contractAddress === payload.asset.contractAddress &&
          record.payload.networkId === payload.networkId &&
          record.payload.quoteId === payload.quoteId &&
          record.payload.quoteHash === payload.quoteHash &&
          record.payload.nonce === payload.nonce

        if (matches) {
          // Safe retry: return deterministic result without re-executing provider
          dispatch({ type: 'SUBMIT_SUCCESS', txHash: record.result.txHash })
          return
        } else {
          // Conflicting key reuse: reject attempt and leave zero partial state
          dispatch({
            type: 'CONFLICTING_KEY_REUSED',
            reason: `Request key "${key}" was already used with conflicting transfer parameters.`,
          })
          return
        }
      }
    }

    submittingRef.current = true
    dispatch({ type: 'SUBMIT' })

    try {
      const { txHash } = await provider(payload)
      const resultObj = { txHash }
      const entry = { payload, result: resultObj }
      for (const key of keysToCheck) {
        completedOperationsRef.current.set(key, entry)
      }
      dispatch({ type: 'SUBMIT_SUCCESS', txHash })
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Provider rejected the transfer.'
      const code =
        err instanceof Error && 'code' in err
          ? String((err as NodeJS.ErrnoException).code)
          : 'PROVIDER_ERROR'
      dispatch({ type: 'SUBMIT_FAILURE', errorCode: code, errorMessage: msg })
    } finally {
      submittingRef.current = false
    }
  }, [config, state.phase, state.reviewedConfig, provider, getNow, capabilityResolver])


  const dismiss = useCallback(() => {
    payloadRef.current = null
    submittingRef.current = false
    capabilityRef.current = null
    boundVersionRef.current = null
    dispatch({ type: 'DISMISS' })
  }, [])

  return {
    state,
    isAvailable,
    canConfirm,
    canSubmit,
    startReview,
    setRiskAcknowledged,
    bindConfirmation,
    submit,
    resolveCapability,
    dismiss,
    msUntilExpiry,
  }
}
