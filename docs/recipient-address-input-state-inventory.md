# Recipient Address Input State Inventory

Core component:
- `RecipientAddressInput`

Child interaction surfaces:
- Address text input
- Paste action
- Copy action
- Disabled QR future hook
- Recent recipient shortcut chips
- Inline validation status
- Success/error callout panels

State inventory:
- Empty idle:
  field blank
  helper copy invites paste or entry
  copy button disabled
- Editing:
  input normalizes to uppercase and strips whitespace
  validation recalculates immediately
- Valid:
  checksum passes
  success icon appears in-field
  success status copy and success callout display
- Invalid format:
  wrong prefix, wrong length, or unsupported characters
  inline error icon and error copy display
- Invalid checksum:
  base32 shape looks plausible but fails Stellar checksum validation
  error callout instructs correction before send
- Paste success:
  clipboard value inserted and transient confirmation shown
- Paste failure:
  browser/security context blocks clipboard read
  fallback guidance instructs manual paste
- Copy success:
  label flips to `Copied` briefly
- Copy failure:
  browser/security context blocks clipboard write
  fallback guidance instructs manual selection
- QR future hook:
  disabled visual treatment
  visible `Soon` badge
- Recent recipient:
  chip fills field and runs through the same validation flow

Interaction dependencies:
- Validation depends on normalized input and `StrKey.isValidEd25519PublicKey(...)`
- Clipboard actions depend on browser clipboard permissions and secure context support
- QR action intentionally has no runtime dependency yet

Suggested future states:
- Loading:
  if network-backed recipient lookup or address-book resolution is added later
- Resolved recipient:
  if product wants to show account alias or known recipient metadata
- Warning:
  if product wants to allow valid addresses that are unknown, new, or missing trustline context
