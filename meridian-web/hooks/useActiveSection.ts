'use client';

import { useEffect, useState } from 'react';

type SectionId = 'focus' | 'stream' | 'pool' | 'features' | '';

export function useActiveSection(
  ids: SectionId[] = ['focus', 'stream', 'pool', 'features'],
  rootMargin = '-40% 0px -60% 0px',
): SectionId {
  const [active, setActive] = useState<SectionId>(ids[0] ?? '');

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (!elements.length) {
      return;
    }

    const observers: IntersectionObserver[] = [];
    elements.forEach((el) => {
      const observer = new IntersectionObserver(
        (entries) => {
          const hit = entries.find((entry) => entry.isIntersecting);
          if (hit) {
            setActive(hit.target.id as SectionId);
          }
        },
        { root: null, rootMargin, threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [ids, rootMargin]);

  return active;
}

export default useActiveSection;
