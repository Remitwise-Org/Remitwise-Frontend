import { Wallet, ShieldCheck, Zap } from 'lucide-react';
import WalletButton from '@/components/WalletButton';

interface StepWalletProps {
  onNext: () => void;
}

export default function StepWallet({ onNext }: StepWalletProps) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
      <div className="w-16 h-16 bg-brand-red/10 text-brand-red rounded-2xl flex items-center justify-center mb-4">
        <Wallet className="w-8 h-8" />
      </div>
      
      <h2 className="text-2xl 375:text-3xl font-bold text-white">
        Connect Your Wallet
      </h2>
      
      <p className="text-gray-300 text-sm 375:text-base leading-relaxed">
        RemitWise uses stellar smart contracts to securely route your remittances. 
        Connect your wallet to enable automated splits for savings, bills, and spending.
      </p>

      <div className="bg-bg2 border border-white/10 rounded-2xl p-5 w-full text-left space-y-4 my-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-300">Non-custodial by design. You retain full control of your assets.</p>
        </div>
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-gray-300">Instant, low-fee settlements via the Stellar network.</p>
        </div>
      </div>

      <div className="flex flex-col w-full gap-4 pt-4">
        {/* We can use the actual WalletButton, and also provide a mock "Continue" for testing the flow easily */}
        <div className="flex justify-center w-full">
          <WalletButton />
        </div>
        
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink-0 mx-4 text-gray-500 text-xs uppercase tracking-wider">or for this demo</span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        <button
          onClick={onNext}
          className="touch-target-wide w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl py-3.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-bg1"
        >
          Simulate Connection & Continue
        </button>
      </div>
    </div>
  );
}
