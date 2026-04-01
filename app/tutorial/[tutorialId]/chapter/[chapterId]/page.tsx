import ChapterView from "../../../../../components/tutorials/ChapterView";

type Props = {
  params: { tutorialId: string; chapterId: string };
};

export default function TutorialChapterPage({ params }: Props) {
  const { tutorialId, chapterId } = params;
  const chapterIndex = parseInt(chapterId, 10) || 0;

  // In a full implementation you'd fetch chapter data here.
  const chapterTitle = `Chapter ${chapterIndex + 1}`;
  const chaptersCount = 5; // placeholder; replace with real length

  return (
    <div className="min-h-screen bg-bg1 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ChapterView
          tutorialId={tutorialId}
          chapterId={String(chapterIndex)}
          chapterIndex={chapterIndex}
          chapterTitle={chapterTitle}
          chaptersCount={chaptersCount}
        />
      </div>
    </div>
  );
}
