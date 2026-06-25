# Component Reference

Public components and hooks exposed by this repository. Update this file whenever a component's public API or observable behaviour changes.

---

## WrongNetworkBanner

**File:** `components/WrongNetworkBanner.tsx`

Renders a full-width warning bar when the connected wallet is on the wrong Stellar network. While the banner is visible, a semi-transparent overlay blocks all page interactions and prompts the user to switch networks inside their wallet extension.

### When it appears

The banner is shown automatically whenever:

1. A wallet is connected (`isConnected === true`), **and**
2. The wallet's reported network does not match `NEXT_PUBLIC_STELLAR_NETWORK` (case-insensitive, defaults to `"testnet"`).

It disappears automatically once the wallet is switched to the expected network.

### Props

None. The component is self-contained and reads network state via `useWrongNetwork`.

### Example

```tsx
// Already wired into PrimaryNav — no manual placement needed.
import WrongNetworkBanner from "@/components/WrongNetworkBanner";

// In a custom layout:
<WrongNetworkBanner />
```

### z-index layers

| Layer          | z-index |
| -------------- | ------- |
| Nav header     | 60      |
| Blocking overlay | 55    |
| Banner bar     | 65      |

### Accessibility

- The banner uses `role="alert"` with `aria-live="assertive"` so screen readers announce it immediately.
- The overlay is `aria-hidden="true"` and does not appear in the accessibility tree.

---

## useWrongNetwork

**File:** `lib/hooks/useWrongNetwork.ts`

React hook that returns whether the connected wallet is on the wrong Stellar network.

### Signature

```ts
function useWrongNetwork(): {
  /** True when the wallet is connected and on the wrong network. */
  isWrongNetwork: boolean;
  /** The network the app expects, e.g. "testnet" or "mainnet". */
  expectedNetwork: string;
  /** The network reported by the wallet, or null when not connected. */
  activeNetwork: string | null;
}
```

### Configuration

Set `NEXT_PUBLIC_STELLAR_NETWORK` in your `.env.local` to the network the app is deployed against:

```bash
NEXT_PUBLIC_STELLAR_NETWORK=testnet   # or mainnet
```

Defaults to `"testnet"` when the variable is absent.

### Example

```tsx
import { useWrongNetwork } from "@/lib/hooks/useWrongNetwork";

function SendButton() {
  const { isWrongNetwork } = useWrongNetwork();
  return (
    <button disabled={isWrongNetwork}>
      Send Money
    </button>
  );
}
```
