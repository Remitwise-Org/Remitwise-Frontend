"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";

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

interface TutorialProgress {
  chapters: Record<string, { checkpoints: boolean[] }>;
}

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
        const response = await fetch(`/api/v1/tutorials/${tutorialId}/progress`);
        if (response.ok) {
          const data: TutorialProgress = await response.json();
          const chapters = data?.chapters ?? {};
          setSavedChapters(chapters);
          if (chapters[chapterId]?.checkpoints) {
            setCheckpoints(chapters[chapterId].checkpoints);
          } else {
            setCheckpoints(defaultCheckpoints);
          }
          // Sync to localStorage as backup
          localStorage.setItem(STORAGE_KEY(tutorialId), JSON.stringify(data));
        } else {
          // Fallback to localStorage if server request fails
          throw new Error("Server request failed");
        }
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

        // Then sync to server (async)
        try {
          const response = await fetch(`/api/v1/tutorials/${tutorialId}/progress`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(base),
          });
          if (response.ok) {
            const data: TutorialProgress = await response.json();
            setSavedChapters(data.chapters);
          }
        } catch (serverError) {
          // Server sync failed, but localStorage save succeeded
          console.error("Failed to sync progress to server:", serverError);
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
    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
      <div className="space-y-6">
        <section className="rounded-3xl bg-bg2 border border-border p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">
                Tutorial progress
              </p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">
                {chapterTitle}
              </h2>
              <p className="text-sm text-muted mt-1">
                Chapter {chapterIndex + 1} of {chaptersCount}
              </p>
            </div>
            <div className="inline-flex items-center rounded-full bg-brand-red/10 px-3 py-2 text-sm font-semibold text-brand-red">
              {tutorialProgress}% complete
            </div>
          </div>

          <div className="mt-6 rounded-full bg-bg3 h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-brand-red transition-all duration-300"
              style={{ width: `${tutorialProgress}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            {completedChapters} of {chaptersCount} chapters completed.
          </p>
        </section>

        <section className="rounded-3xl bg-bg2 border border-border p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Chapter checkpoints</p>
              <p className="text-sm text-muted">Mark each step complete as you progress.</p>
            </div>
            <span className="text-sm font-semibold text-muted">
              {chapterCompletionPercent}%
            </span>
          </div>

          <div className="space-y-3">
            {checkpoints.map((done, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleCheckpoint(i)}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                  done ? "border-brand-red/20 bg-surface" : "border-border bg-bg3 hover:border-white/20"
                }`}
                aria-pressed={done}
              >
                <div>
                  <p className="text-base font-semibold text-foreground">
                    Checkpoint {i + 1}
                  </p>
                  <p className="text-sm text-muted">Complete the step to unlock progress.</p>
                </div>
                <span className={`text-sm font-semibold ${done ? "text-brand-red" : "text-muted"}`}>
                  {done ? "Done" : "Open"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onPrevious}
            disabled={chapterIndex === 0}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg3 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center justify-center rounded-lg border border-brand-red bg-transparent px-4 py-3 text-sm font-semibold text-brand-red transition hover:bg-brand-red/10"
          >
            Resume
          </button>

          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-red px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-brand-redHover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <aside className="rounded-3xl bg-bg2 border border-border p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Chapter navigation</p>
            <p className="text-sm text-muted">See which chapters are complete, current, or locked.</p>
          </div>
          <span className="text-sm font-semibold text-muted">
            {chapterIndex + 1}/{chaptersCount}
          </span>
        </div>

        <ol className="space-y-3">
          {chapterStates.map((chapter) => {
            const isCurrent = chapter.id === String(chapterIndex);
            const isLocked = chapter.status === "locked";
            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => handleChapterSelect(Number(chapter.id))}
                disabled={isLocked}
                aria-current={isCurrent ? "step" : undefined}
                className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
                  isCurrent
                    ? "border-brand-red bg-surface"
                    : isLocked
                    ? "border-border bg-bg3 text-muted opacity-70"
                    : "border-border bg-bg3 hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[#111111] text-sm font-semibold text-foreground">
                    {Number(chapter.id) + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{chapter.title}</p>
                    <p className="text-xs text-muted">{chapter.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {chapter.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4 text-brand-red" />
                  ) : chapter.status === "locked" ? (
                    <Lock className="w-4 h-4 text-muted" />
                  ) : null}
                  <span className="text-sm text-muted">{chapter.progress}%</span>
                </div>
              </button>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}
