import React from 'react';
import { Zap, Lock, PiggyBank, Globe } from 'lucide-react';

const WhyChooseStellar = () => {
  const features = [
    {
      icon: <Zap size={24} />,
      title: "Lightning Fast Transfers",
      description: "Experience 3-5 second settlement times for cross-border transactions, anywhere in the world."
    },
    {
      icon: <Lock size={24} />,
      title: "Bank-Grade Security",
      description: "On-chain transaction proofs and built-in memos ensure full transparency and traceability."
    },
    {
      icon: <PiggyBank size={24} />,
      title: "Ultra-Low Fees",
      description: "Average transaction cost of just $0.00001—making remittances affordable for everyone."
    },
    {
      icon: <Globe size={24} />,
      title: "Global Ecosystem",
      description: "Robust fiat on/off-ramp network through trusted anchors in 150+ countries."
    }
  ];

  return (
    <section className="py-12 bg-black flex justify-center">
      <div className="w-full max-w-7xl mx-4 sm:mx-6 lg:mx-8 bg-gradient-to-b from-[#1A0505] to-[#0A0A0A] rounded-3xl p-8 md:p-12 lg:p-16 border border-white/5">
        <h2 className="text-4xl md:text-[50px] font-bold text-white mb-16 leading-tight  tracking-[0.34px]">
          Why Choose <span className="text-[#FF4B4B]">Stellar</span> ?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col md:flex-row gap-6 group">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 bg-[#1F0A0A] rounded-2xl flex items-center justify-center text-[#FF4B4B] group-hover:scale-110 transition-transform duration-300 border border-white/5">
                  {feature.icon}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl md:text-2xl font-bold text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-base md:text-lg leading-relaxed max-w-md">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseStellar;
