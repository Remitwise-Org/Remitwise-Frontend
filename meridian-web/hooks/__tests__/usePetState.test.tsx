import { renderHook } from '@testing-library/react';
import { usePetState } from '../usePetState';
import { FocusProvider } from '@/context/FocusContext';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FocusProvider>{children}</FocusProvider>
);

describe('usePetState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('computes correct stage and progress based on XP', () => {
    // Egg Stage (0 - 99 XP)
    localStorage.setItem('focus_xp', '50');
    const { result: resEgg } = renderHook(() => usePetState(), { wrapper });
    expect(resEgg.current.stage).toBe('Egg');
    expect(resEgg.current.sprite).toBe('🥚');
    expect(resEgg.current.progress).toBe(50); // 50% to next level (100 XP)

    // Baby Stage (100 - 299 XP)
    localStorage.clear();
    localStorage.setItem('focus_xp', '150');
    const { result: resBaby } = renderHook(() => usePetState(), { wrapper });
    expect(resBaby.current.stage).toBe('Baby');
    expect(resBaby.current.sprite).toBe('🐣');
    // progress range: 100 to 299 (200 XP range). 150 is 50 offset. 50 / 200 = 25%
    expect(resBaby.current.progress).toBe(25);

    // Teen Stage (300 - 599 XP)
    localStorage.clear();
    localStorage.setItem('focus_xp', '300');
    const { result: resTeen } = renderHook(() => usePetState(), { wrapper });
    expect(resTeen.current.stage).toBe('Teen');
    expect(resTeen.current.sprite).toBe('🦆');
    expect(resTeen.current.progress).toBe(0);

    // Adult Stage (600 - 999 XP)
    localStorage.clear();
    localStorage.setItem('focus_xp', '800');
    const { result: resAdult } = renderHook(() => usePetState(), { wrapper });
    expect(resAdult.current.stage).toBe('Adult');
    expect(resAdult.current.sprite).toBe('🦢');
    // progress range: 600 to 999 (400 XP range). 800 is 200 offset. 200 / 400 = 50%
    expect(resAdult.current.progress).toBe(50);

    // Elder Stage (1000+ XP)
    localStorage.clear();
    localStorage.setItem('focus_xp', '1200');
    const { result: resElder } = renderHook(() => usePetState(), { wrapper });
    expect(resElder.current.stage).toBe('Elder');
    expect(resElder.current.sprite).toBe('👑');
    expect(resElder.current.progress).toBe(100);
  });

  it('decays health by 10 points for every 24 hours of inactivity', () => {
    const now = Date.now();

    // Last completed session was 48 hours ago
    localStorage.setItem('focus_last_completed', (now - 48 * 60 * 60 * 1000).toString());

    const { result } = renderHook(() => usePetState(), { wrapper });

    // 48 hours = 2 days, so health = 100 - (2 * 10) = 80
    expect(result.current.health).toBe(80);
    expect(result.current.isDecaying).toBe(true);
  });

  it('pauses health decay if a supercharge tier is active', () => {
    const now = Date.now();

    // Last completed session was 48 hours ago, but supercharge tier is active
    localStorage.setItem('focus_last_completed', (now - 48 * 60 * 60 * 1000).toString());
    localStorage.setItem('focus_supercharge_tier', 'Power Surge');

    const { result } = renderHook(() => usePetState(), { wrapper });

    // Decay paused -> health stays at 100
    expect(result.current.health).toBe(100);
    expect(result.current.isDecaying).toBe(false);
  });
});
