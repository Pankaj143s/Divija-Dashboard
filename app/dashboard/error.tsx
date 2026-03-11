'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard route error:', error)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-screen-2xl items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-md border p-6 text-center">
        <h2 className="text-lg font-semibold">Unable to load dashboard</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Something went wrong while loading admin data.
        </p>
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
