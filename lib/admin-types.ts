/**
 * Admin Dashboard Types
 */

export interface DonationRow {
  id: string
  receipt_number: string
  name: string
  first_name: string | null
  last_name: string | null
  email: string
  phone: string
  pan_number: string | null
  address: string | null
  street_address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  country: string | null
  amount: number
  status: string
  created_at: string
  razorpay_payment_id: string | null
  payment_method: string | null
  email_sent: boolean | null
  whatsapp_sent: boolean | null
  donor_email_status: string | null
  donor_whatsapp_status: string | null
  receipt_url: string | null
  itr80g_url: string | null
  thanking_letter_url: string | null
  message: string | null
  // Source tracking — null/missing means 'website' (backward-compatible)
  source?: string | null
  campaign_name?: string | null
}

export interface DashboardStats {
  amount: number
  count: number
}

export interface DashboardRangeStats extends DashboardStats {
  totalCount: number
  pendingCount: number
  refundedCount: number
  refundedAmount: number
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  pages: number
}

export interface DashboardResponse {
  rows: DonationRow[]
  statsAllTime: DashboardStats | null
  statsRange: DashboardRangeStats
  pagination: PaginationInfo
}

export interface DashboardFilters {
  q: string
  status: string
  source: string
  from: string
  to: string
  page: number
  limit: number
}

export type ExportMode = 'filtered' | 'month' | 'all'
