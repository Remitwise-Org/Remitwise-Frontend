'use client'

import Link from 'next/link'
import { ArrowLeft, Home, LayoutDashboard, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFoundState() {
  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <p className="mb-3 text-sm font-semibold text-primary">404</p>
      <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">Page not found</h1>
      <p className="mb-8 max-w-md text-muted-foreground">
        This page does not exist or may have moved. Check the address, or choose a destination below.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:flex-row">
        <Link href="/" className="w-full sm:w-auto"><Button className="w-full gap-2"><Home className="h-4 w-4" aria-hidden="true" />Home</Button></Link>
        <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Go back
        </Button>
      </div>
      <nav aria-label="Suggested destinations" className="mt-10 flex flex-wrap justify-center gap-3 text-sm">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline">
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />Dashboard
        </Link>
        <Link href="/settings" className="inline-flex items-center gap-2 text-primary underline-offset-4 hover:underline">
          <Settings className="h-4 w-4" aria-hidden="true" />Settings
        </Link>
      </nav>
    </main>
  )
}
