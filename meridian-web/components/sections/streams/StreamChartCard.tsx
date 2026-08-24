// meridian-web/components/sections/stream/StreamChartCard.tsx
"use client";

import React from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ChartProps {
  salary: number;
  ratePerSecond: number;
}

export default function StreamChartCard({ salary, ratePerSecond }: ChartProps) {
  // Generate 6 chronological increments representing accrued earnings over a 12-hour window
  const chartData = [
    { name: "0h", earnings: 0 },
    { name: "2h", earnings: Math.round(ratePerSecond * 2 * 3600) },
    { name: "4h", earnings: Math.round(ratePerSecond * 4 * 3600) },
    { name: "6h", earnings: Math.round(ratePerSecond * 6 * 3600) },
    { name: "8h", earnings: Math.round(ratePerSecond * 8 * 3600) },
    { name: "10h", earnings: Math.round(ratePerSecond * 10 * 3600) },
    { name: "12h", earnings: Math.round(ratePerSecond * 12 * 3600) },
  ];

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Projected Cumulative Stream Curve (12 Hours)
      </h3>

      {/* Chart Canvas Wrap — Aspect ratio wrapper prevents SSR sizing collapse */}
      <div 
        className="w-full h-64 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg p-2"
        role="img" 
        aria-label={`Line chart visualizing incremental earnings accumulation scaling up to a 12 hour maximum of $${chartData[6].earnings}`}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
            <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} tickLine={false} />
            <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} />
            <Tooltip 
              formatter={(value) => [`$${value}`, "Earned"]}
              contentStyle={{ backgroundColor: "#18181b", borderRadius: "6px", color: "#fff" }}
            />
            <Area 
              type="monotone" 
              dataKey="earnings" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorEarnings)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ♿ Screen Reader Accessible Semantic Fallback Table */}
      <div className="sr-only">
        <h4>Stream Earnings Projection Data Table</h4>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th scope="col">Time Interval (Hours)</th>
              <th scope="col">Accumulated Value (USD)</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>${row.earnings.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}