"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Hard cap on the number of tags -- further additions are rejected with
   * a visible error instead of silently truncating. */
  maxTags?: number;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}

const DEFAULT_MAX_TAGS = 10;

/**
 * Free-text tag input with add/remove, a duplicate guard, and a hard cap on
 * tag count. Every field that lets a user attach an arbitrary number of
 * tags to a record (a credential, a policy, a profile) needs the same cap
 * to avoid an unbounded array reaching storage or a downstream API --
 * this is the shared, tested primitive for that.
 */
export function TagInput({
  value,
  onChange,
  maxTags = DEFAULT_MAX_TAGS,
  placeholder = "Add a tag and press Enter",
  ariaLabel = "Tags",
  className,
}: TagInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const atLimit = value.length >= maxTags;

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;

    if (atLimit) {
      setError(`You can add up to ${maxTags} tags.`);
      return;
    }
    if (value.some((existing) => existing.toLowerCase() === tag.toLowerCase())) {
      setError(`"${tag}" is already added.`);
      return;
    }

    onChange([...value, tag]);
    setDraft("");
    setError(null);
  }

  function removeTag(tag: string) {
    onChange(value.filter((existing) => existing !== tag));
    setError(null);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div role="list" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            role="listitem"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1.5 text-sm font-medium text-gray-200"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="rounded-full text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className="min-w-[10rem] flex-1 bg-transparent px-2 py-1.5 text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none"
        />
      </div>
      <p aria-live="polite" className="text-xs text-gray-400">
        {value.length}/{maxTags} tags
      </p>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export default TagInput;
