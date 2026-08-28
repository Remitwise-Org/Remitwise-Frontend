'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { cardReveal, sectionViewport } from '@/lib/animations/variants';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const RAW_STREAM_DATA = [
  { time: '9:00', amount: 0 },
  { time: '12:00', amount: 125 },
  { time: '15:00', amount: 250 },
  { time: '18:00', amount: 375 },
  { time: '21:00', amount: 500 },
  { time: '24:00', amount: 625 },
];

function StreamChartCardBase() {
  // Memoize the dataset so the chart never re-derives on every render.
  const streamData = useMemo(() => RAW_STREAM_DATA, []);

  const peak = useMemo(
    () => streamData.reduce((max, point) => Math.max(max, point.amount), 0),
    [streamData],
  );

  const summary = `Line chart showing real-time payment stream growth from ${streamData[0].amount} at ${streamData[0].time} to ${peak} by ${streamData[streamData.length - 1].time}.`;

  return (
    <motion.div
      role="presentation"
      aria-hidden="true"
      variants={cardReveal}
      initial="hidden"
      whileInView="visible"
      viewport={sectionViewport}
      className="bg-card border border-border rounded-2xl p-8"
    >
      <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <TrendingUp size={20} className="text-primary" />
        Real-Time Payment Stream
      </h3>

      <div role="img" aria-label={summary} className="w-full">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={streamData}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="time" stroke="var(--color-muted-foreground)" />
            <YAxis stroke="var(--color-muted-foreground)" />
            <Tooltip
              cursor={false}
              allowEscapeViewBox={{ x: false, y: false }}
              contentStyle={{
                backgroundColor: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'var(--color-foreground)' }}
            />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="var(--color-primary)"
              strokeWidth={3}
              dot={{ fill: 'var(--color-primary)', r: 6 }}
              activeDot={{ r: 8 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible summary for screen readers (duplicated as visible caption below). */}
      <p className="sr-only">{summary}</p>

      <p className="text-sm text-muted-foreground mt-4">
        Your salary flows in real-time throughout the day
      </p>
    </motion.div>
  );
}

export const StreamChartCard = memo(StreamChartCardBase);
