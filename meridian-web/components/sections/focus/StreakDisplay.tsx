'use client';

import { motion } from 'framer-motion';
import { Trophy, Zap, Info, Moon } from 'lucide-react';
import { itemVariants } from '@/lib/animations/variants';
import { useStreak } from '@/hooks/useStreak';

export function StreakDisplay() {
  const {
    streak,
    todayXp,
    streakMultiplier,
    isNightOwlActive,
    superchargeMultiplier,
    superchargeTier,
  } = useStreak();

  // Helper to format multipliers as percentage gains
  const formatMultiplier = (val: number) => {
    if (val <= 1.0) return null;
    return `+${Math.round((val - 1) * 100)}%`;
  };

  const streakBonus = formatMultiplier(streakMultiplier);
  const superchargeBonus = formatMultiplier(superchargeMultiplier);

  return (
    <motion.div variants={itemVariants} className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Streak Card */}
        <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Trophy size={18} className="text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Current Streak</span>
          </div>
          <div className="text-3xl font-bold text-primary tabular-nums">
            {streak} {streak === 1 ? 'Day' : 'Days'}
          </div>
        </div>

        {/* Today's XP Card */}
        <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-primary" />
            <span className="text-sm font-medium text-muted-foreground">XP Today</span>
          </div>
          <div className="text-3xl font-bold text-primary tabular-nums">
            {todayXp} XP
          </div>
        </div>
      </div>

      {/* Multiplier Details Card */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Info size={14} className="text-primary" />
          Active XP Boosts
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Streak Boost */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/30">
            <span className="text-muted-foreground">Streak:</span>
            <span className="font-bold text-primary">{streakBonus || '1.0x'}</span>
          </div>

          {/* Supercharge Boost */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 border border-border/30">
            <span className="text-muted-foreground">Supercharge:</span>
            <span className={`font-bold ${superchargeBonus ? 'text-primary' : 'text-muted-foreground'}`}>
              {superchargeBonus || '1.0x'}
            </span>
          </div>

          {/* Night Owl Boost */}
          <div className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
            isNightOwlActive 
              ? 'bg-primary/10 border-primary/20 text-primary' 
              : 'bg-secondary/40 border-border/30 text-muted-foreground'
          }`}>
            <span className="flex items-center gap-1">
              <Moon size={12} className={isNightOwlActive ? 'text-primary' : 'text-muted-foreground'} />
              Night Owl:
            </span>
            <span className="font-bold">{isNightOwlActive ? '+10%' : 'Inactive'}</span>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground leading-normal mt-1">
          💡 Streak adds +10% XP per day (up to +100%). Night Owl gives +10% from 12 AM to 6 AM.
          {superchargeTier !== 'None' && ` Supercharge tier "${superchargeTier}" is currently boosting rewards.`}
        </p>
      </div>
    </motion.div>
  );
}
