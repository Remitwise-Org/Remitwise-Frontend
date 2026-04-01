"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  tutorialId: string;
  chapterId: string;
  chapterIndex: number; // 0-based
  chapterTitle: string;
  chaptersCount: number;
};

const STORAGE_KEY = (tutorialId: string) =>
  `remitwise:tutorial:${tutorialId}:progress`;

export default function ChapterView({
  tutorialId,
  chapterId,
  chapterIndex,
  chapterTitle,
  chaptersCount,
}: Props) {
  const router = useRouter();
  const [checkpoints, setCheckpoints] = useState<boolean[]>([
    false,
    false,
    false,
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(tutorialId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.chapters && parsed.chapters[chapterId]) {
          setCheckpoints(
            parsed.chapters[chapterId].checkpoints || [false, false, false],
          );
        }
      }
    } catch (e) {
      // ignore
    }
  }, [tutorialId, chapterId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY(tutorialId));
      const base = raw ? JSON.parse(raw) : { chapters: {} };
      base.chapters[chapterId] = { checkpoints };
      localStorage.setItem(STORAGE_KEY(tutorialId), JSON.stringify(base));
    } catch (e) {
      // ignore write errors
    }
  }, [checkpoints, tutorialId, chapterId]);

  const toggleCheckpoint = (i: number) => {
    setCheckpoints((prev) => {
      const copy = [...prev];
      copy[i] = !copy[i];
      return copy;
    });
  };

  const percent = Math.round(
    (checkpoints.filter(Boolean).length / checkpoints.length) * 100,
  );

  const markComplete = () => {
    setCheckpoints(Array(checkpoints.length).fill(true));
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
    // Resume simply navigates to the same page; keeping it for explicitness
    router.refresh();
  };

  return (
    <div className="max-w-3xl mx-auto bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border">
      <h2 className="text-2xl font-bold text-foreground mb-2">
        {chapterTitle}
      </h2>
      <p className="text-muted mb-4">Progress: {percent}%</p>

      <div className="space-y-3 mb-6">
        {checkpoints.map((done, i) => (
          <button
            key={i}
            onClick={() => toggleCheckpoint(i)}
            className={`w-full text-left p-3 rounded-lg ${done ? "bg-surface" : "bg-bg2"}`}
            aria-pressed={done}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-foreground font-semibold">
                  Checkpoint {i + 1}
                </div>
                <div className="text-muted text-sm">
                  Short instruction or task
                </div>
              </div>
              <div className="text-sm text-muted">{done ? "Done" : "Open"}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onSkip}
          className="px-4 py-2 bg-brand-red text-foreground rounded-lg"
        >
          Skip
        </button>
        <button
          onClick={onResume}
          className="px-4 py-2 border border-border text-foreground rounded-lg"
        >
          Resume
        </button>
        <Link
          href={`/tutorial/${tutorialId}`}
          className="ml-auto text-sm text-muted"
        >
          Back to overview
        </Link>
      </div>
    </div>
  );
}
