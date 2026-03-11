/**
 * Admin Excel Export API
 * GET /api/admin/export
 *
 * Exports donations as a downloadable Excel (.xlsx) file.
 * Protected by admin session cookie.
 *
 * Query params:
 *   mode     = 'filtered' | 'month' | 'all'
 *   month    = 'YYYY-MM' (only for mode=month)
 *   q        = search string
 *   status   = donation status filter
 *   from     = date YYYY-MM-DD
 *   to       = date YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { ExportMode } from '@/lib/admin-types'

const ALLOWED_STATUSES = ['success', 'pending', 'abandoned']
const STATUS_FILL: Record<string, string> = {
  success: 'FFD1FAE5',
  pending: 'FFFFF3BF',
  failed: 'FFFFD6D6',
  abandoned: 'FFE9ECEF',
  refunded: 'FFD0EBFF',
}

const DB_FIELDS = [
  'receipt_number',
  'created_at',
  'name',
  'email',
  'phone',
  'pan_number',
  'address',
  'street_address',
  'city',
  'state',
  'pincode',
  'country',
  'amount',
  'status',
  'razorpay_payment_id',
  'payment_method',
  'receipt_url',
  'itr80g_url',
  'thanking_letter_url',
].join(',')

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}

export async function GET(request: NextRequest) {
  // Verify session cookie
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const mode = (searchParams.get('mode') || 'filtered') as ExportMode
    const month = searchParams.get('month') || ''
    const q = searchParams.get('q')?.trim() || ''
    const status = searchParams.get('status') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''

    let query = supabaseAdmin
      .from('donations')
      .select(DB_FIELDS)
      .order('created_at', { ascending: false })
      .limit(100_000)

    // Apply filters based on mode
    switch (mode) {
      case 'month': {
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
          return NextResponse.json(
            { error: 'Invalid month format. Use YYYY-MM.' },
            { status: 400 },
          )
        }
        const [year, mon] = month.split('-').map(Number)
        const startOfMonth = `${month}-01T00:00:00.000Z`
        // Last day of month
        const lastDay = new Date(year, mon, 0).getDate()
        const endOfMonth = `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`
        query = query.gte('created_at', startOfMonth).lte('created_at', endOfMonth)
        break
      }

      case 'filtered': {
        if (q) {
          query = query.or(
            `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,receipt_number.ilike.%${q}%,razorpay_payment_id.ilike.%${q}%`,
          )
        }
        if (status && ALLOWED_STATUSES.includes(status)) {
          query = query.eq('status', status)
        }
        if (from) {
          query = query.gte('created_at', `${from}T00:00:00.000Z`)
        }
        if (to) {
          query = query.lte('created_at', `${to}T23:59:59.999Z`)
        }
        break
      }

      case 'all':
        // No filters
        break

      default:
        return NextResponse.json(
          { error: 'Invalid mode. Use filtered, month, or all.' },
          { status: 400 },
        )
    }

    const { data: rows, error } = await query

    if (error) {
      console.error('Export query error:', error)
      throw error
    }

    const exportRows = (rows || []).map((row, index) => {
      const r = row as unknown as Record<string, unknown>
      const fullAddress = [
        r.street_address,
        r.city,
        r.state,
        r.pincode,
        r.country,
      ]
        .filter(Boolean)
        .join(', ')

      return {
        serialNumber: index + 1,
        receiptNumber: (r.receipt_number as string) || '',
        date: formatDate(r.created_at as string),
        name: (r.name as string) || '',
        email: (r.email as string) || '',
        phone: (r.phone as string) || '',
        pan: (r.pan_number as string) || '',
        address: fullAddress || (r.address as string) || '',
        amount: Number(r.amount || 0),
        status: (r.status as string) || '',
        paymentId: (r.razorpay_payment_id as string) || '',
        paymentMethod: (r.payment_method as string) || 'Online (Razorpay)',
        receiptUrl: (r.receipt_url as string) || '',
        itr80gUrl: (r.itr80g_url as string) || '',
        thankingLetterUrl: (r.thanking_letter_url as string) || '',
      }
    })

    const timestamp = new Date().toISOString().slice(0, 10)
    let filename = `donations-${mode}`
    if (mode === 'month' && month) filename += `-${month}`
    filename += `-${timestamp}`

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Divija Admin Dashboard'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Donations')
    worksheet.properties.defaultRowHeight = 20

    worksheet.mergeCells('A1:O1')
    worksheet.getCell('A1').value = `Report Downloaded: ${formatDate(new Date().toISOString())}`
    worksheet.getCell('A1').font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' },
    }
    worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }

    const tableHeaderRow = 3
    const tableHeaders = [
      'Sr No.',
      'Receipt Number',
      'Date',
      'Name',
      'Email',
      'Phone',
      'PAN',
      'Address',
      'Amount (INR)',
      'Status',
      'Payment ID',
      'Payment Method',
      'Receipt URL',
      '80G URL',
      'Thank Letter URL',
    ]
    worksheet.columns = [
      { key: 'serialNumber', width: 9 },
      { key: 'receiptNumber', width: 22 },
      { key: 'date', width: 22 },
      { key: 'name', width: 24 },
      { key: 'email', width: 30 },
      { key: 'phone', width: 16 },
      { key: 'pan', width: 16 },
      { key: 'address', width: 44 },
      { key: 'amount', width: 14 },
      { key: 'status', width: 12 },
      { key: 'paymentId', width: 24 },
      { key: 'paymentMethod', width: 16 },
      { key: 'receiptUrl', width: 40 },
      { key: 'itr80gUrl', width: 40 },
      { key: 'thankingLetterUrl', width: 40 },
    ]

    worksheet.insertRow(tableHeaderRow, tableHeaders)

    for (const row of exportRows) {
      worksheet.addRow(row)
    }

    const headerRow = worksheet.getRow(tableHeaderRow)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF134E4A' },
    }
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    headerRow.height = 24

    worksheet.views = [{ state: 'frozen', ySplit: tableHeaderRow }]

    worksheet.getColumn('amount').numFmt = '₹ #,##0'
    worksheet.getColumn('amount').alignment = { horizontal: 'right' }

    const columnWidths: Record<number, number> = {
      1: 9,
      2: 22,
      3: 22,
      4: 24,
      5: 30,
      6: 16,
      7: 16,
      8: 44,
      9: 14,
      10: 12,
      11: 24,
      12: 16,
      13: 16,
      14: 16,
      15: 16,
    }

    for (let col = 1; col <= worksheet.columns.length; col++) {
      worksheet.getColumn(col).width = columnWidths[col] || 16
    }

    const firstDataRow = tableHeaderRow + 1
    const lastDataRow = tableHeaderRow + exportRows.length

    for (let rowNumber = firstDataRow; rowNumber <= lastDataRow; rowNumber++) {
      const row = worksheet.getRow(rowNumber)
      const zebraFill = rowNumber % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF'

      for (let col = 1; col <= worksheet.columns.length; col++) {
        const cell = row.getCell(col)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: zebraFill },
        }
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        }
        cell.alignment = { vertical: 'middle' }
      }

      const statusCell = row.getCell(10)
      const statusValue = String(statusCell.value || '').toLowerCase()
      const statusFill = STATUS_FILL[statusValue]
      if (statusFill) {
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: statusFill },
        }
      }
      statusCell.font = { bold: true, color: { argb: 'FF1E293B' } }
      statusCell.alignment = { horizontal: 'center', vertical: 'middle' }

      const amountCell = row.getCell(9)
      amountCell.numFmt = '₹ #,##0'
      amountCell.alignment = { horizontal: 'right', vertical: 'middle' }

      const serialCell = row.getCell(1)
      serialCell.alignment = { horizontal: 'center', vertical: 'middle' }

      ;[13, 14, 15].forEach((index) => {
        const linkCell = row.getCell(index)
        const value = String(linkCell.value || '')
        if (value.startsWith('http')) {
          linkCell.value = {
            text: index === 13 ? 'Receipt' : index === 14 ? '80G' : 'Letter',
            hyperlink: value,
          }
          linkCell.font = { color: { argb: 'FF1D4ED8' }, underline: true }
          linkCell.alignment = { horizontal: 'center', vertical: 'middle' }
        } else {
          linkCell.value = '—'
          linkCell.alignment = { horizontal: 'center', vertical: 'middle' }
        }
      })
    }

    worksheet.getRow(1).height = 24
    worksheet.getRow(2).height = 8

    const xlsxBuffer = await workbook.xlsx.writeBuffer()

    return new NextResponse(Buffer.from(xlsxBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Export API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
