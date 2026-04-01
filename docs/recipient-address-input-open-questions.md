# Recipient Address Input Open Questions

Product:
- Should a checksum-valid but unknown address be treated as fully acceptable, or should the UI warn when the address is not in recent recipients or an address book?
- Should the disabled `Scan QR` control remain visible in production until scanning ships, or should it be feature-flagged?
- Do recent recipients need avatars, network labels, or trust indicators before launch?

Engineering:
- Will the send flow eventually gate the send CTA on recipient validity, or should that remain local to this component for now?
- Is there an upcoming address-book or contact API that should replace the hard-coded recent recipients list?
- Should QR scanning target camera capture only, or also support uploaded QR images?

Copy:
- Is `Checksum verified. This is a valid Stellar public key.` the preferred tone, or should copy be more task-oriented such as `Address verified. Ready to continue.`?
- Should paste failure mention browser permissions explicitly, or keep the fallback message short and generic?

API and contract limits:
- Does the flow need to warn on valid recipient addresses that do not yet exist on network?
- Should memo requirements, trustline requirements, or destination-tag-like rules for non-XLM assets appear in this step later?

Design process:
- Is a repo-based handoff sufficient for this task, or is an external Figma file still mandatory for final acceptance?
- Who is the engineering reviewer for the requested quick design review before final sign-off?
