# Validation Protocol

All contract entry points must validate external input before mutating storage or
making a cross-contract call. Shared Soroban validators live in
`contracts/lib/src/validation.rs`; ink contracts expose runtime-specific adapter
modules with the same rule names.

## Rules

- `validate_address`: rejects the all-zero account address.
- `validate_amount`: accepts only strictly positive signed amounts.
- `validate_timestamp`: requires a timestamp strictly after the current ledger time.
- `validate_string_length`: enforces inclusive minimum and maximum lengths.
- `validate_enum_range`: enforces an inclusive numeric discriminant range.
- `validate_cross_field`: represents relationships between two or more fields.

Failures use `ValidationError` rather than panic strings. Soroban contracts may
call `validate_or_emit` to emit the canonical `VALIDATION / ValidationFailed`
event. Its payload contains the numeric error code and field symbol for off-chain
monitoring.

The security-audit binary reports entry points whose crate directory has no
`validation.rs`. This is a review signal, not a replacement for semantic tests.
Each contract should also assert exact error variants at its boundary tests.