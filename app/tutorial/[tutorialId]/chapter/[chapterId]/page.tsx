import ChapterView from "../../../../../components/tutorials/ChapterView";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTutorialById } from "@/lib/tutorials";

type Props = {
  params: Promise<{ tutorialId: string; chapterId: string }>;
};

function getTutorialChapter(tutorialId: string, chapterId: string) {
  const tutorial = getTutorialById(tutorialId);
  const chapterIndex = Number(chapterId);

  if (
    !tutorial ||
    !Number.isInteger(chapterIndex) ||
    chapterIndex < 0 ||
    chapterIndex >= tutorial.chaptersCount
  ) {
    notFound();
  }

  return { tutorial, chapterIndex };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tutorialId, chapterId } = await params;
  const { tutorial, chapterIndex } = getTutorialChapter(tutorialId, chapterId);
  return {
    title: `Chapter ${chapterIndex + 1} – ${tutorial.title} | RemitWise`,
    description: `Watch Chapter ${chapterIndex + 1} of the ${tutorial.title} tutorial on RemitWise.`,
  };
}


export default async function TutorialChapterPage({ params }: Props) {
  const { tutorialId, chapterId } = await params;
  const { tutorial, chapterIndex } = getTutorialChapter(tutorialId, chapterId);

  // In a full implementation you'd fetch chapter data here.
  const chapterTitle = `Chapter ${chapterIndex + 1}`;
  const chaptersCount = tutorial.chaptersCount;

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg1 py-7 sm:py-8">
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ChapterView
          tutorialId={tutorialId}
          chapterId={String(chapterIndex)}
          chapterIndex={chapterIndex}
          chapterTitle={chapterTitle}
          chaptersCount={chaptersCount}
        />
      </main>
    </div>
  );
}
