'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  SearchIcon,
  FileSpreadsheetIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { LogoutButton } from '@/components/admin/logout-button'
import { StatsCards } from '@/components/admin/stats-cards'
import { DateRangePicker } from '@/components/admin/date-range-picker'
import { DonationsTable } from '@/components/admin/donations-table'

import type {
  DashboardFilters,
  DashboardResponse,
  DashboardStats,
  DashboardRangeStats,
  DonationRow,
  PaginationInfo,
} from '@/lib/admin-types'

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------
const DEFAULT_FILTERS: DashboardFilters = {
  q: '',
  status: '',
  from: '',
  to: '',
  page: 1,
  limit: 25,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const router = useRouter()

  // State
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [rows, setRows] = useState<DonationRow[]>([])
  const [statsAllTime, setStatsAllTime] = useState<DashboardStats | null>(null)
  const [statsRange, setStatsRange] = useState<DashboardRangeStats | null>(null)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Debounce timer for search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const hasLoadedAllTimeRef = useRef(false)

  // -------------------------------------------------------------------------
  // Fetch data
  // -------------------------------------------------------------------------
  const fetchData = useCallback(async (f: DashboardFilters) => {
    const isInitialLoad = !hasLoadedAllTimeRef.current
    setLoading(isInitialLoad)
    setIsRefreshing(!isInitialLoad)
    setError('')

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    const params = new URLSearchParams()
    if (f.q) params.set('q', f.q)
    if (f.status) params.set('status', f.status)
    if (f.from) params.set('from', f.from)
    if (f.to) params.set('to', f.to)
    params.set('page', String(f.page))
    params.set('limit', String(f.limit))
    if (hasLoadedAllTimeRef.current) {
      params.set('includeAllTime', 'false')
    }

    try {
      const res = await fetch(`/api/admin/dashboard?${params.toString()}`, {
        signal: controller.signal,
      })
      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load data')
      }
      const data: DashboardResponse = await res.json()
      setRows(data.rows)
      if (data.statsAllTime) {
        setStatsAllTime(data.statsAllTime)
        hasLoadedAllTimeRef.current = true
      }
      setStatsRange(data.statsRange)
      setPagination(data.pagination)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setIsRefreshing(false)
      }
    }
  }, [router])

  // Load on mount + whenever filters change
  useEffect(() => {
    fetchData(filters)
  }, [filters, fetchData])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: value, page: 1 }))
    }, 400)
  }

  function handleStatusChange(value: string) {
    setFilters((prev) => ({ ...prev, status: value === 'all' ? '' : value, page: 1 }))
  }

  function handleDateChange(from: string, to: string) {
    setFilters((prev) => ({ ...prev, from, to, page: 1 }))
  }

  function handleReset() {
    setSearchInput('')
    setFilters(DEFAULT_FILTERS)
  }

  function handlePageChange(page: number) {
    setFilters((prev) => ({ ...prev, page }))
  }

  // -------------------------------------------------------------------------
  // Export helpers
  // -------------------------------------------------------------------------
  function buildExportUrl() {
    const params = new URLSearchParams()
    params.set('mode', 'filtered')
    params.set('format', 'xlsx')

    if (filters.q) params.set('q', filters.q)
    if (filters.status) params.set('status', filters.status)
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)

    return `/api/admin/export?${params.toString()}`
  }

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------
  const hasDateFilter = !!(filters.from || filters.to)
  const hasAnyFilter = !!(filters.q || filters.status || filters.from || filters.to)
  const totalPages = pagination?.pages ?? 1
  const currentPage = pagination?.page ?? 1

  // Generate visible page numbers (max 5 around current)
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: number[] = [1]
    let start = Math.max(2, currentPage - 1)
    let end = Math.min(totalPages - 1, currentPage + 1)
    if (currentPage <= 3) end = Math.min(4, totalPages - 1)
    if (currentPage >= totalPages - 2) start = Math.max(totalPages - 3, 2)
    if (start > 2) pages.push(-1) // ellipsis
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < totalPages - 1) pages.push(-2) // ellipsis
    if (totalPages > 1) pages.push(totalPages)
    return pages
  }, [currentPage, totalPages])

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur dark:bg-gray-950/80">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="relative h-9 w-9 shrink-0">
              <Image
                src="/images/divija-logo.png"
                alt="Divija Old Age Home logo"
                fill
                className="rounded-full object-cover"
                priority
              />
            </div>
            <h1 className="text-base font-semibold sm:text-lg">Donations Dashboard</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 space-y-6 p-4 sm:p-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Stats */}
        <StatsCards
          statsAllTime={statsAllTime}
          statsRange={statsRange}
          hasDateFilter={hasDateFilter}
          loading={loading && !statsAllTime}
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search name, email, phone, receipt#…"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Date range */}
          <DateRangePicker
            from={filters.from}
            to={filters.to}
            onChange={handleDateChange}
          />

          {/* Status */}
          <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
            <SelectTrigger size="sm" className="h-9 w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="abandoned">Abandoned</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset */}
          {hasAnyFilter && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5">
              <XIcon className="size-3.5" />
              Reset
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Export buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              asChild
            >
              <a href={buildExportUrl()} download>
                <FileSpreadsheetIcon className="size-3.5" />
                <span className="hidden md:inline">Download Excel</span>
                <span className="md:hidden">Excel</span>
              </a>
            </Button>
          </div>

          {isRefreshing && (
            <span className="text-muted-foreground text-xs">Updating results…</span>
          )}
        </div>

        {/* Table */}
        <DonationsTable rows={rows} loading={loading && rows.length === 0} />

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              Showing{' '}
              <span className="font-medium text-foreground">
                {(pagination.page - 1) * pagination.limit + 1}
              </span>
              –
              <span className="font-medium text-foreground">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{' '}
              of{' '}
              <span className="font-medium text-foreground">{pagination.total}</span>
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <ChevronLeftIcon />
              </Button>

              {pageNumbers.map((p, i) =>
                p < 0 ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
                    …
                  </span>
                ) : (
                  <Button
                    key={p}
                    variant={p === currentPage ? 'default' : 'outline'}
                    size="icon-sm"
                    onClick={() => handlePageChange(p)}
                  >
                    {p}
                  </Button>
                ),
              )}

              <Button
                variant="outline"
                size="icon-sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <ChevronRightIcon />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
