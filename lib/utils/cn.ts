import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind class names, resolving conflicting utilities (e.g.
 * `bg-red-500` vs `bg-zinc-700`) in favor of the last one applied, and
 * dropping falsy values. Use this instead of hand-rolled
 * `` `${base} ${cond ? "a" : "b"}` `` template-literal concatenation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
