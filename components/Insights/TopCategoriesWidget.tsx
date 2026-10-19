'use client';

import React from "react";
import { BarChart3, Info } from "lucide-react";
import { INSIGHTS_PALETTE } from './palette';

interface CategoryData {
  name: string;
  amount: number;
  percentage: number;
}

const categories: CategoryData[] = [
  { name: "Family Support", amount: 1800, percentage: 56 },
  { name: "Education", amount: 850, percentage: 26 },
  { name: "Medical", amount: 390, percentage: 12 },
  { name: "Emergency", amount: 200, percentage: 6 },
];

// Use palette colors for progress bars (first N colors)
const progressColors = INSIGHTS_PALETTE.slice(0, categories.length);

export const TopCategoriesWidget: React.FC = () => {
  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-6 w-full max-w-md backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-8">
        <div className="bg-red-500/10 p-2 rounded-lg">
          <BarChart3 className="w-5 h-5 text-red-500" />
        </div>
        <div>
          <h2 className="text-white text-xl font-semibold">Top Categories</h2>
          <p className="text-gray-500 text-sm">Remittance breakdown</p>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-6">
        {categories.map((category, idx) => (
          <div key={category.name} className="space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-white font-medium">{category.name}</span>
              <div className="flex items-end gap-3 text-right">
                <span className="text-white font-bold leading-none">
                  ${category.amount.toLocaleString()}
                </span>
                <span className="text-gray-500 text-sm leading-none">
                  {category.percentage}%
                </span>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${category.percentage}%`, backgroundColor: progressColors[idx] }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Alert Box */}
      <div className="mt-10 p-4 bg-red-950/20 border border-red-900/40 rounded-2xl flex gap-3 items-start">
        <div className="mt-0.5">
          <Info className="w-4 h-4 text-red-500" />
        </div>
        <p className="text-gray-300 text-sm leading-relaxed">
          <span className="text-red-500 font-semibold">{categories[0].percentage}%</span> of your remittances go to {categories[0].name.toLowerCase()}. Consider setting up automatic transfers!
        </p>
      </div>

      {/* Screen‑reader summary */}
      <p className="sr-only" aria-live="polite">
        {categories.map(c => `${c.name}: ${c.percentage}% amount $${c.amount.toLocaleString()}`).join(', ')}
      </p>
    </div>
  );
};
