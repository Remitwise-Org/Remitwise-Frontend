"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Density = 'comfortable' | 'compact';

interface DensityContextType {
  density: Density;
  setDensity: (density: Density) => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>('comfortable');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const savedDensity = localStorage.getItem('display-density');
        if (savedDensity === 'comfortable' || savedDensity === 'compact') {
          setDensityState(savedDensity);
        }
      }
    } catch (e) {
      // Ignore errors from corrupted localStorage or restricted environments
    }
  }, []);

  const setDensity = (newDensity: Density) => {
    setDensityState(newDensity);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('display-density', newDensity);
      }
    } catch (e) {
      // Ignore errors when setting localStorage fails
    }
  };

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

/**
 * Access the display density setting ('comfortable' or 'compact').
 * @throws {Error} If called outside of a <DensityProvider> tree.
 * @returns The current density state and a setter function.
 */
export function useDensity(): DensityContextType {
  const context = useContext(DensityContext);
  if (context === undefined) {
    throw new Error('useDensity must be used within a DensityProvider. Did you forget to wrap your component in <DensityProvider>?');
  }
  return context;
}
