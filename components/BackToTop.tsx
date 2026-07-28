"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowUp } from "lucide-react";

const SCROLL_THRESHOLD = 800;

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });

    const focusHeading = () => {
      if (window.scrollY === 0) {
        const heading = document.querySelector("h1");
        if (heading) {
          heading.setAttribute("tabindex", "-1");
          heading.focus({ preventScroll: true });
        }
      } else {
        requestAnimationFrame(focusHeading);
      }
    };

    requestAnimationFrame(focusHeading);
  }, []);

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={`fixed bottom-8 right-8 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-300 ease-in-out hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101] ${
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <ArrowUp className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
