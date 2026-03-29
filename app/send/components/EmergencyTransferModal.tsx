'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface EmergencyTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function EmergencyTransferModal({
  isOpen,
  onClose,
}: EmergencyTransferModalProps) {
  const [confirmed, setConfirmed] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Subtle Atmospheric Glow */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-red-900/20 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none" />

        {/* Header */}
        <div className="relative p-8 pb-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="bg-red-500/10 p-3 rounded-2xl">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Emergency Transfer</h2>
              <p className="text-zinc-500 text-sm">Priority immediate delivery</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="relative p-8 space-y-8">

          {/* Warning */}
          <div className="bg-red-950/20 border border-red-900/30 rounded-2xl p-5 flex items-start gap-4">
             <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
             <p className="text-sm text-red-200/80 leading-relaxed">
              This transfer bypasses your automatic split rules and is processed immediately. A 2% emergency handling fee will be added.
             </p>
          </div>

          <div className="space-y-6">
            {/* Confirmation Toggle */}
            <label className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.07] transition-all active:scale-[0.99]">
              <div className="flex items-center h-6">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-700 bg-zinc-800 text-red-600 focus:ring-red-600 focus:ring-offset-zinc-900"
                />
              </div>
              <div className="space-y-1">
                <span className="text-white font-bold block">I understand the implications</span>
                <span className="text-zinc-500 text-sm block leading-snug">
                  By checking this, I agree to the 2% fee and immediate processing.
                </span>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-4 pt-4">
            <button
              disabled={!confirmed}
              className={`w-full py-5 rounded-2xl font-bold text-lg transition-all transform active:scale-[0.98] shadow-lg flex items-center justify-center gap-3
                ${
                  confirmed
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-900/40'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }
              `}
            >
              Confirm Emergency Transfer
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium"
            >
              Cancel and Return
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
