import { useFocusContext } from '@/context/FocusContext';

export function useFocusSession() {
  const {
    activeSession,
    timeLeft,
    isActive,
    isLoading,
    startSession,
    cancelSession,
    triggerCompleteSession,
  } = useFocusContext();

  return {
    activeSession,
    timeLeft,
    isActive,
    isLoading,
    startSession,
    cancelSession,
    triggerCompleteSession,
  };
}
