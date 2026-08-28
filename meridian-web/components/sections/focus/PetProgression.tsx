'use client';

import { motion } from 'framer-motion';
import { Heart, Sparkles, AlertCircle } from 'lucide-react';
import { itemVariants } from '@/lib/animations/variants';
import { usePetState } from '@/hooks/usePetState';

export function PetProgression() {
  const { xp, stage, sprite, health, isDecaying, nextStageXp, progress } = usePetState();

  // Get color for health bar
  const getHealthColor = () => {
    if (health >= 70) return 'bg-emerald-500';
    if (health >= 30) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <motion.div
      variants={itemVariants}
      className="bg-card border border-border rounded-2xl p-8 relative overflow-hidden"
    >
      {/* Decorative Sparkles */}
      <div className="absolute top-4 right-4 text-primary opacity-20 animate-pulse">
        <Sparkles size={24} />
      </div>

      <div className="flex flex-col items-center">
        {/* Animated Floating Pet Sprite */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{
            repeat: Infinity,
            duration: 4,
            ease: 'easeInOut',
          }}
          className="text-7xl mb-4 select-none filter drop-shadow-lg"
        >
          {sprite}
        </motion.div>

        <h3 className="text-xl font-bold text-foreground mb-1">
          {stage} Companion
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          Level up by staying consistent
        </p>

        {/* Stats Grid */}
        <div className="w-full space-y-5">
          {/* XP Progress Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-muted-foreground flex items-center gap-1">
                Progression XP
              </span>
              <span className="text-primary font-bold">
                {xp} {nextStageXp !== null ? `/ ${nextStageXp}` : 'XP (Max Level)'}
              </span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary to-primary/60 h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Health Bar */}
          <div>
            <div className="flex justify-between text-xs font-semibold mb-1.5">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Heart size={14} className={health < 30 ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-rose-500'} />
                Companion Health
              </span>
              <span className={`font-bold ${health < 30 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                {health}%
              </span>
            </div>
            <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
              <div
                className={`${getHealthColor()} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${health}%` }}
              />
            </div>
          </div>
        </div>

        {/* Decay / Supercharge status message */}
        <div className="w-full mt-6 text-center">
          {isDecaying ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium bg-amber-500/10 py-1.5 px-3 rounded-full border border-amber-500/20">
              <AlertCircle size={14} />
              Health decays 10% daily. Focus to restore it!
            </div>
          ) : health < 100 ? (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium bg-emerald-500/10 py-1.5 px-3 rounded-full border border-emerald-500/20">
              <Sparkles size={14} />
              Decay paused by Supercharge. Nurture complete.
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground font-medium bg-secondary/50 py-1.5 px-3 rounded-full">
              Your companion is fully healthy and ready!
            </div>
          )}
        </div>
      </div>
      <div className="text-6xl mb-4" role="img" aria-label="Pet evolution progression from egg to crowned bird">
        🥚 → 🐣 → 🦆 → 🦢 → 👑
      </div>
      <p className="text-muted-foreground">Your pet evolves as you stay focused</p>
    </motion.div>
  );
}
