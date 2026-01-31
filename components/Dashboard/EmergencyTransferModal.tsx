import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  Users, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Check,
  DollarSign
} from 'lucide-react';

const EmergencyTransferModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [speed, setSpeed] = useState<'emergency' | 'regular'>('emergency');
  const [amount, setAmount] = useState<number>(0);
  const [agreed, setAgreed] = useState<boolean>(false);

  const priorityFee = speed === 'emergency' ? 2.00 : 0.00;
  const total = amount + priorityFee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6">
      
      <div className="w-full max-w-3xl rounded-2xl sm:rounded-[32px] border border-zinc-800 bg-[#0A0A0A] p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-hide">
        
        <div className="flex items-start justify-between mb-6 sm:mb-8">
          <div className="flex gap-3 sm:gap-4">
            <div className="rounded-2xl bg-[#B91C1C] flex items-center p-4 sm:w-12 sm:p-3 shadow-[0_0_20px_rgba(220,38,38,0.4)] shrink-0">
              <Zap size={24} fill="#ef4444" className="text-white" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 solid border-[#DC262666]">
                <h2 className="text-lg sm:text-2xl font-bold text-white tracking-tight">Emergency Transfer</h2>
                <span className="rounded-full bg-red-600/10 px-2.5 py-0.5 text-[10px] font-black text-red-500 border border-red-500/20 uppercase whitespace-nowrap">Priority</span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium mt-1">Priority processing guaranteed.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 p-2 text-zinc-500 hover:text-white transition-all shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4">
          <div className="flex gap-3">
            <AlertCircle size={20} className="shrink-0 text-red-500" />
            <div className="text-xs sm:text-[13px] leading-relaxed">
              <span className="font-bold text-[#DC2626] text-sm block mb-1">Emergency Priority Transfer:</span>
              <span className='text-white opacity-55'>
                This transfer will be processed with highest priority. Additional fees apply.
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="group">
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2 group-focus-within:text-white">
              <Users size={16} className="text-red-500" />
              Recipient Name
            </label>
            <input 
              type="text" 
              placeholder="Enter recipient name" 
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all text-sm sm:text-base"
            />
          </div>
          
          <div className="group">
             <label className="flex items-center gap-2 text-sm font-bold text-zinc-400 mb-2 transition-colors group-focus-within:text-white">
               Country
             </label>
             <input 
               type="text" 
               placeholder="Select country"
               className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all text-sm sm:text-base"
             />
          </div>

          <div className="group">
            <label className="flex items-center gap-2 text-sm font-bold text-zinc-400 mb-2 transition-colors group-focus-within:text-white">
              <DollarSign size={16} className="text-red-500" />
              Amount (USDC)
            </label>
            <div className="relative">
              <input 
                type="number" 
                value={amount || ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0.00" 
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 pr-20 text-white placeholder:text-zinc-600 focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 outline-none transition-all font-semibold text-sm sm:text-base"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs sm:text-sm font-bold text-zinc-500 pointer-events-none">USDC</span>
            </div>
          </div>
        </div>

      <div className="my-4 sm:my-8 rounded-2xl sm:rounded-3xl bg-zinc-900/20 p-4 sm:p-6 border border-zinc-800/40 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <span className="text-xs sm:text-sm text-zinc-500 font-medium">Transfer Amount</span>
          <span className="text-sm sm:text-base font-bold text-white">{amount.toLocaleString()} USDC</span>
        </div>

        <div className="flex justify-between items-center mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
             <span className="text-xs sm:text-sm text-zinc-500 font-medium">Priority Fee</span>
             <span className="bg-red-500/10 text-red-500 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-md font-black tracking-widest border border-red-500/10">FAST</span>
          </div>
          <span className="text-sm sm:text-base font-bold text-red-500">+{priorityFee.toFixed(2)} USDC</span>
        </div>

        <div className="flex justify-between items-end border-t border-zinc-800 pt-4 sm:pt-5">
          <span className="text-sm sm:text-base font-bold text-zinc-400 mb-0.5">Total Payment</span>
          <span className="text-xl sm:text-3xl font-bold text-red-500 tracking-tighter shadow-red-500/20 drop-shadow-md">
              {total.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDC
          </span>
        </div>
      </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <button 
            onClick={() => setSpeed('emergency')}
            className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 sm:p-4 transition-all ${speed === 'emergency' ? 'border-red-600/50 bg-red-600/5 shadow-[0_0_15px_rgba(220,38,38,0.1)]' : 'border-zinc-800 bg-zinc-900/20 grayscale opacity-40'}`}
          >
            <Zap size={18} fill={speed === 'emergency' ? "#ef4444" : "none"} className="text-red-500" />
            <span className="text-sm font-bold text-white">Emergency</span>
            <span className="text-[10px] text-zinc-500 uppercase font-black">2-5 Minutes</span>
          </button>
          
          <button 
            onClick={() => setSpeed('regular')}
            className={`flex flex-col items-start gap-1 rounded-2xl border-2 p-3 sm:p-4 transition-all ${speed === 'regular' ? 'border-zinc-600 bg-zinc-800/20' : 'border-zinc-800 bg-zinc-900/20 grayscale opacity-50'}`}
          >
            <Clock size={18} className="text-zinc-400" />
            <span className="text-sm font-bold text-zinc-200">Regular</span>
            <span className="text-[10px] text-zinc-300 uppercase font-black">30-60 Minutes</span>
          </button>
        </div>

        <label className="flex items-start sm:items-center gap-3 mb-6 sm:mb-8 cursor-pointer group">
          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all ${agreed ? 'border-red-500 bg-red-500 text-white' : 'border-zinc-700 bg-zinc-900/50'}`}>
            {agreed && <Check size={14} strokeWidth={4} />}
          </div>
          <input 
            type="checkbox" 
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="hidden"
          />
          <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors select-none">
            I agree to the <span className="text-red-500 hover:underline">Priority Fee terms</span> and understand this action is irreversible.
          </span>
        </label>

        <div className="flex gap-3 sm:gap-4">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-zinc-900 py-3 sm:py-4 font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all text-sm sm:text-base">Cancel</button>
          <button 
            disabled={!agreed || amount <= 0}
            className="flex-1 flex items-center justify-center gap-2 sm:gap-3 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 py-3 sm:py-4 font-bold text-white shadow-[0_8px_20px_rgba(220,38,38,0.3)] hover:brightness-110 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all text-sm sm:text-base"
          >
            Review <span className="hidden sm:inline">Transfer</span> <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmergencyTransferModal;