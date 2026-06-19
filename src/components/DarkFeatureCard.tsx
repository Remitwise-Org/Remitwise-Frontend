import React from 'react';

interface DarkFeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const DarkFeatureCard: React.FC<DarkFeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] p-8 rounded-2xl flex flex-col items-start gap-5 border border-white/8 hover:border-white/15 transition-all duration-300 group shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-red-600/10">
      {/* Icon container with minimal background */}
      <div className="w-12 h-12 bg-gradient-to-br from-[#DC2626]/10 to-[#8B4513]/5 rounded-xl flex items-center justify-center text-[#FF5544] group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
        {icon}
      </div>
      
      {/* Content */}
      <div className="space-y-2 flex-grow">
        <h3 className="text-xl font-bold text-white leading-tight group-hover:text-[#FF5544] transition-colors duration-300">
          {title}
        </h3>
        <p className="text-gray-400 text-base leading-relaxed">
          {description}
        </p>
      </div>

      {/* Subtle accent line on hover */}
      <div className="w-0 group-hover:w-12 h-1 bg-gradient-to-r from-[#DC2626] to-[#FF6B35] rounded-full transition-all duration-300 mt-2" />
    </div>
  );
};

export default DarkFeatureCard;
