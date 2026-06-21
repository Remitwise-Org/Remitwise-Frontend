import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Mock form for creating a new insurance policy.
 * All input fields are disabled to indicate the feature is not yet integrated
 * with the USDC smart contract backend. The form mirrors the design spec:
 * - Coverage Type selection
 * - Monthly Premium input
 * - Coverage Amount input
 * - Next Payment date picker
 * The submit button uses the brand red styling via PrimaryButton (imported by the parent).
 */
export default function NewPolicyForm({ pending, state, formAction }: {
  pending: boolean;
  state: any;
  formAction: any;
}) {
  return (
    <form className="space-y-6" action={formAction}>
      <div className="grid gap-1">
        <label className="block text-sm font-medium text-gray-700">Policy Name</label>
        <input
          type="text"
          name="policyName"
          defaultValue={state?.policyName}
          placeholder="e.g., Health Insurance"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand.red focus:border-transparent"
          disabled
        />
      </div>

      <div className="grid gap-1">
        <label className="block text-sm font-medium text-gray-700">Coverage Type</label>
        <select
          name="coverageType"
          defaultValue={state?.coverageType ?? ''}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand.red focus:border-transparent"
          disabled
        >
          <option value="" disabled>Select coverage type</option>
          <option value="Health">Health</option>
          <option value="Emergency">Emergency</option>
          <option value="Life">Life</option>
        </select>
      </div>

      <div className="grid gap-1">
        <label className="block text-sm font-medium text-gray-700">Monthly Premium (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-500">$</span>
          <input
            type="number"
            name="monthlyPremium"
            defaultValue={state?.monthlyPremium}
            placeholder="20.00"
            step="0.01"
            min="0"
            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand.red focus:border-transparent"
            disabled
          />
        </div>
      </div>

      <div className="grid gap-1">
        <label className="block text-sm font-medium text-gray-700">Coverage Amount (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-3 text-gray-500">$</span>
          <input
            type="number"
            name="coverageAmount"
            defaultValue={state?.coverageAmount}
            placeholder="1000.00"
            step="0.01"
            min="0"
            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand.red focus:border-transparent"
            disabled
          />
        </div>
      </div>

      <div className="grid gap-1">
        <label className="block text-sm font-medium text-gray-700">Next Payment Date</label>
        <input
          type="date"
          name="nextPayment"
          defaultValue={state?.nextPayment}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand.red focus:border-transparent"
          disabled
        />
      </div>

      {state?.error && <div className="text-red-500 text-sm">{state.error}</div>}
      {state?.success && <div className="text-green-500 text-sm">{state.success}</div>}

      <button
        type="submit"
        className="w-full bg-brand.red text-white px-6 py-3 rounded-lg font-semibold hover:bg-brand.redHover transition disabled:opacity-50"
        disabled={pending}
      >
        {pending ? (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="animate-spin w-5 h-5" />
            Adding...
          </div>
        ) : (
          'Create Policy'
        )}
      </button>
    </form>
  );
}
