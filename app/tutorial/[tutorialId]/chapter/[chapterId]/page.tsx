import ChapterView from "../../../../../components/tutorials/ChapterView";

type Props = {
  params: Promise<{ tutorialId: string; chapterId: string }>;
};

export default async function TutorialChapterPage({ params }: Props) {
  const { tutorialId, chapterId } = await params;
  const chapterIndex = parseInt(chapterId, 10) || 0;

  // In a full implementation you'd fetch chapter data here.
  const chapterTitle = `Chapter ${chapterIndex + 1}`;
  const chaptersCount = 5; // placeholder; replace with real length

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg1 py-7 375:py-8">
      <main className="mx-auto max-w-7xl px-5 320:px-6 375:px-7 tablet:px-6 laptop:px-8">
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
