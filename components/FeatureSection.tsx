import React from 'react';
import { Zap, Split, TrendingUp, FileText, Shield, Users } from 'lucide-react';
import DarkFeatureCard from './DarkFeatureCard';

const features = [
  {
    icon: <Zap size={24} />,
    title: "Instant Settlement",
    description: "Send money across borders in seconds with minimal fees powered by Stellar's instant settlement infrastructure."
  },
  {
    icon: <Split size={24} />,
    title: "Smart Split",
    description: "Automatically allocate each remittance into spending, savings, bills, and insurance based on your preferences."
  },
  {
    icon: <TrendingUp size={24} />,
    title: "Yield Savings",
    description: "Earn competitive returns on your savings through our DeFi integration while maintaining full control."
  },
  {
    icon: <FileText size={24} />,
    title: "Global Bills",
    description: "Pay bills across 120+ countries with automated payments for electricity, rent, school fees, and more."
  },
  {
    icon: <Shield size={24} />,
    title: "Micro-Insurance",
    description: "Comprehensive health and emergency coverage with auto-paid premiums directly from your remittances."
  },
  {
    icon: <Users size={24} />,
    title: "Family Wallets",
    description: "Manage separate wallets with spending limits and approval workflows to keep your family's finances secure."
  }
];

const FeatureSection = () => {
  return (
    <section className="relative py-20 md:py-28 bg-black">
      {/* Warm accent gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#2d1510]/5 to-transparent pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Core Features Built for Global Families
          </h2>
          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
            Everything you need to manage, save, protect, and grow your money across borders
          </p>
        </div>

        {/* Feature grid - 2 columns on mobile, 3 columns on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => (
            <DarkFeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeatureSection;
