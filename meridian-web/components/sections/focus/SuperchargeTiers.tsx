'use client';

import { motion } from 'framer-motion';
import { containerVariants, itemVariants } from '@/lib/animations/variants';
import { useFocusContext, SuperchargeTier } from '@/context/FocusContext';
import { ShieldCheck, Zap } from 'lucide-react';

interface Tier {
  tier: SuperchargeTier;
  rate: string;
  multiplier: string;
  color: string;
  features: string[];
}

const superchargeTiersList: Tier[] = [
  {
    tier: 'Gentle Flow',
    rate: '1 XLM/mo',
    multiplier: '1.2x',
    color: '#CD7F32', // Bronzeish
    features: ['1.2x XP multiplier', 'Pauses companion health decay', 'Streams 1 XLM/mo to community pool'],
  },
  {
    tier: 'Power Surge',
    rate: '5 XLM/mo',
    multiplier: '1.4x',
    color: '#C0C0C0', // Silverish
    features: ['1.4x XP multiplier', 'Pauses companion health decay', 'Streams 5 XLM/mo to community pool', 'Custom pet badge'],
  },
  {
    tier: 'Max Overdrive',
    rate: '10 XLM/mo',
    multiplier: '1.7x',
    color: '#FFD700', // Goldish
    features: ['1.7x XP multiplier', 'Pauses companion health decay', 'Streams 10 XLM/mo to community pool', 'Custom pet badge', 'Exclusive shop access'],
  },
];

export function SuperchargeTiers() {
  const { superchargeTier, selectSuperchargeTier } = useFocusContext();

  const handleSelectTier = (tier: SuperchargeTier) => {
    if (superchargeTier === tier) {
      // Toggle off to None
      selectSuperchargeTier('None');
    } else {
      selectSuperchargeTier(tier);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-1 mb-6">
        <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Zap size={22} className="text-primary fill-primary/20" />
          Supercharge Your Focus
        </h3>
        <p className="text-sm text-muted-foreground">
          Stream XLM in real-time to boost rewards and pause pet health decay.
        </p>
      </div>

      <div className="space-y-4">
        {superchargeTiersList.map((item) => {
          const isActive = superchargeTier === item.tier;
          return (
            <motion.div
              key={item.tier}
              variants={itemVariants}
              onClick={() => handleSelectTier(item.tier)}
              className={`bg-card border rounded-2xl p-6 transition-all duration-200 cursor-pointer group relative overflow-hidden select-none hover:scale-[1.01] active:scale-[0.99] ${
                isActive
                  ? 'border-primary shadow-lg shadow-primary/10 bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {isActive && (
                <div className="absolute top-4 right-4 flex items-center gap-1.5 text-xs text-primary font-bold bg-primary/15 py-1 px-2.5 rounded-full border border-primary/20">
                  <ShieldCheck size={14} />
                  Active Stream
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-bold text-foreground text-lg flex items-center gap-2">
                    {item.tier}
                    <span className="text-xs font-semibold text-muted-foreground">
                      ({item.rate})
                    </span>
                  </h4>
                  <p className="text-sm text-primary font-bold">{item.multiplier} XP Multiplier</p>
                </div>
                {!isActive && (
                  <div
                    className="w-8 h-8 rounded-full transition-opacity group-hover:opacity-100"
                    style={{ backgroundColor: item.color, opacity: 0.15 }}
                  />
                )}
              </div>
              <ul className="space-y-2">
                {item.features.map((feature) => (
                  <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
