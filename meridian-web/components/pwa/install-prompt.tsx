'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * `beforeinstallprompt` is Chromium-only and still non-standard, so it has no
 * lib.dom type.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt: () => Promise<void>
}

const DISMISSED_KEY = 'meridian-install-dismissed-at'
/** Don't nag: a dismissal is respected for two weeks. */
const DISMISS_COOLDOWN = 1000 * 60 * 60 * 24 * 14

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari predates the display-mode media query.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function recentlyDismissed(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0)
    return Boolean(dismissedAt) && Date.now() - dismissedAt < DISMISS_COOLDOWN
  } catch {
    return false
  }
}

/**
 * Install banner for the MERIDIAN PWA.
 *
 * On Chromium the browser's own `beforeinstallprompt` is captured and replayed
 * behind our button. iOS has no such event, so installable-but-unprompted
 * Safari gets the Share-sheet instructions instead.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIosHint, setShowIosHint] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return

    const handleBeforeInstallPrompt = (event: Event) => {
      // Suppress the mini-infobar so the banner is the single call to action.
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      setIsVisible(true)
    }

    const handleInstalled = () => {
      setIsVisible(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    // iOS never fires the event; show the manual hint once the app has had a
    // moment to settle, so it never competes with the first paint.
    let iosTimer: ReturnType<typeof setTimeout> | undefined
    if (isIos()) {
      iosTimer = setTimeout(() => {
        setShowIosHint(true)
        setIsVisible(true)
      }, 4000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  const dismiss = useCallback(() => {
    setIsVisible(false)
    try {
      localStorage.setItem(DISMISSED_KEY, Date.now().toString())
    } catch {
      // Storage blocked — the banner simply returns on the next visit.
    }
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    // The event can only be used once, whatever the outcome.
    setDeferredPrompt(null)
    setIsVisible(false)
    if (outcome === 'dismissed') dismiss()
  }, [deferredPrompt, dismiss])

  if (!isVisible) return null

  return (
    <div
      role="dialog"
      aria-label="Install MERIDIAN"
      className="pwa-install-banner fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-lg border border-border bg-card p-4 shadow-xl sm:inset-x-auto sm:right-4"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          {showIosHint ? <Share className="size-5" /> : <Download className="size-5" />}
        </div>

        <div className="flex-1">
          <p className="text-sm font-semibold text-card-foreground">Install MERIDIAN</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {showIosHint
              ? 'Tap Share, then “Add to Home Screen” to keep your focus timer available offline.'
              : 'Pin the app to keep your focus timer and dashboard working offline.'}
          </p>

          {!showIosHint && (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={install}>
                Install
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                Not now
              </Button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
