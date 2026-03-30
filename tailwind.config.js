/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Semantic spacing tokens for design system
      spacing: {
        "space-xs": "4px",
        "space-sm": "8px",
        "space-md": "16px",
        "space-lg": "24px",
        "space-xl": "32px",
      },

      // Focus ring tokens (use with `ring-focus` and `ring-offset-focus`)
      ringWidth: {
        focus: "3px",
      },
      ringOffsetWidth: {
        focus: "4px",
      },
      colors: {
        brand: {
          red: "#D72323",
          dark: "#0A0A0A",
          redHover: "#B91C1C",
        },
        // Design tokens used by the tutorial redesign
        foreground: "#ffffff",
        bg1: "#141414",
        bg2: "#0f0f0f",
        bg3: "#0a0a0a",
        surface: "#1a1a1a",
        border: "#2a2a2a",
        muted: "#9CA3AF",
        primary: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        red: {
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
      },
      // --- ADDED ANIMATIONS BELOW ---
      animation: {
        "neon-pulse": "neon-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        "neon-pulse": {
          "0%, 100%": { opacity: "1", filter: "brightness(1)" },
          "50%": { opacity: "0.8", filter: "brightness(1.4) blur(0.5px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
};
