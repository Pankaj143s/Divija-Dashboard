import { IndianRupeeIcon, HashIcon, ClockIcon, RotateCcwIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardStats, DashboardRangeStats } from '@/lib/admin-types'

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

interface StatsCardsProps {
  statsAllTime: DashboardStats | null
  statsRange: DashboardRangeStats | null
  hasDateFilter: boolean
  loading: boolean
}

export function StatsCards({ statsAllTime, statsRange, hasDateFilter, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-28" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="mt-1 h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const rangeLabel = hasDateFilter ? 'Range' : 'All-Time'

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Collected */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Collected</CardTitle>
          <IndianRupeeIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatINR(statsRange?.amount ?? statsAllTime?.amount ?? 0)}</div>
          <p className="text-xs text-muted-foreground">
            {rangeLabel} · {statsRange?.count ?? statsAllTime?.count ?? 0} successful
          </p>
        </CardContent>
      </Card>

      {/* Total Donations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Donations</CardTitle>
          <HashIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsRange?.totalCount ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            {rangeLabel} · all statuses
          </p>
        </CardContent>
      </Card>

      {/* Pending */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          <ClockIcon className="size-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsRange?.pendingCount ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            {rangeLabel} · awaiting payment
          </p>
        </CardContent>
      </Card>

      {/* Refunded */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Refunded</CardTitle>
          <RotateCcwIcon className="size-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatINR(statsRange?.refundedAmount ?? 0)}</div>
          <p className="text-xs text-muted-foreground">
            {rangeLabel} · {statsRange?.refundedCount ?? 0} refunded
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
