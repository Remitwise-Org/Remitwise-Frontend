import React from 'react'

export interface RtlWrapperProps {
  children: React.ReactNode
  /** @default "rtl" */
  direction?: 'rtl' | 'ltr'
  /** @default "ar" */
  lang?: string
}

/**
 * Wraps children in a `<div dir="rtl">` so RTL-aware components render with
 * the correct text direction. Useful inside Storybook decorators to preview
 * how a component behaves under Arabic / Hebrew layout.
 *
 * @example
 * ```tsx
 * // In a Storybook story:
 * const meta = {
 *   decorators: [rtlDecorator],
 * } satisfies Meta<typeof MyComponent>;
 * ```
 */
export function RtlWrapper({
  children,
  direction = 'rtl',
  lang = 'ar',
}: RtlWrapperProps) {
  return (
    <div dir={direction} lang={lang}>
      {children}
    </div>
  )
}

/**
 * Storybook decorator that wraps a story in `<div dir="rtl">`.
 *
 * Usage (global — .storybook/preview.tsx):
 * ```ts
 * export const decorators = [withRtl];
 * ```
 *
 * Usage (per-story):
 * ```ts
 * const meta = { decorators: [withRtl] }
 * ```
 */
export function withRtl(Story: React.ComponentType) {
  return (
    <RtlWrapper>
      <Story />
    </RtlWrapper>
  )
}

/**
 * Higher-order decorator factory that returns a Storybook decorator wrapping
 * the story in a `<div>` with the given `dir` and `lang`.
 *
 * @example
 * ```ts
 * const meta = { decorators: [rtlDecorator('he', 'rtl')] }
 * ```
 */
export function rtlDecorator(lang = 'ar', direction: 'rtl' | 'ltr' = 'rtl') {
  return function Decorator(Story: React.ComponentType) {
    return (
      <RtlWrapper lang={lang} direction={direction}>
        <Story />
      </RtlWrapper>
    )
  }
}