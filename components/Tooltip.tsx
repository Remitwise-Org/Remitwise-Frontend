'use client'

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  useId,
  Children,
  cloneElement,
  isValidElement,
} from 'react'

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

interface TooltipProps {
  children: React.ReactNode
  content?: React.ReactNode
  side?: TooltipSide
  delay?: number
  className?: string
  disabledReason?: string
}

const SIDE_STYLES: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

export default function Tooltip({
  children,
  content,
  side = 'top',
  delay = 300,
  className = '',
  disabledReason,
}: TooltipProps) {
  const [open, setOpen] = useState(false)
  const tooltipId = useId()
  const containerRef = useRef<HTMLSpanElement>(null)
  const tooltipRef = useRef<HTMLSpanElement>(null)
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const child = Children.only(children)
  const isDisabled =
    isValidElement<Record<string, unknown>>(child) &&
    child.props.disabled === true

  const clearTimeouts = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current)
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
  }, [])

  const show = useCallback(() => {
    clearTimeouts()
    showTimeoutRef.current = setTimeout(() => setOpen(true), isDisabled ? 0 : delay)
  }, [clearTimeouts, delay, isDisabled])

  const hide = useCallback(() => {
    clearTimeouts()
    setOpen(false)
  }, [clearTimeouts])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    },
    [],
  )

  useEffect(() => {
    return () => clearTimeouts()
  }, [clearTimeouts])

  useEffect(() => {
    if (tooltipRef.current) {
      tooltipRef.current.inert = !open
    }
  }, [open])

  const tooltipVisible = open || (isDisabled && !!disabledReason)
  const displayContent = isDisabled && disabledReason ? disabledReason : content

  const triggerProps: Record<string, unknown> = {}
  if (tooltipVisible) {
    triggerProps['aria-describedby'] = tooltipId
  }

  const trigger = isValidElement<Record<string, unknown>>(child)
    ? cloneElement(child, triggerProps)
    : child

  return (
    <span
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      {tooltipVisible && (
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          aria-live="polite"
          data-testid="disabled-tooltip"
          className={`absolute z-50 px-3 py-1.5 text-sm text-white bg-gray-900 rounded-md shadow-lg transition-opacity duration-150 whitespace-nowrap ${SIDE_STYLES[side]} ${className}`}
        >
          {displayContent}
        </span>
      )}
    </span>
  )
}