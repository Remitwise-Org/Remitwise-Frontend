/**
 * useEmergencyTransfer
 *
 * Manages the full lifecycle of an emergency-transfer operation:
 *
 *   idle → reviewing → confirmed → submitting → succeeded | failed
 *                   ↘ expired | config_changed | unauthorized | dismissed
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
 * 3. An expiry timer runs while the hook is in the `reviewing` or `confirmed`
 *    state and transitions to `expired` automatically.
 * 4. If the caller replaces `config` between review and sign the hook
 *    transitions to `config_changed` and requires a fresh review.
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
  | 'dismissed'

export interface EmergencyTransferState {
  phase: TransferPhase
  riskAcknowledged: boolean
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
  | { type: 'DISMISS' }
  | { type: 'RESET' }
  | { type: 'APPEND_EVENT'; event: EmergencyTransferEvent }

const initialState: EmergencyTransferState = {
  phase: 'idle',
  riskAcknowledged: false,
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
  DISMISS:           ['reviewing', 'confirmed', 'submitting', 'failed', 'expired', 'config_changed', 'unauthorized'],
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
        { ...state, phase: 'failed', errorMessage: action.errorMessage },
        event,
      )
    }

    case 'DUPLICATE_BLOCKED': {
      if (state.phase !== 'submitting') return state
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
    if (state.phase !== 'reviewing' || !state.reviewedConfig || !state.riskAcknowledged)
      return null


    if (isConfigExpired(state.reviewedConfig, getNow())) {
      dispatch({ type: 'EXPIRE' })
      return null
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
  }, [state.phase, state.reviewedConfig, state.riskAcknowledged, getNow])



  const submit = useCallback(async (): Promise<void> => {
    // ---- Duplicate-submit guard ----
    if (submittingRef.current) {
      dispatch({ type: 'DUPLICATE_BLOCKED' })
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

    // ---- Re-check authorisation ----
    if (!config?.authorizedBy) {
      dispatch({
        type: 'UNAUTHORIZED',
        reason: 'You are no longer authorised to perform this transfer.',
      })
      return
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
  }, [config, state.phase, state.reviewedConfig, provider, getNow])


  const dismiss = useCallback(() => {
    payloadRef.current = null
    submittingRef.current = false
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
    dismiss,
    msUntilExpiry,
  }
}
