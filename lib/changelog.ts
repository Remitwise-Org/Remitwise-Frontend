export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  icon: string;
  title: string;
  bullets: string[];
  link?: {
    label: string;
    href: string;
  };
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "v1.4.0",
    version: "v1.4.0",
    date: "Feb 2026",
    icon: "🎯",
    title: "Savings Goals & Progress Tracking",
    bullets: [
      "Set custom savings goals and track progress with visual indicators.",
      "Get smart alerts when you're close to hitting a goal.",
    ],
    link: { label: "View Goals", href: "/dashboard/goals" },
  },
  {
    id: "v1.3.0",
    version: "v1.3.0",
    date: "Jan 2026",
    icon: "📊",
    title: "Six-Month Financial Trends",
    bullets: [
      "New interactive chart showing your income vs. spending over 6 months.",
      "Drill down into any month for a detailed breakdown.",
    ],
  },
  {
    id: "v1.2.0",
    version: "v1.2.0",
    date: "Jan 2026",
    icon: "⚡",
    title: "Quick Actions Panel",
    bullets: [
      "Access Send, Split, Bills, and Insurance in one tap from the dashboard.",
      "Streamlined navigation for your most-used features.",
    ],
  },
  {
    id: "v1.1.0",
    version: "v1.1.0",
    date: "Dec 2025",
    icon: "🔀",
    title: "Smart Money Split",
    bullets: [
      "Automatically allocate incoming funds across savings, bills, and sending.",
      "Customize your split ratios to match your financial plan.",
    ],
    link: { label: "Try it now", href: "/split" },
  },
  {
    id: "v1.0.0",
    version: "v1.0.0",
    date: "Nov 2025",
    icon: "🚀",
    title: "RemitWise Launched!",
    bullets: [
      "Send money internationally with real-time exchange rates.",
      "Track all your transactions in one unified dashboard.",
    ],
  },
];
