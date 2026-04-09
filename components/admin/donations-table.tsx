'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  FileCheckIcon,
  FileTextIcon,
  HeartIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  RotateCcwIcon,
  BanIcon,
  MessageSquareIcon,
} from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/admin/status-badge'
import type { DonationRow } from '@/lib/admin-types'

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string): string {
  try {
    return format(new Date(iso), 'dd MMM yyyy, hh:mm a')
  } catch {
    return iso
  }
}

function formatAddressLines(row: DonationRow): string {
  if (row.street_address || row.city || row.state || row.pincode || row.country) {
    return [row.street_address, row.city, row.state, row.pincode, row.country]
      .filter(Boolean)
      .join(', ')
  }
  return row.address || '—'
}

function normalizeCommStatus(value: string | null | undefined, sentFlag: boolean | null | undefined): string {
  if (value) return value
  if (sentFlag === true) return 'success'
  if (sentFlag === false) return 'failed'
  return 'unknown'
}

function CommStatusBadge({ status }: { status: string }) {
  const tone =
    status === 'success'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      : status === 'failed'
      ? 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
      : status === 'pending' || status === 'processing'
      ? 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
      : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700'

  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <Badge variant="outline" className={tone}>
      {label}
    </Badge>
  )
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function DocLink({
  url,
  label,
  icon: Icon,
}: {
  url: string | null
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  if (!url || !isSafeUrl(url)) return null

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
      title={`Open ${label}`}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </a>
  )
}

function DocIconLink({ url, label, icon: Icon }: { url: string | null; label: string; icon: React.ComponentType<{ className?: string }> }) {
  if (!url || !isSafeUrl(url)) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80"
      title={label}
      onClick={(e) => e.stopPropagation()}
    >
      <Icon className="size-4.5" />
    </a>
  )
}

interface DonationsTableProps {
  rows: DonationRow[]
  loading: boolean
  onAction?: (action: string, donationId: string) => void
}

export function DonationsTable({ rows, loading, onAction }: DonationsTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {['', 'Receipt #', 'Date', 'Donor', 'Amount', 'Status', 'Docs', 'Delivery'].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 }).map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center text-muted-foreground">
        No donations found matching your filters.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>Receipt #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Docs</TableHead>
            <TableHead>Delivery</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isExpanded = expandedIds.has(row.id)
            return (
              <>
                {/* Summary row */}
                <TableRow
                  key={row.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleExpand(row.id)}
                >
                  <TableCell className="w-8 px-2">
                    {isExpanded ? (
                      <ChevronDownIcon className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRightIcon className="size-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-mono">{row.receipt_number || '—'}</span>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(row.created_at)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="font-medium">{row.name}</p>
                    <p className="text-muted-foreground">{row.email}</p>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">
                    {formatINR(row.amount)}
                  </TableCell>
                  <TableCell className="text-xs">
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <DocIconLink url={row.receipt_url} label="Receipt" icon={FileTextIcon} />
                      <DocIconLink url={row.itr80g_url} label="80G Certificate" icon={FileCheckIcon} />
                      <DocIconLink url={row.thanking_letter_url} label="Thank You Letter" icon={HeartIcon} />
                      {!row.receipt_url && !row.itr80g_url && !row.thanking_letter_url && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-2">
                      <span title="Email">
                        <CommStatusBadge
                          status={normalizeCommStatus(row.donor_email_status, row.email_sent)}
                        />
                      </span>
                      <span title="WhatsApp">
                        <CommStatusBadge
                          status={normalizeCommStatus(row.donor_whatsapp_status, row.whatsapp_sent)}
                        />
                      </span>
                    </div>
                  </TableCell>
                </TableRow>

                {/* Expanded detail row */}
                {isExpanded && (
                  <TableRow key={`${row.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                    <TableCell colSpan={8} className="p-4">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {/* Contact */}
                        <div className="space-y-1 text-sm">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Contact</p>
                          <p>Phone: {row.phone}</p>
                          <p>PAN: <span className="font-mono uppercase">{row.pan_number || '—'}</span></p>
                          <p>Address: {formatAddressLines(row)}</p>
                        </div>

                        {/* Payment */}
                        <div className="space-y-1 text-sm">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Payment</p>
                          <p>ID: <span className="font-mono text-xs break-all">{row.razorpay_payment_id || '—'}</span></p>
                        </div>

                        {/* Documents */}
                        <div className="space-y-1 text-sm">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Documents</p>
                          <div className="flex flex-wrap gap-3">
                            <DocLink url={row.receipt_url} label="Receipt" icon={FileTextIcon} />
                            <DocLink url={row.itr80g_url} label="80G Certificate" icon={FileCheckIcon} />
                            <DocLink url={row.thanking_letter_url} label="Thank You Letter" icon={HeartIcon} />
                            {!row.receipt_url && !row.itr80g_url && !row.thanking_letter_url && (
                              <span className="text-xs text-muted-foreground">No documents</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Donor Message */}
                      {row.message && (
                        <div className="mt-3 space-y-1 text-sm">
                          <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                            <MessageSquareIcon className="size-3" />
                            Donor Message
                          </p>
                          <p className="text-muted-foreground italic">&ldquo;{row.message}&rdquo;</p>
                        </div>
                      )}

                      {/* Row actions */}
                      {onAction && (row.status === 'pending') && (
                        <div className="mt-4 flex gap-2 border-t pt-3">
                          {row.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                onAction('mark_abandoned', row.id)
                              }}
                            >
                              <BanIcon className="size-3.5" />
                              Mark Abandoned
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
