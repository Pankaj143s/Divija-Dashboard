'use client'

import { format } from 'date-fns'
import { FileCheckIcon, FileTextIcon, HeartIcon } from 'lucide-react'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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

function formatDateLines(iso: string): [string, string] {
  try {
    return [
      format(new Date(iso), 'dd MMM yyyy'),
      format(new Date(iso), 'hh:mm a'),
    ]
  } catch {
    return [iso, '']
  }
}

function formatAddressLines(row: DonationRow): string[] {
  if (row.street_address || row.city || row.state || row.pincode || row.country) {
    const line1 = row.street_address?.trim()
    const line2 = [row.city, row.state, row.pincode].filter(Boolean).join(', ').trim()
    const line3 = row.country?.trim()
    return [line1, line2, line3].filter(Boolean) as string[]
  }

  const raw = (row.address || '').trim()
  if (!raw) return ['—']

  const split = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)

  if (split.length <= 1) return [raw]

  const firstLine = split.slice(0, Math.ceil(split.length / 2)).join(', ')
  const secondLine = split.slice(Math.ceil(split.length / 2)).join(', ')
  return [firstLine, secondLine].filter(Boolean)
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

function DocLink({
  url,
  label,
  icon: Icon,
}: {
  url: string | null
  label: string
  icon: React.ComponentType<{ className?: string }>
}) {
  if (!url) {
    return (
      <div className="text-muted-foreground flex min-w-[38px] flex-col items-center gap-1 text-[10px] leading-3">
        <Icon className="size-3.5 opacity-50" />
        <span>{label}</span>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary inline-flex min-w-[38px] flex-col items-center gap-1 text-[10px] leading-3 hover:underline"
      title={`Open ${label}`}
      download
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </a>
  )
}

interface DonationsTableProps {
  rows: DonationRow[]
  loading: boolean
}

export function DonationsTable({ rows, loading }: DonationsTableProps) {
  const stickyHeaderBase = 'sticky bg-background'
  const stickyCellBase = 'sticky bg-background'

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[1900px] table-fixed">
          <TableHeader>
            <TableRow>
              {[
                'Sr No.',
                'Receipt #',
                'Date / Time',
                'Name',
                'Donor Email',
                'Phone',
                'PAN',
                'Address',
                'Amount',
                'Payment Status',
                'Email Delivery',
                'WhatsApp Delivery',
                'Payment ID',
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 13 }).map((_, j) => (
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
      <Table className="min-w-[1900px] table-fixed">
        <TableHeader>
          <TableRow>
            <TableHead className={`${stickyHeaderBase} left-0 z-40 w-[70px] text-center`}>Sr No.</TableHead>
            <TableHead className={`${stickyHeaderBase} left-[70px] z-40 w-[220px]`}>Receipt #</TableHead>
            <TableHead className={`${stickyHeaderBase} left-[290px] z-40 w-[170px]`}>Date / Time</TableHead>
            <TableHead className={`${stickyHeaderBase} left-[460px] z-40 w-[220px]`}>Name</TableHead>
            <TableHead className="w-[14%]">Donor Email</TableHead>
            <TableHead className="w-[9%]">Phone</TableHead>
            <TableHead className="w-[8%]">PAN</TableHead>
            <TableHead className="w-[15%]">Address</TableHead>
            <TableHead className="w-[7%] text-right">Amount</TableHead>
            <TableHead className="w-[8%]">Payment Status</TableHead>
            <TableHead className="w-[8%]">Email Delivery</TableHead>
            <TableHead className="w-[9%]">WhatsApp Delivery</TableHead>
            <TableHead className="w-[10%]">Payment ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={row.id}>
              <TableCell className={`${stickyCellBase} left-0 z-30 w-[70px] align-top text-center text-xs font-medium tabular-nums`}>
                {index + 1}
              </TableCell>
              <TableCell className={`${stickyCellBase} left-[70px] z-30 w-[220px] align-top text-xs`}>
                <p className="font-mono whitespace-normal break-all">{row.receipt_number || '—'}</p>
                <div className="mt-2 flex items-start gap-2">
                  <DocLink url={row.receipt_url} label="Receipt" icon={FileTextIcon} />
                  <DocLink url={row.itr80g_url} label="80G" icon={FileCheckIcon} />
                  <DocLink url={row.thanking_letter_url} label="Letter" icon={HeartIcon} />
                </div>
              </TableCell>
              <TableCell className={`${stickyCellBase} left-[290px] z-30 w-[170px] align-top text-xs`}>
                <div className="leading-4">
                  <p>{formatDateLines(row.created_at)[0]}</p>
                  <p className="text-muted-foreground">{formatDateLines(row.created_at)[1]}</p>
                </div>
              </TableCell>
              <TableCell className={`${stickyCellBase} left-[460px] z-30 w-[220px] align-top text-xs`}>
                <p className="font-medium whitespace-normal break-words">{row.name}</p>
              </TableCell>
              <TableCell className="align-top text-xs">
                <p className="whitespace-normal break-all leading-4">{row.email}</p>
              </TableCell>
              <TableCell className="align-top text-xs">
                <p className="mt-1 whitespace-normal break-all">{row.phone}</p>
              </TableCell>
              <TableCell className="align-top text-xs">
                <p className="mt-1 font-mono uppercase whitespace-nowrap">{row.pan_number || '—'}</p>
              </TableCell>
              <TableCell className="align-top text-xs">
                <div className="space-y-0.5 whitespace-normal break-all leading-4">
                  {formatAddressLines(row).map((line, addressIndex) => (
                    <p key={`${row.id}-addr-${addressIndex}`}>{line}</p>
                  ))}
                </div>
              </TableCell>
              <TableCell className="align-top text-xs">
                <p className="text-right font-medium tabular-nums">{formatINR(row.amount)}</p>
              </TableCell>
              <TableCell className="align-top text-xs">
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="align-top text-xs">
                <CommStatusBadge
                  status={normalizeCommStatus(row.donor_email_status, row.email_sent)}
                />
              </TableCell>
              <TableCell className="align-top text-xs">
                <CommStatusBadge
                  status={normalizeCommStatus(row.donor_whatsapp_status, row.whatsapp_sent)}
                />
              </TableCell>
              <TableCell className="align-top text-xs">
                <p className="font-mono text-[11px] whitespace-normal break-all">
                  {row.razorpay_payment_id || '—'}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
