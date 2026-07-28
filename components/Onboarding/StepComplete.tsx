import Link from 'next/link';
import { PartyPopper, ArrowRight } from 'lucide-react';

export default function StepComplete() {
  return (
    <div className="flex flex-col items-center text-center space-y-6 max-w-lg mx-auto">
      <div className="w-20 h-20 bg-brand-red/10 text-brand-red rounded-full flex items-center justify-center mb-2 animate-bounce">
        <PartyPopper className="w-10 h-10" />
      </div>
      
      <h2 className="text-3xl font-bold text-white">
        You&apos;re All Set!
      </h2>
      
      <p className="text-gray-300 text-base leading-relaxed">
        Your smart split is active and your first savings goal is ready. 
        Your future remittances will now automatically work for you.
      </p>

      <div className="flex flex-col w-full gap-4 pt-8">
        <Link 
          href="/dashboard"
          className="touch-target-wide flex items-center justify-center gap-2 w-full bg-brand-red hover:bg-red-700 text-white rounded-xl py-3.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-bg1"
        >
          Go to Dashboard
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link 
          href="/split"
          className="touch-target-wide flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl py-3.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-bg1"
        >
          Review Smart Split Configuration
        </Link>
      </div>
    </div>
  );
}
