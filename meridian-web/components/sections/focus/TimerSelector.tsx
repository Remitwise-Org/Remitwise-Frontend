'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { itemVariants } from '@/lib/animations/variants';
import { useFocusSession } from '@/hooks/useFocusSession';

const timerOptions = [10, 25, 45] as const;

export function TimerSelector() {
  const {
    activeSession,
    timeLeft,
    isActive,
    isLoading,
    startSession,
    cancelSession,
    triggerCompleteSession,
  } = useFocusSession();

  const [selectedDuration, setSelectedDuration] = useState<typeof timerOptions[number]>(25);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (!activeSession) return 0;
    const totalSeconds = activeSession.durationMinutes * 60;
    return (timeLeft / totalSeconds) * 100;
  };

  return (
    <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-8">
      <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2">
        <Clock size={20} className="text-primary" />
        {isActive ? 'Session in Progress' : 'Choose Your Focus Duration'}
      </h3>

      {isActive ? (
        <div className="text-center py-4">
          <div className="text-6xl font-mono font-bold text-primary mb-4 select-none tracking-wider tabular-nums">
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Stay present for {activeSession?.durationMinutes} minutes. Keep this tab open.
          </p>

          {/* Progress bar */}
          <div className="w-full bg-secondary h-2.5 rounded-full mb-8 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={cancelSession}
              className="px-6 py-2.5 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-destructive font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={triggerCompleteSession}
              disabled={isLoading}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </>
              ) : (
                'Simulate End'
              )}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-4">
            {timerOptions.map((minutes) => {
              const isSelected = selectedDuration === minutes;
              return (
                <button
                  key={minutes}
                  onClick={() => setSelectedDuration(minutes)}
                  className={`py-4 rounded-xl border text-base font-bold transition-all duration-200 active:scale-[0.95] ${
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-md shadow-primary/10'
                      : 'border-border bg-transparent hover:bg-primary/5 hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {minutes} min
                </button>
              );
            })}
          </div>

          <button
            onClick={() => startSession(selectedDuration)}
            className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary hover:to-primary/75 text-primary-foreground font-bold text-base transition-all duration-200 shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 hover:scale-[1.01] active:scale-[0.98]"
          >
            Start Focus Session
          </button>
        </div>
      )}
    </motion.div>
  );
}
