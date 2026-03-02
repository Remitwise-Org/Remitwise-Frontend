"use client"
import Link from 'next/link'
import { ArrowLeft, Plus, Shield, CheckCircle, Loader2 } from 'lucide-react'
import { ActionState } from '@/lib/auth/middleware';
import { useFormAction } from '@/lib/hooks/useFormAction';

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
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Micro-Insurance</h1>
            </div>
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center space-x-2"
              disabled
            >
              <Plus className="w-5 h-5" />
              <span>New Policy</span>
            </button>
          </div>
        </div>
      </header>

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

        {/* Total Premium */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Total Monthly Premium</h3>
              <p className="text-sm text-gray-600">Auto-paid from remittance allocation</p>
            </div>
            <div className="text-3xl font-bold text-blue-600">$35</div>
          </div>
        </div>

        {/* Add Policy Form */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Create New Policy</h2>
          <form className="space-y-6" action={formAction}>
            <div className='grid gap-1'>
              <label className="block text-sm font-medium text-gray-700 ">
                Policy Name
              </label>
              <input
                type="text"
                name='policyName'
                defaultValue={state?.policyName}
                placeholder="e.g., Health Insurance, Emergency Coverage"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                // disabled
              />
               {state?.validationErrors && (
            <div className="text-red-500 text-sm">{state.validationErrors.find((err)=> err.path === "policyName")?.message || ""}</div>
          )}
            </div>

            <div className='grid gap-1'>
              <label className="block text-sm font-medium text-gray-700">
                Coverage Type
              </label>
              <select
                name='coverageType'
                defaultValue={state.coverageType ?? ""}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                // disabled
              >
                <option value="" disabled>Select coverage type</option>
                <option value="Health">Health</option>
                <option value="Emergency">Emergency</option>
                <option value="Life">Life</option>
              </select>
               {state?.validationErrors && (
            <div className="text-red-500 text-sm">{state.validationErrors.find((err)=> err.path === "coverageType")?.message || ""}</div>
          )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className='grid gap-1'>
                <label className="block text-sm font-medium text-gray-700 ">
                  Monthly Premium (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    name='monthlyPremium'
                    defaultValue={state.monthlyPremium}
                    placeholder="20.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    // disabled
                  />
                   {state?.validationErrors && (
            <div className="text-red-500 text-sm">{state.validationErrors.find((err)=> err.path === "monthlyPremium")?.message || ""}</div>
          )}
                </div>
              </div>

              <div className='grid gap-1'>
                <label className="block text-sm font-medium text-gray-700">
                  Coverage Amount (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    name='coverageAmount'
                    defaultValue={state.coverageAmount}
                    placeholder="1000.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    // disabled
                  />
                   {state?.validationErrors && (
            <div className="text-red-500 text-sm">{state.validationErrors.find((err)=> err.path === "coverageAmount")?.message || ""}</div>
          )}
                </div>
              </div>
            </div>

            <div>
               {state?.error && (
            <div className="text-red-500 text-sm">{state.error}</div>
          )}
          {state?.success && (
            <div className="text-green-500 text-sm">{state.success}</div>
          )}
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              disabled={pending}
            >
              
               {pending ? (
                <div className="flex items-center gap-1">
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Adding...
                </div>
              ) : "Create Policy"}
            </button>
          </form>
        </div>

        {/* Integration Note */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Integration Required:</strong> Connect to insurance smart contract to create policies, 
            pay premiums, and track coverage. Integrate with payment processing for automatic premium payments.
          </p>
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
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
        </div>
        {active && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Active</span>
          </span>
        )}
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

