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
  PencilIcon,
  XIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
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

/** Small source badge shown below donor email.
 *  NULL / missing source defaults to 🌐 Website (backward-compatible). */
function SourceBadge({ source }: { source?: string | null }) {
  let emoji = '🌐'
  let label = 'Website'
  if (source === 'instagram')       { emoji = '📷'; label = 'Instagram' }
  else if (source === 'meta_ads')   { emoji = '📣'; label = 'Meta Ads' }
  else if (source === 'manual')     { emoji = '➕'; label = 'Manual' }
  return (
    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] leading-none text-muted-foreground/70">
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
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

  // ── Edit & Resend state ──────────────────────────────────────────────────
  const [editRow, setEditRow] = useState<DonationRow | null>(null)
  const [editForm, setEditForm] = useState({
    name: '', pan_number: '', email: '', phone: '', address: '',
  })
  const [editReason, setEditReason] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editResult, setEditResult] = useState<{ success: boolean; message: string } | null>(null)

  function openEditModal(row: DonationRow) {
    setEditRow(row)
    setEditForm({
      name:       row.name        ?? '',
      pan_number: row.pan_number  ?? '',
      email:      row.email       ?? '',
      phone:      row.phone       ?? '',
      address:    row.address     ?? '',
    })
    setEditReason('')
    setEditResult(null)
  }

  function closeEditModal() {
    setEditRow(null)
    setEditResult(null)
  }

  async function submitCorrection() {
    if (!editRow) return
    if (!editReason.trim()) {
      setEditResult({ success: false, message: 'Please enter a reason for the correction.' })
      return
    }

    // Build only fields that changed
    const corrections: Record<string, string> = {}
    if (editForm.name.trim()       !== (editRow.name        ?? '')) corrections.name       = editForm.name.trim()
    if (editForm.pan_number.trim() !== (editRow.pan_number  ?? '')) corrections.pan_number = editForm.pan_number.trim()
    if (editForm.email.trim()      !== (editRow.email       ?? '')) corrections.email      = editForm.email.trim()
    if (editForm.phone.trim()      !== (editRow.phone       ?? '')) corrections.phone      = editForm.phone.trim()
    if (editForm.address.trim()    !== (editRow.address     ?? '')) corrections.address    = editForm.address.trim()

    if (Object.keys(corrections).length === 0) {
      setEditResult({ success: false, message: 'No changes detected.' })
      return
    }

    setEditLoading(true)
    setEditResult(null)

    try {
      const res = await fetch('/api/admin/correct-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ donationId: editRow.id, corrections, reason: editReason.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setEditResult({ success: false, message: data.error || 'Something went wrong.' })
      } else {
        const parts: string[] = ['Documents regenerated and uploaded.']
        if (data.emailSent)     parts.push('Email resent ✓')
        if (data.whatsappSent)  parts.push('WhatsApp resent ✓')
        if (!data.emailSent)    parts.push('Email failed — check logs')
        if (!data.whatsappSent) parts.push('WhatsApp failed — check logs')
        setEditResult({ success: true, message: parts.join(' · ') })
      }
    } catch {
      setEditResult({ success: false, message: 'Network error — please try again.' })
    } finally {
      setEditLoading(false)
    }
  }
  // ────────────────────────────────────────────────────────────────────────

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
                    <SourceBadge source={row.source} />
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

                      {/* Edit & Resend — only for successful donations */}
                      {row.status === 'success' && (
                        <div className="mt-4 flex gap-2 border-t pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              openEditModal(row)
                            }}
                          >
                            <PencilIcon className="size-3.5" />
                            Edit &amp; Resend Documents
                          </Button>
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

      {/* ── Edit & Resend Modal ───────────────────────────────────────────── */}
      {editRow && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeEditModal() }}
        >
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl dark:bg-gray-900 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-base font-semibold">Edit &amp; Resend Documents</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receipt #{editRow.receipt_number} · {editRow.name}
                </p>
              </div>
              <button
                onClick={closeEditModal}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                disabled={editLoading}
                aria-label="Close"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Body */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 text-sm">
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-md px-3 py-2 dark:bg-amber-900/20 dark:border-amber-800">
                Correcting donor details will regenerate all three PDFs at the same URLs, update the donation record in the database, and resend the email + WhatsApp with the corrected information.
              </p>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled={editLoading}
                />
              </div>

              {/* PAN */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">PAN Number</label>
                <input
                  type="text"
                  value={editForm.pan_number}
                  onChange={(e) => setEditForm((f) => ({ ...f, pan_number: e.target.value.toUpperCase() }))}
                  placeholder="ABCDE1234F"
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled={editLoading}
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled={editLoading}
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled={editLoading}
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</label>
                <textarea
                  value={editForm.address}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                  rows={2}
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled={editLoading}
                />
              </div>

              {/* Reason (required) */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Reason for Correction <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={2}
                  placeholder="e.g. Donor provided wrong PAN number"
                  className="w-full rounded-md border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                  disabled={editLoading}
                />
              </div>

              {/* Result feedback */}
              {editResult && (
                <div className={`flex items-start gap-2 rounded-md px-3 py-2 text-xs ${
                  editResult.success
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
                }`}>
                  {editResult.success
                    ? <CheckCircle2Icon className="size-3.5 mt-0.5 flex-shrink-0" />
                    : <XIcon className="size-3.5 mt-0.5 flex-shrink-0" />
                  }
                  <span>{editResult.message}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                onClick={closeEditModal}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={submitCorrection}
                disabled={editLoading || editResult?.success === true}
              >
                {editLoading ? (
                  <>
                    <LoaderCircleIcon className="size-3.5 animate-spin" />
                    Processing…
                  </>
                ) : editResult?.success ? (
                  <>
                    <CheckCircle2Icon className="size-3.5" />
                    Done
                  </>
                ) : (
                  <>
                    <PencilIcon className="size-3.5" />
                    Confirm &amp; Resend
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
