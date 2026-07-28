"use client";

/**
 * Stepper — reusable multi-step progress indicator.
 *
 * Step states
 * ───────────
 * completed  — step is done; shows a checkmark icon.
 * active     — the current step; highlighted with brand-red.
 * upcoming   — future step; muted and not interactive.
 *
 * Back navigation
 * ───────────────
 * Completed steps are rendered as <button> elements so the user can return to
 * them. Upcoming steps are rendered as non-interactive <span> elements with
 * aria-disabled. The active step shows its number and is aria-current="step".
 *
 * Responsive behaviour
 * ────────────────────
 * Desktop: horizontal stepper with connecting lines and full labels.
 * Mobile (< sm): labels are hidden to avoid overflow; only icons are shown.
 * The connecting lines contract proportionally.
 *
 * Accessibility
 * ─────────────
 * - `<nav aria-label="Progress">` wraps the list.
 * - `<ol>` provides ordered-list semantics.
 * - `aria-current="step"` marks the active step.
 * - `aria-label` on each item names the step and its state.
 * - Back buttons announce "Go back to <label>".
 *
 * Usage
 * ─────
 * ```tsx
 * <Stepper
 *   steps={[
 *     { id: "recipient", label: "Recipient" },
 *     { id: "amount",    label: "Amount" },
 *     { id: "review",    label: "Review" },
 *   ]}
 *   currentStep="amount"
 *   onStepClick={(id) => setStep(id as Step)}
 * />
 * ```
 */

import React from "react";
import { Check } from "lucide-react";

export interface StepDef {
  /** Unique identifier for the step — used for comparison and callbacks. */
  id: string;
  /** Human-readable label shown below/beside the step icon. */
  label: string;
}

export interface StepperProps {
  /** Ordered list of step definitions. */
  steps: StepDef[];
  /**
   * The id of the currently active step.
   * All steps before this one are treated as `completed`; steps after are `upcoming`.
   */
  currentStep: string;
  /**
   * Called when the user clicks a completed step to navigate back.
   * Upcoming and active steps are not clickable.
   */
  onStepClick?: (stepId: string) => void;
  /** Additional class names for the outer wrapper. */
  className?: string;
}

type StepStatus = "completed" | "active" | "upcoming";

export default function Stepper({
  steps,
  currentStep,
  onStepClick,
  className = "",
}: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  const getStatus = (index: number): StepStatus => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "active";
    return "upcoming";
  };

  return (
    <nav aria-label="Progress" className={`w-full ${className}`}>
      <ol
        className="relative flex items-start justify-between"
        role="list"
      >
        {steps.map((step, index) => {
          const status = getStatus(index);
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;
          const isCompleted = status === "completed";
          const isActive = status === "active";

          return (
            <li
              key={step.id}
              className="relative flex flex-1 flex-col items-center"
            >
              {/* Connecting line — left side */}
              {!isFirst && (
                <div
                  className="absolute left-0 top-5 h-0.5 w-1/2 -translate-y-1/2"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-colors duration-300 ${
                      isCompleted || isActive
                        ? "bg-red-600"
                        : "bg-zinc-700"
                    }`}
                  />
                </div>
              )}

              {/* Connecting line — right side */}
              {!isLast && (
                <div
                  className="absolute right-0 top-5 h-0.5 w-1/2 -translate-y-1/2"
                  aria-hidden="true"
                >
                  <div
                    className={`h-full transition-colors duration-300 ${
                      isCompleted ? "bg-red-600" : "bg-zinc-700"
                    }`}
                  />
                </div>
              )}

              {/* Step icon / button */}
              <div className="relative z-10 flex flex-col items-center gap-2">
                {isCompleted ? (
                  <button
                    type="button"
                    onClick={() => onStepClick?.(step.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    aria-label={`Go back to ${step.label}`}
                    title={`Go back to ${step.label}`}
                  >
                    <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  </button>
                ) : isActive ? (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white ring-4 ring-red-600/20"
                    aria-current="step"
                    aria-label={`Step ${index + 1}: ${step.label} (current)`}
                  >
                    {index + 1}
                  </span>
                ) : (
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-500"
                    aria-label={`Step ${index + 1}: ${step.label} (upcoming)`}
                    aria-disabled="true"
                  >
                    {index + 1}
                  </span>
                )}

                {/* Label — hidden on very small screens to avoid overflow */}
                <span
                  className={`hidden text-center text-xs font-bold uppercase tracking-wider sm:block ${
                    isActive
                      ? "text-red-500"
                      : isCompleted
                      ? "text-red-400"
                      : "text-zinc-500"
                  }`}
                  aria-hidden="true"
                >
                  {step.label}
                </span>

                {/* Visible label on mobile — abbreviated to just a dot or very short text */}
                <span
                  className={`block text-center text-[10px] font-semibold uppercase tracking-wide sm:hidden ${
                    isActive ? "text-red-500" : "text-zinc-600"
                  }`}
                  aria-hidden="true"
                >
                  {step.label.slice(0, 3)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
