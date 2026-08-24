# Circuit Breaker Protocol

The shared circuit breaker in `contracts/lib/src/circuit_breaker.rs` replaces contract-local pause booleans with one timed state machine. It is used by escrow, slashing, bridge, insurance, AI valuation, oracle, and property token.

## Roles

- `Governance` schedules normal pauses and activates emergency pauses. In production this role must be assigned to the governance multisig executor. Soroban integrations can enforce a unique authorized-signer threshold with `common/multisig.rs` through `pause_with_multisig`.
- `Admin` schedules and activates resume operations. Admin cannot create a normal or emergency pause unless it also holds the Governance role.
- Protected operations have no bypass role while a pause is active.

Soroban escrow and bridge initialize only Admin and must grant Governance to the approved multisig. Slashing grants Governance to its constructor-supplied governance address. AI valuation and oracle default Governance to the initial admin, insurance explicitly grants both roles to the initial admin, and property token uses `set_governance`. Production deployments should replace single-account defaults with the approved multisig before enabling pause proposals.

## Time Model

All circuit-breaker values are seconds. ink! contracts convert their millisecond block timestamps before calling the shared module.

- Pause activation delay: 3,600 seconds.
- Resume activation delay: 3,600 seconds.
- `duration_seconds` starts when the pause activates, not when it is scheduled.
- A timed pause expires automatically at `pause_until`.
- An emergency pause has no automatic expiry.

The stored audit fields are `pause_scheduled_at`, `pause_activates_at`, `pause_until`, `rescheduled_by`, and `resume_scheduled_at`. `rescheduled_by` is set when Governance replaces an existing pending or active schedule.

## Entry Points

### `pause(duration_seconds)`

Governance-only. A positive duration schedules activation after the pause timelock. Calling it again atomically replaces a pending window and records `rescheduled_by`. Rescheduling an active timed pause can only extend its end time, and a normal schedule cannot replace an emergency pause. These rules prevent Governance from bypassing the Admin resume protocol.

### `emergency_pause()`

Governance-only. Activates immediately and remains active until the resume protocol completes. It emits both scheduling and activation events in the same transaction.

### `resume()`

Admin-only and intentionally two-step:

1. The first call records `resume_scheduled_at` and emits `ResumeScheduled`.
2. A call before the resume timelock expires fails.
3. A call at or after the deadline clears the pause state and emits `ResumeActivated`.

The same protocol can cancel a pending pause, which prevents a last-moment pause/resume race from bypassing either timelock.

### `is_paused()`

Returns the effective state at the current block time. It also synchronizes due transitions so `PauseActivated` and automatic `ResumeActivated` events are emitted once. Protected state-changing entry points perform the same synchronization before continuing.

## Events

- `PauseScheduled`: scheduler, schedule time, activation time, end time, and optional rescheduler.
- `PauseActivated`: activation time, optional end time, and emergency marker.
- `ResumeScheduled`: scheduler, schedule time, and activation time.
- `ResumeActivated`: optional admin, activation time, and automatic-expiry marker.

Event names and payload meanings are consistent across Soroban and ink! contracts.

## Governance Proposals

`GovernanceContract::create_pause_proposal` stores a `PauseContract(target, duration_seconds)` action. Once voting, finalization, and threshold checks pass, proposal execution calls `pause(governance_contract, duration_seconds)` on the target. The target must grant its Governance role to the governance contract first.

## Protected Operations

- Escrow creation, deposits, approvals, and release.
- Slashing execution.
- Bridge requests, signatures, execution, and recovery.
- Insurance policy, claim, liquidity, and dispute mutations.
- AI model, training, pipeline, and prediction mutations.
- Oracle valuation updates and valuation requests.
- Property-token transfers, fractional-share movement, market operations, and ERC-721 approvals.

Read-only queries remain available during a pause.

## Operational Checklist

1. Configure the Admin role and Governance multisig address.
2. Verify the multisig threshold and signer set before granting Governance.
3. Monitor all four circuit-breaker events.
4. Treat a second `resume()` transaction as a distinct privileged action after the delay.
5. For timed windows, still call `is_paused()` or a protected entry point after expiry so the automatic resume event is materialized.
