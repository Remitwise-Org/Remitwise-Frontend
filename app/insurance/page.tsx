"use client"
import Link from 'next/link'
import { ArrowLeft, Plus, Shield, Loader2, CalendarClock } from 'lucide-react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { ActionState } from '@/lib/auth/middleware';
import { useFormAction } from '@/lib/hooks/useFormAction';
import { getPolicyPaymentPresentation } from '@/lib/ui/status-semantics';
import NewPolicyForm from '@/components/forms/NewPolicyForm';

export default function Insurance() {

    type AddInsuranceResponse = ActionState & { policyName?: string; coverageAmount?: number, monthlyPremium?: number, coverageType?: string };
  
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
            <PrimaryButton
              className="flex items-center gap-2"
              disabled
            >
              <Plus className="w-5 h-5" />
              <span>New Policy</span>
            </PrimaryButton>
            <p className="mt-1 text-sm text-gray-500">Policy creation will be available once contract integration is live.</p>
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
function PolicyCard({ name, coverageType, monthlyPremium, coverageAmount, nextPayment, active }: { 
  name: string, 
  coverageType: string, 
  monthlyPremium: number, 
  coverageAmount: number, 
  nextPayment: string,
  active: boolean 
}) {
  const paymentStatus = getPolicyPaymentPresentation(nextPayment, active);
  const StatusIcon = paymentStatus.icon;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatus.badgeClassName}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{paymentStatus.label}</span>
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Coverage Type</span>
          <span className="font-semibold text-gray-900 capitalize">{coverageType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Monthly Premium</span>
          <span className="font-semibold text-gray-900">${monthlyPremium}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Coverage Amount</span>
          <span className="font-semibold text-gray-900">${coverageAmount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Next Payment</span>
          <span className="font-semibold text-gray-900">{nextPayment}</span>
        </div>
      </div>

      <div className={`mt-4 rounded-lg border px-3 py-3 ${paymentStatus.panelClassName}`}>
        <div className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{paymentStatus.label}</p>
            <p className="text-sm">{paymentStatus.emphasis}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-700">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Next scheduled payment: {nextPayment}</span>
            </p>
          </div>
        </div>
      </div>

      {active && (
        <button
          className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
          disabled
        >
          Pay Premium Now
"use client"
import Link from 'next/link'
import { ArrowLeft, Plus, Shield, Loader2, CalendarClock } from 'lucide-react'
import PrimaryButton from '@/components/ui/PrimaryButton'
import { ActionState } from '@/lib/auth/middleware';
import { useFormAction } from '@/lib/hooks/useFormAction';
import { getPolicyPaymentPresentation } from '@/lib/ui/status-semantics';
import NewPolicyForm from '@/components/forms/NewPolicyForm';

export default function Insurance() {

    type AddInsuranceResponse = ActionState & { policyName?: string; coverageAmount?: number, monthlyPremium?: number, coverageType?: string };
  
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
            <PrimaryButton
              className="flex items-center gap-2"
              disabled
            >
              <Plus className="w-5 h-5" />
              <span>New Policy</span>
            </PrimaryButton>
            <p className="mt-1 text-sm text-gray-500">Policy creation will be available once contract integration is live.</p>
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
  )
}

function PolicyCard({ name, coverageType, monthlyPremium, coverageAmount, nextPayment, active }: { 
  name: string, 
  coverageType: string, 
  monthlyPremium: number, 
  coverageAmount: number, 
  nextPayment: string,
  active: boolean 
}) {
  const paymentStatus = getPolicyPaymentPresentation(nextPayment, active);
  const StatusIcon = paymentStatus.icon;

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatus.badgeClassName}`}>
          <StatusIcon className="h-3.5 w-3.5" />
          <span>{paymentStatus.label}</span>
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Coverage Type</span>
          <span className="font-semibold text-gray-900 capitalize">{coverageType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Monthly Premium</span>
          <span className="font-semibold text-gray-900">${monthlyPremium}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Coverage Amount</span>
          <span className="font-semibold text-gray-900">${coverageAmount}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Next Payment</span>
          <span className="font-semibold text-gray-900">{nextPayment}</span>
        </div>
      </div>

      <div className={`mt-4 rounded-lg border px-3 py-3 ${paymentStatus.panelClassName}`}>
        <div className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{paymentStatus.label}</p>
            <p className="text-sm">{paymentStatus.emphasis}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-700">
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Next scheduled payment: {nextPayment}</span>
            </p>
          </div>
        </div>
      </div>

      {active && (
        <button
          className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
          disabled
        >
          Pay Premium Now
        </button>
      )}
    </div>
  )
}
