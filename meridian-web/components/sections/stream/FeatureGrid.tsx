'use client';

import { motion } from 'framer-motion';
import { Clock, Wallet, TrendingUp, type LucideIcon } from 'lucide-react';
import { itemVariants } from '@/lib/animations/variants';

interface StreamFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: StreamFeature[] = [
  {
    icon: Clock,
    title: 'Real-Time Flow',
    description:
      'Receive salary continuously instead of waiting for payday. Every second counts.',
  },
  {
    icon: Wallet,
    title: 'Instant Withdrawals',
    description:
      'Access your streamed earnings anytime without waiting periods or fees.',
  },
  {
    icon: TrendingUp,
    title: 'Transparent Rates',
    description:
      'Know exactly how much you earn per second with clear, predictable payment streams.',
  },
];

export function FeatureGrid() {
  return (
    <>
      {features.map((feature) => {
        const Icon = feature.icon;
        return (
          <motion.div
            key={feature.title}
            variants={itemVariants}
            className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon size={24} className="text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
}
