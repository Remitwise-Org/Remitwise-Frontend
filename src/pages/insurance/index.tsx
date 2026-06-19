"use client"
import { Link } from 'wouter'
import { ArrowLeft, Plus, Shield, Loader2, CalendarClock, ShieldCheck } from 'lucide-react'
import { ActionState } from '@/lib/auth/middleware';
import { useFormAction } from '@/lib/hooks/useFormAction';
import { getPolicyPaymentPresentation } from '@/lib/ui/status-semantics';
import NewPolicyForm from '@/components/forms/NewPolicyForm';

export default function Insurance() {
  type AddInsuranceResponse = ActionState & { 
    policyName?: string; 
    coverageAmount?: number; 
    monthlyPremium?: number; 
    coverageType?: string 
  };
  
  const [state, formAction, pending] = useFormAction<AddInsuranceResponse>("/api/insurance");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Micro-Insurance</h1>
            </div>
            <div className="flex flex-col items-end">
              <button
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 bg-gradient-to-b from-red-600 to-red-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                <Plus className="w-5 h-5" />
                <span>New Policy</span>
              </button>
              <p className="mt-1 text-sm text-gray-500">Policy creation will be available once contract integration is live.</p>
            </div>
          </div>
        </div>
      </header>

      {/* New Policy Form */}
      <NewPolicyForm pending={pending} state={state} formAction={formAction} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Policies */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PolicyCard
              name="Health Insurance"
              coverageType="health"
              monthlyPremium={20}
              coverageAmount={1000}
              nextPayment="2024-02-01"
              active={true}
            />
            <PolicyCard
              name="Emergency Coverage"
              coverageType="emergency"
              monthlyPremium={15}
              coverageAmount={500}
              nextPayment="2024-02-05"
              active={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function PolicyCard({ 
  name, 
  coverageType, 
  monthlyPremium, 
  coverageAmount, 
  nextPayment, 
  active 
}: { 
  name: string; 
  coverageType: string; 
  monthlyPremium: number; 
  coverageAmount: number; 
  nextPayment: string;
  active: boolean; 
}) {
  const presentation = getPolicyPaymentPresentation(nextPayment, active);
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheck className="h-6 w-6 text-emerald-400" aria-hidden />
        <h3 className="font-semibold text-white">{name}</h3>
        <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'}`}>
          {active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SuccessBadge label="Coverage Type" value={coverageType} />
        <SuccessBadge label="Monthly Premium" value={`$${monthlyPremium}/mo`} />
        <SuccessBadge label="Coverage Amount" value={`$${coverageAmount}`} />
        <SuccessBadge label="Next Payment" value={nextPayment} />
      </dl>
    </div>
  );
}

function SuccessBadge({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  if (value === undefined || value === null) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  );
}
