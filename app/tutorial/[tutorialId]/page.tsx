import Link from "next/link";

type Props = {
  params: { tutorialId: string };
};

export default function TutorialOverviewPage({ params }: Props) {
  const chapters = Array.from({ length: 5 }).map((_, i) => ({
    id: String(i),
    title: `Chapter ${i + 1}`,
    description: "Short chapter summary",
    duration: `${2 + i} min`,
    progress: i < 2 ? 100 : i === 2 ? 45 : 0,
  }));

  const overallProgress = Math.round(
    (chapters.reduce((sum, chapter) => sum + chapter.progress, 0) /
      (chapters.length * 100)) *
      100,
  );

  const resumeIndex = chapters.findIndex((chapter) => chapter.progress < 100);
  const resumeChapter = resumeIndex >= 0 ? resumeIndex : 0;

  return (
    <div className="min-h-screen bg-bg1 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/tutorial" className="text-sm font-medium text-brand-red hover:text-brand-redHover">
              Back to tutorials
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-foreground">{params.tutorialId}</h1>
            <p className="mt-2 text-sm text-muted max-w-2xl">
              Continue your learning path and resume the next available chapter when you’re ready.
            </p>
          </div>

          <div className="rounded-3xl border border-border bg-bg2 p-5 text-center">
            <p className="text-sm text-muted">Overall progress</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{overallProgress}%</p>
            <Link
              href={`/tutorial/${params.tutorialId}/chapter/${resumeChapter}`}
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-brand-redHover"
            >
              Resume chapter {resumeChapter + 1}
            </Link>
          </div>
        </div>

        <section className="rounded-3xl bg-bg2 border border-border p-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Chapter list</h2>
              <p className="text-sm text-muted">Completed, active, and upcoming chapters at a glance.</p>
            </div>
            <p className="text-sm font-semibold text-muted">{chapters.length} chapters</p>
          </div>

          <div className="space-y-3">
            {chapters.map((chapter, index) => {
              const isComplete = chapter.progress === 100;
              const isCurrent = index === resumeChapter;
              return (
                <Link
                  key={chapter.id}
                  href={`/tutorial/${params.tutorialId}/chapter/${index}`}
                  className={`block rounded-2xl border px-4 py-4 transition duration-200 ${
                    isComplete
                      ? "border-brand-red/20 bg-surface"
                      : isCurrent
                      ? "border-brand-red bg-bg3"
                      : "border-border bg-bg2 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{chapter.title}</p>
                      <p className="text-sm text-muted">{chapter.description}</p>
                    </div>
                    <span className="text-sm font-semibold text-muted">{chapter.duration}</span>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-bg3">
                    <div
                      className="h-2 rounded-full bg-brand-red"
                      style={{ width: `${chapter.progress}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
