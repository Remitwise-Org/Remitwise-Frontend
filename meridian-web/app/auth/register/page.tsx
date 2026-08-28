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

export default function RegisterPage() {
  const router = useRouter()

  async function handleRegister(data: RegisterDto) {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: data.email,
        password: data.password,
      }),
    })

    if (!res.ok) {
      const body = (await res.json()) as { message?: string }
      toast.error(body?.message ?? 'Registration failed. Please try again.')
      return
    }

    toast.success('Account created successfully!')
    router.push('/auth/sign-in')
  }

  return (
    <AuthShell
      title="Create an account"
      description="Join Meridians Verse with a few details and a strong password."
      footer={
        <p>
          Already have an account?{' '}
          <Link href="/auth/sign-in" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <FormWrapper
        schema={RegisterSchema}
        defaultValues={DEFAULT_VALUES}
        onSubmit={handleRegister}
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
              description="We’ll use this to sign you in and send updates."
            />

            <FormInput<RegisterDto>
              name="password"
              label="Password"
              type="password"
              placeholder="Create a password"
              autoComplete="new-password"
              description="Use at least 8 characters with an uppercase letter and a number."
            />

            <FormInput<RegisterDto>
              name="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="Repeat your password"
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
                  Creating account…
                </span>
              ) : (
                'Create account'
              )}
            </Button>
          </>
        )}
      </FormWrapper>
    </AuthShell>
  )
}
