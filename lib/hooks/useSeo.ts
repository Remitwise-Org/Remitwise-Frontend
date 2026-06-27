import { useEffect } from "react";
import { DEFAULT_SEO } from "../config/seo";

interface SeoProps {
  title?: string;
  description?: string;
}

// Global registry stack to track active SEO settings on the client
const seoInstances: { title: string; description: string }[] = [];

function updateDom() {
  if (typeof window === "undefined") return;

  const active = seoInstances[seoInstances.length - 1] || DEFAULT_SEO;

  // 1. Update Title
  if (document.title !== active.title) {
    document.title = active.title;
  }

  // 2. Update Meta Description (ensuring no duplicates)
  let metaDescription = document.querySelector('meta[name="description"]');
  if (!metaDescription) {
    metaDescription = document.createElement("meta");
    metaDescription.setAttribute("name", "description");
    document.head.appendChild(metaDescription);
  }
  if (metaDescription.getAttribute("content") !== active.description) {
    metaDescription.setAttribute("content", active.description);
  }
}

export function useSeo({ title = DEFAULT_SEO.title, description = DEFAULT_SEO.description }: SeoProps = {}) {
  useEffect(() => {
    const instance = { title, description };
    seoInstances.push(instance);
    updateDom();

    return () => {
      const index = seoInstances.indexOf(instance);
      if (index !== -1) {
        seoInstances.splice(index, 1);
      }
      updateDom();
    };
  }, [title, description]);
}
