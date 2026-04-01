import React from "react";
import TutorialCard from "./TutorialCard";

type Tutorial = {
  id?: string | number;
  title: string;
  description: string;
  duration?: string;
  progress?: number;
};

export default function TutorialList({ tutorials }: { tutorials: Tutorial[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tutorials.map((t, i) => (
        <TutorialCard key={t.id ?? i} tutorial={t} />
      ))}
    </div>
  );
}
