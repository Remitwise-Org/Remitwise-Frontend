/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Custom responsive breakpoints for mobile-first design
      screens: {
        '320': '320px',      // iPhone SE (smallest mobile)
        '375': '375px',      // iPhone 14 (primary mobile target)
        '450': '450px',      // Foldables and larger phones
        'tablet': '768px',   // iPad portrait
        'laptop': '1024px',  // iPad landscape
        'desktop': '1440px', // Desktop standard
      },
      
      // Semantic spacing tokens for design system
      spacing: {
        "space-xs": "4px",
        "space-sm": "8px",
        "space-md": "16px",
        "space-lg": "24px",
        "space-xl": "32px",
        // Fine-grained responsive spacing scale
        '3.5': '14px',
        '7': '28px',
        '9': '36px',
        '11': '44px',     // Touch target minimum (WCAG 2.1 AAA)
        '13': '52px',
        '15': '60px',
        '17.5': '70px',
        '22.5': '90px',
        '27.5': '110px',
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
        status: {
          success: {
            fg: "#86EFAC",
            bg: "rgba(34, 197, 94, 0.14)",
            border: "rgba(34, 197, 94, 0.28)",
            soft: "rgba(20, 83, 45, 0.28)",
          },
          warning: {
            fg: "#FDE68A",
            bg: "rgba(245, 158, 11, 0.14)",
            border: "rgba(245, 158, 11, 0.28)",
            soft: "rgba(120, 53, 15, 0.28)",
          },
          error: {
            fg: "#FDA4AF",
            bg: "rgba(244, 63, 94, 0.14)",
            border: "rgba(244, 63, 94, 0.28)",
            soft: "rgba(127, 29, 29, 0.3)",
          },
          info: {
            fg: "#93C5FD",
            bg: "rgba(59, 130, 246, 0.14)",
            border: "rgba(59, 130, 246, 0.28)",
            soft: "rgba(30, 64, 175, 0.24)",
          },
        },
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
