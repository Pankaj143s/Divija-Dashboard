import { IndianRupeeIcon, HashIcon, CalendarIcon, TrendingUpIcon } from 'lucide-react'
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* All-Time Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">All-Time Amount</CardTitle>
          <IndianRupeeIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatINR(statsAllTime?.amount ?? 0)}</div>
          <p className="text-xs text-muted-foreground">Total successful donations</p>
        </CardContent>
      </Card>

      {/* All-Time Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">All-Time Count</CardTitle>
          <HashIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsAllTime?.count ?? 0}</div>
          <p className="text-xs text-muted-foreground">Successful donations</p>
        </CardContent>
      </Card>

      {/* Range Amount */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {hasDateFilter ? 'Range Amount' : 'All Amount'}
          </CardTitle>
          <TrendingUpIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatINR(statsRange?.amount ?? 0)}</div>
          <p className="text-xs text-muted-foreground">
            {statsRange?.count ?? 0} successful of {statsRange?.totalCount ?? 0} total
          </p>
        </CardContent>
      </Card>

      {/* Range Count */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {hasDateFilter ? 'Range Donations' : 'All Donations'}
          </CardTitle>
          <CalendarIcon className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statsRange?.totalCount ?? 0}</div>
          <p className="text-xs text-muted-foreground">
            {statsRange?.count ?? 0} successful
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
