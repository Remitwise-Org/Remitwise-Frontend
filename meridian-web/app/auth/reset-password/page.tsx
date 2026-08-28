'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { AuthShell } from '@/components/auth/auth-shell'
import { FormInput } from '@/components/form/FormInput'
import { FormWrapper } from '@/components/form/FormWrapper'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { RegisterSchema, type RegisterDto } from '@/lib/validations/auth'

const DEFAULT_VALUES: RegisterDto = {
  email: '',
  password: '',
  confirmPassword: '',
}

export default function ResetPasswordPage() {
  const router = useRouter()

  async function handleResetPassword(data: RegisterDto) {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    })

    if (!res.ok) {
      const body = (await res.json()) as { message?: string }
      toast.error(body?.message ?? 'Password reset failed. Please try again.')
      return
    }

    toast.success('Password reset successfully!')
    router.push('/auth/sign-in')
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Create a fresh password and confirm it below."
      footer={
        <p>
          Remembered your password?{' '}
          <Link href="/auth/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <FormWrapper
        schema={RegisterSchema}
        defaultValues={DEFAULT_VALUES}
        onSubmit={handleResetPassword}
        className="space-y-4"
      >
        {({ formState: { isSubmitting, isValid } }) => (
          <>
            <FormInput<RegisterDto>
              name="email"
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              description="Enter the email associated with your account."
            />

            <FormInput<RegisterDto>
              name="password"
              label="New password"
              type="password"
              placeholder="Enter a new password"
              autoComplete="new-password"
              description="Use at least 8 characters with an uppercase letter and a number."
            />

            <FormInput<RegisterDto>
              name="confirmPassword"
              label="Confirm new password"
              type="password"
              placeholder="Repeat your new password"
              autoComplete="new-password"
            />

            <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Password rules</p>
              <ul className="mt-2 space-y-1">
                <li>• At least 8 characters</li>
                <li>• Includes an uppercase letter</li>
                <li>• Includes a number</li>
                <li>• Must match the confirmation field</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting || !isValid}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Spinner className="size-4" />
                  Resetting password…
                </span>
              ) : (
                'Reset password'
              )}
            </Button>
          </>
        )}
      </FormWrapper>
    </AuthShell>
  )
}
