"use client"

import React from 'react'
import WidgetErrorState from '@/components/ui/WidgetErrorState'
import { logError } from '@/lib/logger'
import { generateRequestId } from '@/lib/requestId'

interface WidgetErrorBoundaryProps {
  widgetName: string
  children: React.ReactNode
}

interface WidgetErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * Reusable React error boundary for dashboard widgets.
 * Catches render-time errors in wrapped widgets, logs via logger,
 * and renders WidgetErrorState with retry.
 */
class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, _info: React.ErrorInfo): void {
    const requestId = generateRequestId()
    logError(requestId, 'WIDGET_ERROR', `dashboard/${this.props.widgetName}`, error)
    console.error(`Widget error in ${this.props.widgetName}:`, error)
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="region"
          aria-label={`${this.props.widgetName} – error`}
        >
          <WidgetErrorState
            message={this.state.error?.message}
            onRetry={this.reset}
          />
        </div>
      )
    }

    return this.props.children
  }
}

export default WidgetErrorBoundary
