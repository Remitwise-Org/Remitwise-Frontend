/**
 * Bills
 *
 * Shape definitions and helpers for the bills API.
 */

export interface Bill {
  id: string
  amount: number
  status: 'paid' | 'unpaid' | 'overdue'
  description?: string
  createdAt: number
  updatedAt: number
}

export interface BillsTotalUnpaidResponse {
  total: number
}

export interface BillsTotalUnpaidError {
  error: string
}

/** Sums the `amount` of all bills with `status === 'unpaid'. */
export function totalUnpaid(bills: ReadonlyArray<Bill>): number {
  return bills.reduce((sum, bill) => {
    if (bill.status === 'unpaid') {
      return sum + bill.amount
    }
    return sum
  }, 0)
}