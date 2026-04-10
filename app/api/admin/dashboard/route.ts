/**
 * Admin Dashboard Data API
 * GET /api/admin/dashboard
 *
 * Returns filtered donation rows + all-time stats + range stats.
 * Protected by admin session cookie.
 */

import { NextRequest, NextResponse } from 'next/server'
import { isAdminAuthenticated } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { DashboardResponse, DonationRow } from '@/lib/admin-types'

const ALLOWED_STATUSES = ['success', 'pending', 'abandoned', 'failed', 'refunded']

const SELECT_COLUMNS = [
  'id',
  'receipt_number',
  'name',
  'first_name',
  'last_name',
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
  'created_at',
  'razorpay_payment_id',
  'payment_method',
  'email_sent',
  'whatsapp_sent',
  'donor_email_status',
  'donor_whatsapp_status',
  'receipt_url',
  'itr80g_url',
  'thanking_letter_url',
  'message',
].join(',')

export async function GET(request: NextRequest) {
  // Verify session cookie
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const status = searchParams.get('status') || ''
    const from = searchParams.get('from') || ''
    const to = searchParams.get('to') || ''
    const includeAllTime = searchParams.get('includeAllTime') !== 'false'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')))
    const offset = (page - 1) * limit

    // -----------------------------------------------------------------------
    // Main query: filtered rows with pagination
    // -----------------------------------------------------------------------
    let query = supabaseAdmin
      .from('donations')
      .select(SELECT_COLUMNS, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Text search across multiple columns
    if (q) {
      query = query.or(
        `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,receipt_number.ilike.%${q}%,razorpay_payment_id.ilike.%${q}%`,
      )
    }

    // Status filter
    if (status && ALLOWED_STATUSES.includes(status)) {
      query = query.eq('status', status)
    }

    // Date range filter
    if (from) {
      query = query.gte('created_at', `${from}T00:00:00.000Z`)
    }
    if (to) {
      query = query.lte('created_at', `${to}T23:59:59.999Z`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: rows, error, count } = await query

    if (error) {
      console.error('Dashboard query error:', error)
      throw error
    }

    // -----------------------------------------------------------------------
    // Stats: All-Time (successful donations) — uses DB-side aggregation RPC
    // to avoid fetching all rows into JS memory (fast even with 10k+ rows)
    // -----------------------------------------------------------------------
    let statsAllTime: DashboardResponse['statsAllTime'] = null
    if (includeAllTime) {
      const { data: allTimeRpc, error: allTimeError } = await supabaseAdmin
        .rpc('get_all_time_stats')

      if (allTimeError) {
        // Graceful fallback to JS aggregation if RPC not yet created
        console.warn('⚠️ get_all_time_stats RPC not available, falling back:', allTimeError.message)
        const { data: allTimeData, error: fallbackError } = await supabaseAdmin
          .from('donations')
          .select('amount')
          .eq('status', 'success')
        if (fallbackError) throw fallbackError
        statsAllTime = {
          amount: allTimeData?.reduce((sum, d) => sum + (d.amount || 0), 0) ?? 0,
          count: allTimeData?.length ?? 0,
        }
      } else {
        statsAllTime = {
          amount: (allTimeRpc as any)?.amount ?? 0,
          count: (allTimeRpc as any)?.count ?? 0,
        }
      }
    }

    // -----------------------------------------------------------------------
    // Stats: Selected Range — uses DB-side aggregation RPC
    // -----------------------------------------------------------------------
    let statsRange: DashboardResponse['statsRange']
    const { data: rangeRpc, error: rangeRpcError } = await supabaseAdmin
      .rpc('get_range_stats', {
        p_from: from ? `${from}T00:00:00.000Z` : null,
        p_to: to ? `${to}T23:59:59.999Z` : null,
      })

    if (rangeRpcError) {
      // Graceful fallback to JS aggregation if RPC not yet created
      console.warn('⚠️ get_range_stats RPC not available, falling back:', rangeRpcError.message)
      let rangeQuery = supabaseAdmin.from('donations').select('amount,status')
      if (from) rangeQuery = rangeQuery.gte('created_at', `${from}T00:00:00.000Z`)
      if (to)   rangeQuery = rangeQuery.lte('created_at', `${to}T23:59:59.999Z`)
      const { data: rangeData, error: rangeError } = await rangeQuery
      if (rangeError) throw rangeError
      const rangeRows = rangeData || []
      statsRange = {
        amount:         rangeRows.filter((d) => d.status === 'success').reduce((s, d) => s + (d.amount || 0), 0),
        count:          rangeRows.filter((d) => d.status === 'success').length,
        totalCount:     rangeRows.length,
        pendingCount:   rangeRows.filter((d) => d.status === 'pending').length,
        refundedCount:  rangeRows.filter((d) => d.status === 'refunded').length,
        refundedAmount: rangeRows.filter((d) => d.status === 'refunded').reduce((s, d) => s + (d.amount || 0), 0),
      }
    } else {
      const r = rangeRpc as any
      statsRange = {
        amount:         r?.amount         ?? 0,
        count:          r?.count          ?? 0,
        totalCount:     r?.totalCount     ?? 0,
        pendingCount:   r?.pendingCount   ?? 0,
        refundedCount:  r?.refundedCount  ?? 0,
        refundedAmount: r?.refundedAmount ?? 0,
      }
    }

    // -----------------------------------------------------------------------
    // Response
    // -----------------------------------------------------------------------
    const response: DashboardResponse = {
      rows: (rows as unknown as DonationRow[]) || [],
      statsAllTime,
      statsRange,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        pages: Math.ceil((count ?? 0) / limit),
      },
    }

    return NextResponse.json(response)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ Dashboard API error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
