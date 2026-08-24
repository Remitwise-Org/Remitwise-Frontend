// meridian-web/components/sections/stream/EarningsCalculator.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useMotionValue, useTransform, animate, motion, useReducedMotion } from "framer-motion";
import StreamChartCard from "./StreamChartCard";

export default function EarningsCalculator() {
  const [salary, setSalary] = useState<number>(60000); // Default $60,000/year
  const shouldReduceMotion = useReducedMotion();

  // Math constants based on a standard 2,080 hour work year
  // (Or 365 days continuous depending on the stream logic. Here we use 365-day continuous accrual)
  const SECONDS_IN_YEAR = 365 * 24 * 60 * 60; 
  const ratePerSecond = salary / SECONDS_IN_YEAR;

  // Motion values for high-performance, non-re-rendering counter ticks
  const count = useMotionValue(0);
  const roundedCount = useTransform(count, (latest) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
    }).format(latest)
  );

  useEffect(() => {
    // Reset counter when salary changes
    count.set(0);

    if (shouldReduceMotion) {
      // If user prefers reduced motion, do not animate ticks. Set fixed baseline or update statically.
      count.set(ratePerSecond);
      return;
    }

    // Animate the counter upward continuously per second to show real-time stream velocity
    const controls = animate(count, salary, {
      duration: SECONDS_IN_YEAR,
      ease: "linear",
    });

    return () => controls.stop();
  }, [salary, ratePerSecond, shouldReduceMotion]);

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-xl shadow-md space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Real-Time Stream Earnings Calculator
        </h2>
        <p className="text-sm text-zinc-500">
          Visualize payment streams rolling in at a microsecond cadence.
        </p>
      </div>

      {/* Controls Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-lg">
        <div className="flex flex-col space-y-2">
          <label htmlFor="salary-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Target Annual Salary (USD)
          </label>
          <input
            id="salary-input"
            type="number"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="p-2 border rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white"
            min="0"
          />
        </div>

        <div className="flex flex-col space-y-2 justify-center">
          <label htmlFor="salary-slider" className="sr-only">Adjust Salary Range</label>
          <input
            id="salary-slider"
            type="range"
            min="10000"
            max="250000"
            step="500"
            value={salary}
            onChange={(e) => setSalary(Number(e.target.value))}
            className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </div>

      {/* Live Metrics View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
        <div className="p-4 border rounded-lg dark:border-zinc-700">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Accrual Velocity</span>
          <p className="text-xl font-bold text-zinc-800 dark:text-zinc-100">
            ${ratePerSecond.toFixed(6)} <span className="text-xs text-zinc-500">/ sec</span>
          </p>
        </div>

        <div className="p-4 border rounded-lg bg-zinc-900 text-white dark:bg-black">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Live Streaming Balance</span>
          <p className="text-2xl font-mono font-bold text-emerald-400 tracking-tight">
            {shouldReduceMotion ? (
              <span>${ratePerSecond.toFixed(4)}</span>
            ) : (
              <motion.span>{roundedCount}</motion.span>
            )}
          </p>
        </div>
      </div>

      {/* Graph Visualizer Integration */}
      <StreamChartCard salary={salary} ratePerSecond={ratePerSecond} />
    </div>
  );
}