"use client";

import React, { createContext, useContext } from "react";

const LevelContext = createContext<number>(1);

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  level?: number;
  as?: React.ElementType;
}

export const Section = React.forwardRef<HTMLElement, SectionProps>(
  ({ children, level, as: Component = "section", ...props }, ref) => {
    const currentLevel = useContext(LevelContext);
    const nextLevel = level !== undefined ? level : Math.min(currentLevel + 1, 6);

    return (
      <LevelContext.Provider value={nextLevel}>
        <Component ref={ref} {...props}>
          {children}
        </Component>
      </LevelContext.Provider>
    );
  }
);
Section.displayName = "Section";

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
  ({ children, level, ...props }, ref) => {
    const contextLevel = useContext(LevelContext);
    const actualLevel = level || contextLevel;
    const Tag = `h${Math.min(actualLevel, 6)}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

    return (
      <Tag ref={ref} {...props}>
        {children}
      </Tag>
    );
  }
);
Heading.displayName = "Heading";
