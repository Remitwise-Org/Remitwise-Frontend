import { useEffect } from "react";

// Global stack for titles
// Because React effects run bottom-up, the deepest child pushes its title first.
// e.g. Child pushes, then Parent pushes.
// Stack: [Child, Parent].
// We want "Child | Parent", so we just join in order.
export const titleStack: string[] = [];

export function composeTitles(titles: string[]): string {
  const valid = titles.map(t => t?.trim()).filter(Boolean);
  if (valid.length === 0) return "";
  return valid.join(" | ");
}

export function useTitle(title: string) {
  useEffect(() => {
    if (!title) return;
    
    titleStack.push(title);
    updateDomTitle();

    return () => {
      const idx = titleStack.lastIndexOf(title);
      if (idx > -1) {
        titleStack.splice(idx, 1);
      }
      updateDomTitle();
    };
  }, [title]);
}

function updateDomTitle() {
  if (typeof window === "undefined") return;
  const composed = composeTitles(titleStack);
  if (composed && document.title !== composed) {
    document.title = composed;
  }
}
