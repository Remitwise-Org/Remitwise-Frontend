'use client';

import { motion } from 'framer-motion';
import { Zap, BarChart3, Award, type LucideIcon } from 'lucide-react';
import { itemVariants } from '@/lib/animations/variants';

interface PoolFeature {
  icon: LucideIcon;
  title: string;
  description: string;
}

const features: PoolFeature[] = [
  {
    icon: Zap,
    title: 'Auto-Compounding',
    description:
      'Your earnings automatically reinvest to maximize growth without any action needed.',
  },
  {
    icon: BarChart3,
    title: 'Weekly Distribution',
    description:
      'Yield is distributed every week based on your focus activity and pool participation.',
  },
  {
    icon: Award,
    title: 'No Impermanent Loss',
    description:
      'Your principal is always safe. You only gain from pool participation, never lose.',
  },
];

export function PoolFeatureGrid() {
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
