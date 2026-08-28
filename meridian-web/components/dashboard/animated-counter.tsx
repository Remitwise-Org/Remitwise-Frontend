'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  decimals?: number
  duration?: number
}

/**
 * Animated Counter Component
 * 
 * Smoothly interpolates numbers with easing for visual appeal.
 * Prevents layout shift by maintaining consistent width.
 * 
 * Features:
 * - Smooth easing animation (ease-out)
 * - Configurable decimal places
 * - Configurable animation duration
 * - Pauses animation when tab is not visible (performance)
 * - Accessible (announces final value to screen readers)
 * 
 * @example
 * ```tsx
 * <AnimatedCounter value={1234.56} decimals={2} duration={1000} />
 * ```
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  duration = 1000,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)
  const frameRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const startValueRef = useRef(value)

  useEffect(() => {
    // Don't animate if value hasn't changed
    if (value === displayValue) return

    setIsAnimating(true)
    startValueRef.current = displayValue
    startTimeRef.current = undefined

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = currentTime
      }

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic easing for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)

      const currentValue =
        startValueRef.current + (value - startValueRef.current) * eased

      setDisplayValue(currentValue)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setIsAnimating(false)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [value, duration, displayValue])

  // Format the number with appropriate decimals
  const formattedValue = displayValue.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return (
    <span
      className="tabular-nums"
      role="status"
      aria-live={isAnimating ? 'off' : 'polite'}
      aria-label={`${value.toFixed(decimals)}`}
    >
      {formattedValue}
    </span>
  )
}
