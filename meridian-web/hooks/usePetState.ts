import { useFocusContext } from '@/context/FocusContext';

export interface PetState {
  xp: number;
  stage: string;
  sprite: string;
  health: number;
  isDecaying: boolean;
  nextStageXp: number | null;
  progress: number;
}

const STAGES = [
  { name: 'Egg', minXp: 0, maxXp: 99, sprite: '🥚', nextThreshold: 100 },
  { name: 'Baby', minXp: 100, maxXp: 299, sprite: '🐣', nextThreshold: 300 },
  { name: 'Teen', minXp: 300, maxXp: 599, sprite: '🦆', nextThreshold: 600 },
  { name: 'Adult', minXp: 600, maxXp: 999, sprite: '🦢', nextThreshold: 1000 },
  { name: 'Elder', minXp: 1000, maxXp: Infinity, sprite: '👑', nextThreshold: null },
];

export function usePetState(): PetState {
  const { xp, lastCompleted, superchargeTier } = useFocusContext();

  // Find active pet stage
  const activeStageIndex = STAGES.findIndex(
    (stage) => xp >= stage.minXp && xp <= stage.maxXp
  );
  const currentStage = activeStageIndex !== -1 ? STAGES[activeStageIndex] : STAGES[STAGES.length - 1];

  // Calculate XP progress to next stage
  let progress = 100;
  let nextStageXp: number | null = currentStage.nextThreshold;

  if (nextStageXp !== null) {
    const range = nextStageXp - currentStage.minXp;
    const currentOffset = xp - currentStage.minXp;
    progress = Math.min(100, Math.max(0, Math.round((currentOffset / range) * 100)));
  }

  // Calculate health decay (10 health per 24 hours of inactivity)
  let health = 100;
  let isDecaying = false;

  const isSupercharged = superchargeTier !== 'None';

  if (lastCompleted && !isSupercharged) {
    const elapsedMs = Date.now() - lastCompleted;
    const elapsedHours = elapsedMs / (1000 * 60 * 60);

    if (elapsedHours >= 24) {
      const decayPeriods = Math.floor(elapsedHours / 24);
      const decayAmount = decayPeriods * 10;
      health = Math.max(0, 100 - decayAmount);
      isDecaying = health < 100;
    }
  }

  return {
    xp,
    stage: currentStage.name,
    sprite: currentStage.sprite,
    health,
    isDecaying,
    nextStageXp,
    progress,
  };
}
