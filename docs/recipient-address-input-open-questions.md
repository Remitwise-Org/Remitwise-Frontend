# Recipient Address Input Resolved Decisions

## Product:
- **Unknown address:** Resolved. Checksum-valid but unknown addresses are fully accepted. Warning UI is deferred to a future trustline-check epic.
- **Disabled Scan QR:** Resolved. Keep the disabled Scan QR control visible with a 'Soon' badge to communicate the future roadmap.
- **Recent recipients:** Resolved. Simple chip buttons with names are sufficient for launch. Avatars and trust indicators are deferred to v2.

## Engineering:
- **Gating the CTA:** Resolved. The send CTA is gated entirely within this component. A valid checksum instantly enables 'Continue'.
- **Address book API:** Resolved. Hard-coded recent recipients are used for the MVP. A full Contacts API will replace this in the future.
- **QR target:** Resolved. MVP QR scanning will target camera capture only. Image upload is out of scope.

## Copy:
- **Tone:** Resolved. Task-oriented copy is preferred: `Address verified. Ready to continue.`
- **Paste failure:** Resolved. The fallback message remains short and generic: `Clipboard paste is unavailable in this browser context.`

## API and contract limits:
- **Network existence:** Resolved. The flow does not warn on valid but unfunded/non-existent addresses. This is handled by network error states in a later step.
- **Memo/trustlines:** Resolved. Advanced routing rules (memos, destination tags) are explicitly out of scope for this UI/UX step.

## Design process:
- **Handoff:** Resolved. A repo-based handoff via the UI/UX branch PR is sufficient. No external Figma is required.
- **Engineering reviewer:** Resolved. The self-contained PR will be reviewed by the UI/UX lead and the core protocol team.
