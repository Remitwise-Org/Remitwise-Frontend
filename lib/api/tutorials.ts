export interface TutorialProgress {
  chapters: Record<string, { checkpoints: boolean[] }>;
}

function progressUrl(tutorialId: string): string {
  return `/api/v1/tutorials/${tutorialId}/progress`;
}

/**
 * Fetches server-side tutorial progress.
 * @throws if the request fails or the response is not ok -- callers are
 * expected to fall back to localStorage on failure (see ChapterView).
 */
export async function getTutorialProgress(tutorialId: string): Promise<TutorialProgress> {
  const response = await fetch(progressUrl(tutorialId));
  if (!response.ok) {
    throw new Error("Server request failed");
  }
  return response.json();
}

/**
 * Persists tutorial progress to the server.
 * Returns `null` (rather than throwing) on a network error or a non-ok
 * response, so a failed sync never blocks the caller's localStorage-first
 * save path.
 */
export async function saveTutorialProgress(
  tutorialId: string,
  progress: TutorialProgress,
): Promise<TutorialProgress | null> {
  try {
    const response = await fetch(progressUrl(tutorialId), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(progress),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
