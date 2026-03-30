import Link from "next/link";
import React from "react";
import { Play } from "lucide-react";

type Tutorial = {
  id?: string | number;
  title: string;
  description: string;
  duration?: string;
  progress?: number; // 0-100
};

export default function TutorialCard({ tutorial }: { tutorial: Tutorial }) {
  const href = `/tutorial/${tutorial.id ?? encodeURIComponent(tutorial.title)}`;

  return (
    <Link
      href={href}
      className="group block rounded-xl p-6 border border-border bg-gradient-to-br from-bg2 to-bg3 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-red"
      role="link"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-surface rounded-lg group-hover:bg-brand-red transition-colors duration-300">
          <Play className="w-6 h-6 text-white" />
        </div>
        <span className="text-sm text-gray-400">{tutorial.duration}</span>
      </div>

      <h3 className="text-lg font-bold text-foreground mb-2">
        {tutorial.title}
      </h3>
      <p className="text-muted text-sm mb-4">{tutorial.description}</p>

      <div className="flex items-center gap-3">
        <div
          className="flex-1 h-2 bg-bg1 rounded-full overflow-hidden"
          aria-hidden
        >
          <div
            className="h-2 bg-brand-red"
            style={{ width: `${tutorial.progress ?? 0}%` }}
          />
        </div>
        {tutorial.progress ? (
          <span className="text-sm text-gray-400">{tutorial.progress}%</span>
        ) : null}
      </div>
    </Link>
  );
}
