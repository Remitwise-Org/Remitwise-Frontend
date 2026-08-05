"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowLeft,
} from "lucide-react";
import {
  getTutorialProgress,
  saveTutorialProgress,
  type TutorialProgress,
} from "@/lib/api/tutorials";

type Props = {
  tutorialId: string;
  chapterId: string;
  chapterIndex: number; // 0-based
  chapterTitle: string;
  chaptersCount: number;
};

const STORAGE_KEY = (tutorialId: string) =>
  `remitwise:tutorial:${tutorialId}:progress`;

const defaultCheckpoints = [false, false, false];

export default function ChapterView({
  tutorialId,
  chapterId,
  chapterIndex,
  chapterTitle,
  chaptersCount,
}: Props) {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<boolean[]>(defaultCheckpoints);
  const [savedChapters, setSavedChapters] = useState<Record<string, { checkpoints: boolean[] }>>({});
  const [isSyncing, setIsSyncing] = useState(false);

  // Load progress from server first, then fallback to localStorage
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const data = await getTutorialProgress(tutorialId);
        const chapters = data?.chapters ?? {};
        setSavedChapters(chapters);
        if (chapters[chapterId]?.checkpoints) {
          setCheckpoints(chapters[chapterId].checkpoints);
        } else {
          setCheckpoints(defaultCheckpoints);
        }
        // Sync to localStorage as backup
        localStorage.setItem(STORAGE_KEY(tutorialId), JSON.stringify(data));
      } catch (e) {
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEY(tutorialId));
          const parsed = raw ? JSON.parse(raw) : { chapters: {} };
          const chapters = parsed?.chapters ?? {};
          setSavedChapters(chapters);
          if (chapters[chapterId]?.checkpoints) {
            setCheckpoints(chapters[chapterId].checkpoints);
          } else {
            setCheckpoints(defaultCheckpoints);
          }
        } catch (localError) {
          setSavedChapters({});
          setCheckpoints(defaultCheckpoints);
        }
      }
    };

    loadProgress();
  }, [tutorialId, chapterId]);

  // Save progress to server and localStorage
  useEffect(() => {
    const saveProgress = async () => {
      setIsSyncing(true);
      try {
        // Save to localStorage first (immediate)
        const base = { chapters: { ...savedChapters, [chapterId]: { checkpoints } } };
        localStorage.setItem(STORAGE_KEY(tutorialId), JSON.stringify(base));
        setSavedChapters(base.chapters);

        // Then sync to server (async) -- saveTutorialProgress resolves to
        // null rather than throwing on failure, so localStorage stays the
        // source of truth if the sync doesn't land.
        const data = await saveTutorialProgress(tutorialId, base);
        if (data) {
          setSavedChapters(data.chapters);
        }
      } catch (e) {
        // ignore write errors
      } finally {
        setIsSyncing(false);
      }
    };

    saveProgress();
  }, [checkpoints, tutorialId, chapterId, savedChapters]);

  const chapterStates = useMemo(() => {
    return Array.from({ length: chaptersCount }, (_, index) => {
      const chapterData = savedChapters[String(index)];
      const chapterCheckpoints = chapterData?.checkpoints ?? defaultCheckpoints;
      const complete = chapterCheckpoints.every(Boolean);
      const status =
        index < chapterIndex
          ? "completed"
          : index === chapterIndex
          ? "current"
          : "locked";
      return {
        id: String(index),
        title: `Chapter ${index + 1}`,
        description: `Short chapter summary`,
        status,
        progress: complete
          ? 100
          : Math.round(
              (chapterCheckpoints.filter(Boolean).length / chapterCheckpoints.length) * 100,
            ),
      };
    });
  }, [chaptersCount, chapterIndex, savedChapters]);

  const completedChapters = chapterStates.filter((item) => item.progress === 100).length;
  const tutorialProgress = Math.round((completedChapters / chaptersCount) * 100);
  const chapterCompletionPercent = Math.round(
    (checkpoints.filter(Boolean).length / checkpoints.length) * 100,
  );

  const toggleCheckpoint = (i: number) => {
    setCheckpoints((prev) => {
      const copy = [...prev];
      copy[i] = !copy[i];
      return copy;
    });
  };

  const markComplete = () => {
    const complete = Array(checkpoints.length).fill(true);
    setCheckpoints(complete);
  };

  const handleChapterSelect = (index: number) => {
    if (index > chapterIndex + 1) return;
    router.push(`/tutorial/${tutorialId}/chapter/${index}`);
  };

  const onPrevious = () => {
    if (chapterIndex === 0) return;
    router.push(`/tutorial/${tutorialId}/chapter/${chapterIndex - 1}`);
  };

  const onNext = () => {
    const nextIndex = chapterIndex + 1;
    if (nextIndex < chaptersCount) {
      router.push(`/tutorial/${tutorialId}/chapter/${nextIndex}`);
    } else {
      router.push(`/tutorial/${tutorialId}`);
    }
  };

  const onSkip = () => {
    markComplete();
    const nextIndex = chapterIndex + 1;
    if (nextIndex < chaptersCount) {
      router.push(`/tutorial/${tutorialId}/chapter/${nextIndex}`);
    } else {
      router.push(`/tutorial/${tutorialId}`);
    }
  };

  const onResume = () => {
    router.refresh();
  };

  return (
    <div className="min-w-0 space-y-5">
      {/* Back-to-overview link */}
      <Link
        href={`/tutorial/${tutorialId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg1"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to overview
      </Link>

      {/* Title + overall tutorial progress */}
      <section className="min-w-0 rounded-3xl border border-border bg-bg2 p-5 sm:p-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Tutorial progress
            </p>
            <h2 className="mt-2 min-w-0 break-words text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
              {chapterTitle}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Chapter {chapterIndex + 1} of {chaptersCount}
            </p>
          </div>
          <div
            className="inline-flex w-fit shrink-0 items-center rounded-full bg-brand-red/10 px-3 py-2 text-sm font-semibold text-brand-red"
            aria-label={`${tutorialProgress}% of tutorial complete`}
          >
            {tutorialProgress}% complete
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-5">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-bg3"
            role="progressbar"
            aria-valuenow={tutorialProgress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Overall tutorial progress"
          >
            <div
              className="h-2 rounded-full bg-brand-red transition-all duration-500"
              style={{ width: `${tutorialProgress}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            {completedChapters} of {chaptersCount} chapters completed
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
        {/* Left column: checkpoints + controls */}
        <div className="min-w-0 space-y-5">
          {/* Chapter checkpoints */}
          <section
            className="min-w-0 rounded-3xl border border-border bg-bg2 p-5 sm:p-6"
            aria-labelledby="checkpoints-heading"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h3
                  id="checkpoints-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Chapter checkpoints
                </h3>
                <p className="text-sm text-muted">
                  Mark each step complete as you progress.
                </p>
              </div>
              <span
                className="shrink-0 text-sm font-semibold text-muted"
                aria-label={`Chapter ${chapterCompletionPercent}% complete`}
              >
                {chapterCompletionPercent}%
              </span>
            </div>

            {/* Chapter-level progress bar */}
            <div
              className="mb-5 h-2 w-full overflow-hidden rounded-full bg-bg3"
              role="progressbar"
              aria-valuenow={chapterCompletionPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Chapter checkpoint progress"
            >
              <div
                className="h-2 rounded-full bg-brand-red transition-all duration-300"
                style={{ width: `${chapterCompletionPercent}%` }}
              />
            </div>

            <ul className="space-y-3" role="list">
              {checkpoints.map((done, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggleCheckpoint(i)}
                    className={`flex min-h-[52px] w-full min-w-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg1 ${
                      done
                        ? "border-brand-red/30 bg-surface"
                        : "border-border bg-bg3 hover:border-white/20"
                    }`}
                    aria-pressed={done}
                    aria-label={`Checkpoint ${i + 1}: ${done ? "completed" : "not completed"}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Checkpoint {i + 1}
                      </p>
                      <p className="text-xs text-muted">
                        Complete this step to advance.
                      </p>
                    </div>
                    <span
                      className={`shrink-0 text-sm font-semibold ${
                        done ? "text-brand-red" : "text-muted"
                      }`}
                      aria-hidden="true"
                    >
                      {done ? "Done" : "Open"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          {/* Prev / Skip / Next controls */}
          <nav
            className="grid grid-cols-3 gap-3"
            aria-label="Chapter navigation controls"
          >
            <button
              type="button"
              onClick={onPrevious}
              disabled={chapterIndex === 0}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-border bg-bg3 px-3 py-2.5 text-sm font-semibold text-foreground transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg1"
              aria-label={`Go to chapter ${chapterIndex}`}
            >
              <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Prev</span>
            </button>

            <button
              type="button"
              onClick={onSkip}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-brand-red bg-transparent px-3 py-2.5 text-sm font-semibold text-brand-red transition hover:bg-brand-red/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg1"
              aria-label="Skip this chapter and mark it complete"
            >
              Skip
            </button>

            <button
              type="button"
              onClick={onNext}
              className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-brand-red px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-redHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg1"
              aria-label={
                chapterIndex + 1 < chaptersCount
                  ? `Go to chapter ${chapterIndex + 2}`
                  : "Finish tutorial"
              }
            >
              <span>
                {chapterIndex + 1 < chaptersCount ? "Next" : "Finish"}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </button>
          </nav>

          {/* Syncing indicator */}
          {isSyncing && (
            <p className="text-xs text-muted" role="status" aria-live="polite">
              Saving progress…
            </p>
          )}
        </div>

        {/* Right column: chapter navigation sidebar */}
        <aside
          className="min-w-0 rounded-3xl border border-border bg-bg2 p-5 sm:p-6 lg:self-start"
          aria-labelledby="chapter-nav-heading"
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3
                id="chapter-nav-heading"
                className="text-sm font-semibold text-foreground"
              >
                Chapters
              </h3>
              <p className="text-xs text-muted">
                {completedChapters} of {chaptersCount} completed
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-muted">
              {chapterIndex + 1} / {chaptersCount}
            </span>
          </div>

          <ol className="space-y-2" aria-label="Chapter list">
            {chapterStates.map((chapter) => {
              const isCurrent = chapter.id === String(chapterIndex);
              const isCompleted = chapter.status === "completed";
              const isLocked = chapter.status === "locked";

              return (
                <li key={chapter.id}>
                  <button
                    type="button"
                    onClick={() => handleChapterSelect(Number(chapter.id))}
                    disabled={isLocked}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Chapter ${Number(chapter.id) + 1}: ${chapter.title}. Status: ${
                      isCompleted ? "completed" : isCurrent ? "current" : "locked"
                    }. ${chapter.progress}% done.`}
                    className={`flex w-full min-w-0 flex-col gap-2 rounded-2xl border px-4 py-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg1 disabled:cursor-not-allowed ${
                      isCurrent
                        ? "border-brand-red bg-surface"
                        : isLocked
                        ? "border-border bg-bg3 opacity-60"
                        : "border-border bg-bg3 hover:border-white/20"
                    }`}
                  >
                    {/* Chapter title row */}
                    <div className="flex min-w-0 items-center gap-3">
                      {/* Status icon / number badge */}
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                          isCompleted
                            ? "bg-brand-red text-white"
                            : isCurrent
                            ? "bg-brand-red/20 text-brand-red"
                            : "bg-bg1 text-muted"
                        }`}
                        aria-hidden="true"
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : isLocked ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          Number(chapter.id) + 1
                        )}
                      </span>

                      {/* Title and description */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-sm font-semibold ${
                            isLocked ? "text-muted" : "text-foreground"
                          }`}
                        >
                          {chapter.title}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {chapter.description}
                        </p>
                      </div>

                      {/* Progress percentage */}
                      <span
                        className="shrink-0 text-xs font-semibold text-muted"
                        aria-hidden="true"
                      >
                        {chapter.progress}%
                      </span>
                    </div>

                    {/* Per-chapter progress bar */}
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-bg1"
                      aria-hidden="true"
                    >
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isLocked ? "bg-muted/30" : "bg-brand-red"
                        }`}
                        style={{ width: `${chapter.progress}%` }}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Resume CTA in sidebar */}
          <button
            type="button"
            onClick={onResume}
            className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-bg3 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-bg1"
          >
            Refresh progress
          </button>
        </aside>
      </div>
    </div>
  );
}
