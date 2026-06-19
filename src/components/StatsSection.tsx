import React from 'react';

const stats = [
  { value: '120K+', label: 'Active Families' },
  { value: '150+', label: 'Countries Served' },
  { value: '32K+', label: 'Savings Goals' },
  { value: '12', label: 'Industry Awards' },
];

const StatsSection = () => {
  return (
    <section className="w-full bg-black py-16 md:py-20 flex justify-center border-y border-white/5">
      <div className="w-full max-w-[928px] mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-x-8 md:gap-y-0 text-center">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="flex flex-col items-center justify-center md:h-[90.5px] transition-all duration-300 hover:translate-y-[-4px]"
            >
              <div className="text-[42px] md:text-[64px] font-bold text-white leading-none tracking-tight mb-2 md:mb-1 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                {stat.value}
              </div>
              <div className="text-[#808080] text-[12px] md:text-[14px] font-medium uppercase tracking-[0.2em]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
