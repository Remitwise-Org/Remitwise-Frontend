'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

import { AuthShell } from '@/components/auth/auth-shell'
import { FormInput } from '@/components/form/FormInput'
import { FormWrapper } from '@/components/form/FormWrapper'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SignInSchema, type SignInDto } from '@/lib/validations/auth'

const DEFAULT_VALUES: SignInDto = { email: '', password: '' }

/** Normalise the redirectTo param so it can only navigate within the app. */
function getSafeRedirect(raw: string | null): string {
  if (!raw) return '/'
  try {
    // Reject absolute URLs — only allow paths that start with /
    const url = new URL(raw, window.location.origin)
    if (url.origin !== window.location.origin) return '/'
    return url.pathname + url.search + url.hash
  } catch {
    return raw.startsWith('/') ? raw : '/'
  }
}

/** Human-readable messages keyed by HTTP status. */
function getErrorMessage(status: number, serverMessage?: string): string {
  switch (status) {
    case 401:
      return 'Incorrect email or password. Please try again.'
    case 422:
      return serverMessage ?? 'The submitted data is invalid. Check your details and try again.'
    case 429:
      return 'Too many sign-in attempts. Please wait a moment and try again.'
    case 500:
    case 502:
    case 503:
      return 'A server error occurred. Please try again in a few seconds.'
    default:
      return serverMessage ?? 'Sign-in failed. Please try again.'
  }
}

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [authError, setAuthError] = useState<string | null>(null)

  async function handleSignIn(data: SignInDto) {
    // Clear any previous error before a new attempt
    setAuthError(null)

    let res: Response
    try {
      res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
    } catch {
      setAuthError('Unable to reach the server. Check your connection and try again.')
      return
    }

    if (!res.ok) {
      let body: { message?: string } = {}
      try {
        body = (await res.json()) as { message?: string }
      } catch {
        // non-JSON body — fall through with empty object
      }
      setAuthError(getErrorMessage(res.status, body.message))
      return
    }

    // Success — navigate to the preserved redirect destination (or home)
    const redirectTo = getSafeRedirect(searchParams.get('redirectTo'))
    router.push(redirectTo)
  }

  return (
    <AuthShell
      title="Sign in"
      description="Enter your email and password to continue."
      footer={
        <div className="space-y-2 text-sm">
          <p>
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
          <p>
            Forgot your password?{' '}
            <Link
              href="/auth/reset-password"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Reset it
            </Link>
          </p>
        </div>
      }
    >
      {/* Inline error banner — shown for server/auth errors only */}
      {authError && (
        <Alert variant="destructive" role="alert" aria-live="assertive" className="mb-4">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertTitle>Sign-in failed</AlertTitle>
          <AlertDescription>{authError}</AlertDescription>
        </Alert>
      )}

      <FormWrapper
        schema={SignInSchema}
        defaultValues={DEFAULT_VALUES}
        onSubmit={handleSignIn}
        className="space-y-4"
      >
        {({ formState: { isSubmitting, isValid } }) => (
          <>
            <FormInput<SignInDto>
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              description="The email you registered with."
              disabled={isSubmitting}
            />

            <FormInput<SignInDto>
              name="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !isValid}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </Button>
          </>
        )}
      </FormWrapper>
    </AuthShell>
  )
}
