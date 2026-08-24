import * as React from "react"

/**
 * Utility types for polymorphic components (e.g. ones that accept `asChild`).
 * This pattern extends the default element's props to ensure standard attributes
 * (like `disabled` or `type`) are always accepted, avoiding type gaps when `asChild` is true.
 */
export type PolymorphicProps<
  TDefault extends React.ElementType,
  TProps = {}
> = React.ComponentPropsWithRef<TDefault> &
  TProps & {
    asChild?: boolean
  }
