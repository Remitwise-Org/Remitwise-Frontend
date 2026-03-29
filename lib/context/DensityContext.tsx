"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

type Density = 'comfortable' | 'compact';

interface DensityContextType {
  density: Density;
  setDensity: (density: Density) => void;
}

const DensityContext = createContext<DensityContextType | undefined>(undefined);

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>('comfortable');

  // Load from localStorage on mount
  useEffect(() => {
    const savedDensity = localStorage.getItem('display-density') as Density;
    if (savedDensity === 'comfortable' || savedDensity === 'compact') {
      setDensityState(savedDensity);
    }
  }, []);

  const setDensity = (newDensity: Density) => {
    setDensityState(newDensity);
    localStorage.setItem('display-density', newDensity);
  };

  return (
    <DensityContext.Provider value={{ density, setDensity }}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity() {
  const context = useContext(DensityContext);
  if (context === undefined) {
    throw new Error('useDensity must be used within a DensityProvider');
  }
  return context;
}
