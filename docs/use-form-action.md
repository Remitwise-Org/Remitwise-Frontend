# useFormAction

`lib/hooks/useFormAction.ts`

Shared form-submission hook used across all money-moving flows (Send, Split,
New Policy, Savings Goal).

## Usage

```tsx
import { useFormAction } from '@/lib/hooks/useFormAction';

function MyForm() {
  const [state, formAction, isPending] = useFormAction('/api/insurance');

  return (
    <form action={formAction}>
      {state.error && <p className="text-red-500">{state.error}</p>}
      {state.success && <p className="text-green-500">{state.success}</p>}
      <button type="submit" disabled={isPending}>Submit</button>
    </form>
  );
}
```

## API

```ts
useFormAction<T extends ActionState>(
  url: string,
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'  // default: 'POST'
): readonly [T, (formData: FormData) => void, boolean]
```

| Position | Type | Description |
|---|---|---|
| `[0]` | `T` | Current form state (`error`, `success`, `validationErrors`, or a full response payload). |
| `[1]` | `(FormData) => void` | Submit handler — pass as `<form action={…}>`. |
| `[2]` | `boolean` | `true` while a request is in-flight (`useTransition` pending). |

## State shape (`ActionState`)

```ts
type ActionState = {
  error?: string;
  success?: string;
  validationErrors?: { path: string; message: string }[];
  [key: string]: unknown;
};
```

## Abort / cancel behaviour

- **Re-submit**: calling the action while a request is already in-flight aborts
  the previous `AbortController` before starting a new one (latest-wins).
- **Unmount**: the cleanup effect aborts the in-flight controller and sets a
  `mountedRef` flag so `setState` is never called after the component unmounts.
- **`apiClient` null return**: when `apiClient.request` returns `null` (session
  expiry flow already triggered) the hook silently returns without mutating state.

## Typed error handling

The hook reads `ApiErrorResponse` from `lib/api/types.ts`:

```ts
interface ApiErrorResponse {
  success: false;
  error: { code: ApiErrorCode; message: string };
}
```

Error priority when the response is not `ok`:

1. `ApiErrorResponse.error.message`
2. First `validationErrors[0].message` (full array is attached to state too)
3. `"Request failed with status <N>"`

## Known bug fixed

Prior to this change, a submit that resolved after the component unmounted would
call `setState` on an unmounted React tree, producing a React warning and
potentially corrupting state in re-mounted siblings. The `mountedRef` guard
introduced here eliminates that path entirely.

## Tests

```bash
npx vitest run lib/hooks/useFormAction.test.ts --coverage
```

Coverage target: ≥ 90 % branches.
