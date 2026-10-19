import React, { useContext } from 'react';
import { HeadingLevelContext } from './HeadingLevelContext';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  level?: number;
}

export const Section: React.FC<SectionProps> = ({ as: Component = 'section', level, children, ...props }) => {
  const currentLevel = useContext(HeadingLevelContext);
  const nextLevel = level ?? Math.min(currentLevel + 1, 6);

  return (
    <HeadingLevelContext.Provider value={nextLevel}>
      <Component {...props}>
        {children}
      </Component>
    </HeadingLevelContext.Provider>
  );
};
