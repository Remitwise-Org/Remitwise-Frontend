import Link from "next/link";
import TutorialList from "../../../components/tutorials/TutorialList";

type Props = {
  params: { tutorialId: string };
};

export default function TutorialOverviewPage({ params }: Props) {
  // Placeholder data; in production load tutorial-specific chapters and progress
  const tutorials = [
    {
      id: params.tutorialId,
      title: `Tutorial: ${params.tutorialId}`,
      description: "Overview",
      duration: "N/A",
      progress: 40,
    },
  ];

  const chapters = Array.from({ length: 5 }).map((_, i) => ({
    id: String(i),
    title: `Chapter ${i + 1}`,
    description: "Short chapter summary",
    duration: `${2 + i} min`,
    progress: i < 2 ? 100 : 0,
  }));

  return (
    <div className="min-h-screen bg-bg1 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/tutorial" className="text-muted hover:text-foreground">
            Back
          </Link>
          <h1 className="text-2xl font-bold text-foreground">
            {params.tutorialId}
          </h1>
        </div>

        <div className="mb-6">
          <h2 className="text-lg text-foreground font-semibold">Chapters</h2>
          <div className="mt-4">
            <TutorialList tutorials={chapters} />
          </div>
        </div>
      </div>
    </div>
  );
}
