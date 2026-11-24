import { beforeEach, describe, expect, it, vi } from "vitest";

const { notFound, getTutorialById } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  getTutorialById: vi.fn(),
}));

vi.mock("next/navigation", () => ({ notFound }));
vi.mock("@/lib/tutorials", () => ({ getTutorialById }));
vi.mock("@/components/tutorials/ChapterView", () => ({ default: () => null }));

import TutorialChapterPage, {
  generateMetadata,
} from "@/app/tutorial/[tutorialId]/chapter/[chapterId]/page";

describe("tutorial chapter page", () => {
  const tutorial = {
    id: "short-tutorial",
    title: "Short Tutorial",
    description: "A short tutorial",
    duration: "2 min",
    chaptersCount: 3,
    progress: 0,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getTutorialById.mockReturnValue(tutorial);
  });

  it("uses the catalog chapter count and title", async () => {
    const params = Promise.resolve({ tutorialId: tutorial.id, chapterId: "2" });
    const page = await TutorialChapterPage({ params });
    const chapterView = page.props.children.props.children;
    expect(chapterView.props).toMatchObject({
      tutorialId: tutorial.id,
      chapterId: "2",
      chapterIndex: 2,
      chaptersCount: 3,
    });

    await expect(generateMetadata({ params })).resolves.toEqual({
      title: "Chapter 3 – Short Tutorial | RemitWise",
      description: "Watch Chapter 3 of the Short Tutorial tutorial on RemitWise.",
    });
  });

  it("returns not found for an unknown tutorial", async () => {
    getTutorialById.mockReturnValue(undefined);
    await expect(TutorialChapterPage({
      params: Promise.resolve({ tutorialId: "missing", chapterId: "0" }),
    })).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it.each(["-1", "3", "1abc", "1.5"])(
    "returns not found for an invalid chapter id: %s",
    async (chapterId) => {
      await expect(TutorialChapterPage({
        params: Promise.resolve({ tutorialId: tutorial.id, chapterId }),
      })).rejects.toThrow("NEXT_NOT_FOUND");
    }
  );
});
