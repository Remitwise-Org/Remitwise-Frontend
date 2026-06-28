import React, { useId, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import type { ActionState } from '@/lib/auth/middleware';

/**
 * Translator function signature (matches `useClientTranslator().t`).
 */
type Translate = (key: string, interpolations?: Record<string, string | number>) => string;

/**
 * Client-side validation schema for the new-policy form. Mirrors the server
 * schema in `app/api/insurance/route.ts` so invalid input is caught before the
 * network round-trip. Field keys map 1:1 to the form `name` attributes.
 */
const policyFormSchema = z.object({
  policyName: z.string().min(4, 'form_err_policy_name'),
  coverageType: z.enum(['Health', 'Emergency', 'Life'], 'form_err_coverage_type'),
  monthlyPremium: z.coerce.number().gt(0, 'form_err_monthly_premium'),
  coverageAmount: z.coerce.number().gt(0, 'form_err_coverage_amount'),
  nextPayment: z.string().min(1, 'form_err_next_payment'),
});

type FieldErrors = Partial<Record<keyof z.infer<typeof policyFormSchema>, string>>;

/**
 * Validate a submitted `FormData` against {@link policyFormSchema}.
 * Returns field error keys (i18n keys) keyed by field name; empty when valid.
 */
function validatePolicyForm(formData: FormData): FieldErrors {
  const result = policyFormSchema.safeParse({
    policyName: formData.get('policyName') ?? '',
    coverageType: formData.get('coverageType') ?? '',
    monthlyPremium: formData.get('monthlyPremium') ?? '',
    coverageAmount: formData.get('coverageAmount') ?? '',
    nextPayment: formData.get('nextPayment') ?? '',
  });

  if (result.success) return {};

  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FieldErrors;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return errors;
}

export interface NewPolicyFormProps {
  /** Whether a submit is in flight (drives the loading state). */
  pending: boolean;
  /** Latest action state returned by `useFormAction`. */
  state: ActionState;
  /** Submit handler from `useFormAction` (POSTs to `/api/insurance`). */
  formAction: (formData: FormData) => void;
  /** Translator for labels and error messages (en/es). */
  t: Translate;
}

/**
 * Form for creating a new insurance policy. Validates input with Zod before
 * submitting via `useFormAction` to `/api/insurance`, surfacing both
 * client-side and server-side field errors with `aria-invalid` + error text.
 */
export default function NewPolicyForm({ pending, state, formAction, t }: NewPolicyFormProps) {
  const baseId = useId();
  const [errors, setErrors] = useState<FieldErrors>({});

  // Map server validation errors (by path) into per-field error keys.
  const serverErrors: FieldErrors = {};
  for (const ve of state?.validationErrors ?? []) {
    const field = ve.path as keyof FieldErrors;
    if (field && !serverErrors[field]) serverErrors[field] = ve.message;
  }

  const errorFor = (field: keyof FieldErrors): string | undefined => {
    const key = errors[field] ?? serverErrors[field];
    if (!key) return undefined;
    // Client keys are i18n keys (form_err_*); server messages may be raw text.
    return key.startsWith('form_err_') ? t(`insurance.${key}`) : key;
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (event) => {
    const formData = new FormData(event.currentTarget);
    const fieldErrors = validatePolicyForm(formData);
    setErrors(fieldErrors);

    if (Object.keys(fieldErrors).length > 0) {
      event.preventDefault();
      // Focus the first invalid control for keyboard/AT users.
      const firstInvalid = event.currentTarget.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
    }
  };

  const fieldClass =
    'w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand.red focus:border-transparent';
  const invalidClass = 'border-red-500';
  const validClass = 'border-gray-300';

  const renderError = (field: keyof FieldErrors) => {
    const message = errorFor(field);
    if (!message) return null;
    return (
      <p id={`${baseId}-${field}-error`} className="text-red-500 text-sm" role="alert">
        {message}
      </p>
    );
  };

  const ariaProps = (field: keyof FieldErrors, extraClass = '') => {
    const invalid = Boolean(errorFor(field));
    return {
      'aria-invalid': invalid,
      'aria-describedby': invalid ? `${baseId}-${field}-error` : undefined,
      className: `${extraClass} ${fieldClass} ${invalid ? invalidClass : validClass}`.trim(),
    };
  };

  return (
    <form className="space-y-6" action={formAction} onSubmit={handleSubmit} noValidate>
      <div className="grid gap-1">
        <label htmlFor={`${baseId}-policyName`} className="block text-sm font-medium text-gray-700">
          {t('insurance.form_policy_name')}
        </label>
        <input
          id={`${baseId}-policyName`}
          type="text"
          name="policyName"
          defaultValue={state?.policyName}
          placeholder={t('insurance.form_policy_name_ph')}
          {...ariaProps('policyName')}
        />
        {renderError('policyName')}
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${baseId}-coverageType`} className="block text-sm font-medium text-gray-700">
          {t('insurance.form_coverage_type')}
        </label>
        <select
          id={`${baseId}-coverageType`}
          name="coverageType"
          defaultValue={state?.coverageType ?? ''}
          {...ariaProps('coverageType')}
        >
          <option value="" disabled>
            {t('insurance.form_coverage_type_ph')}
          </option>
          <option value="Health">Health</option>
          <option value="Emergency">Emergency</option>
          <option value="Life">Life</option>
        </select>
        {renderError('coverageType')}
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${baseId}-monthlyPremium`} className="block text-sm font-medium text-gray-700">
          {t('insurance.form_monthly_premium')}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-500">$</span>
          <input
            id={`${baseId}-monthlyPremium`}
            type="number"
            name="monthlyPremium"
            defaultValue={state?.monthlyPremium}
            placeholder="20.00"
            step="0.01"
            min="0"
            {...ariaProps('monthlyPremium', 'pl-8')}
          />
        </div>
        {renderError('monthlyPremium')}
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${baseId}-coverageAmount`} className="block text-sm font-medium text-gray-700">
          {t('insurance.form_coverage_amount')}
        </label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-500">$</span>
          <input
            id={`${baseId}-coverageAmount`}
            type="number"
            name="coverageAmount"
            defaultValue={state?.coverageAmount}
            placeholder="1000.00"
            step="0.01"
            min="0"
            {...ariaProps('coverageAmount', 'pl-8')}
          />
        </div>
        {renderError('coverageAmount')}
      </div>

      <div className="grid gap-1">
        <label htmlFor={`${baseId}-nextPayment`} className="block text-sm font-medium text-gray-700">
          {t('insurance.form_next_payment')}
        </label>
        <input
          id={`${baseId}-nextPayment`}
          type="date"
          name="nextPayment"
          defaultValue={state?.nextPayment}
          {...ariaProps('nextPayment')}
        />
        {renderError('nextPayment')}
      </div>

      {state?.error && (
        <div className="text-red-500 text-sm" role="alert">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        className="w-full bg-brand.red text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand.redHover transition disabled:opacity-50"
        disabled={pending}
      >
        {pending ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin w-5 h-5" />
            {t('insurance.form_submitting')}
          </div>
        ) : (
          t('insurance.form_submit')
        )}
      </button>
    </form>
  );
}

export { policyFormSchema, validatePolicyForm };
