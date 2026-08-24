import { useFocusContext } from '@/context/FocusContext';
import { useState, useEffect } from 'react';

export interface StreakState {
  streak: number;
  todayXp: number;
  streakMultiplier: number;
  isNightOwlActive: boolean;
  superchargeMultiplier: number;
  superchargeTier: string;
}

export function useStreak(): StreakState {
  const { streak, todayXp, superchargeTier } = useFocusContext();
  const [isNightOwlActive, setIsNightOwlActive] = useState<boolean>(false);

  // Update night owl status periodically or on mount
  useEffect(() => {
    const checkNightOwl = () => {
      const hours = new Date().getHours();
      setIsNightOwlActive(hours >= 0 && hours < 6);
    };

    checkNightOwl();
    const interval = setInterval(checkNightOwl, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  // Streak multiplier: 1 + Math.min(streak * 0.1, 1.0)
  const streakMultiplier = 1 + Math.min(streak * 0.1, 1.0);

  // Supercharge multiplier:
  let superchargeMultiplier = 1.0;
  if (superchargeTier === 'Gentle Flow') superchargeMultiplier = 1.2;
  else if (superchargeTier === 'Power Surge') superchargeMultiplier = 1.4;
  else if (superchargeTier === 'Max Overdrive') superchargeMultiplier = 1.7;

  return {
    streak,
    todayXp,
    streakMultiplier,
    isNightOwlActive,
    superchargeMultiplier,
    superchargeTier,
  };
}
