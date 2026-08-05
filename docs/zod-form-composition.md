# How forms compose with Zod schemas

Audience: contributors adding or editing a form in this app.

This app validates form input with [Zod](https://zod.dev) schemas defined in
`lib/validation/*.ts`, kept separate from the form components themselves so
the rules are unit-testable without rendering React. This doc pins down the
convention: where the schema lives, how it reports errors, and how a
component wires it up.

## 1. The schema lives in `lib/validation/`, not the component

One file per form/domain, exporting the Zod schema and a small wrapper
function that never throws. See `lib/validation/profile.ts`:

```ts
export const ProfileFormSchema = z.object({
  name: z.string().trim().min(1, "profile_name_required").max(100, "profile_name_too_long"),
  email: z.string().trim().min(1, "profile_email_required").email("profile_email_invalid"),
  phone: z.string().trim().min(1, "profile_phone_required").regex(PHONE_REGEX, "profile_phone_invalid"),
});

export function validateProfileForm(values: {...}): { isValid: boolean; errors: {...} } {
  const result = ProfileFormSchema.safeParse(values);
  if (result.success) return { isValid: true, errors: {} };
  // ...collect first error per field into `errors`
}
```

Two things to copy from this pattern:

- **Error messages are translation-key strings, not English copy** (e.g.
  `"profile_email_invalid"`, not `"Please enter a valid email"`). The
  component renders them via `t(\`errors.${code}\`)` (see §3). This is the
  same convention `lib/validation/savings-goals.ts` and
  `lib/validation/percentages.ts` already use.
- **The wrapper always returns a result, never throws.** Use `.safeParse()`,
  not `.parse()`. A form component should never need a `try`/`catch` around
  validation.

For a schema whose validity depends on more than one field together (e.g.
`lib/validation/percentages.ts`'s "four percentages must sum to 100"), use
`.superRefine()` on the object schema rather than checking fields
individually after parsing -- that keeps the cross-field rule inside the
schema, so it's covered by the same `safeParse()` call and the same tests.

## 2. Test the schema directly, not through the component

`lib/validation/profile.test.ts` imports `ProfileFormSchema` and
`validateProfileForm` directly and asserts on `safeParse(...).success` and on
the returned `errors` object -- no rendering involved. Keep it that way:
component tests should cover *wiring* (does an invalid field block save,
does the right message render), not re-derive every validation rule.

## 3. Wiring a schema into a form component

`components/settings/ProfileSection.tsx` is the reference implementation:

```tsx
const [errors, setErrors] = useState<ProfileFormValidationResult["errors"]>({});

const revalidateAndSave = (next: {...}) => {
  const result = validateProfileForm(next);
  setErrors(result.errors);
  if (result.isValid) {
    triggerSave(); // only persist once the whole form is valid
  }
};
```

and, per field:

```tsx
<TextInput value={name} onChange={handleNameChange} ... />
{errors.name && (
  <p className="mt-1 text-xs text-red-500" role="alert">
    {t(`errors.${errors.name}`)}
  </p>
)}
```

Notes:

- **Re-validate the whole form on every change**, not just the field that
  changed -- cross-field rules (§1) need the full picture, and it keeps the
  "is the form valid" question answered by one call site.
- **Block the save/submit on `!result.isValid`**, don't just display errors
  and save anyway. Client-side validation exists to prevent a bad request
  from ever going out.
- **`role="alert"`** on the rendered error `<p>` so screen readers announce
  it when it appears.

## 4. If the same value is validated on both client and server

Money amounts in particular are validated twice: once client-side against a
Zod schema (fast feedback), and again server-side in the API route
(authoritative -- the client can't be trusted). Keep the *rule* in one place
when you can share code between the two (e.g. `lib/utils/decimal-places.ts`
and `lib/utils/i128.ts` are plain functions importable from both a
`lib/validation/*.ts` schema and a route's own Zod schema), rather than
re-implementing the same check twice with two chances to drift apart.

## See also

- [docs/client-api.md](client-api.md) -- the shared fetch client this app's
  forms use to submit once validation passes.
