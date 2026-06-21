/**
 * Calculates the number of days left until a target date.
 * Returns 0 if the date is today or in the past.
 */
export function calculateDaysLeft(targetDate: string): number {
  const target = new Date(targetDate)
  const today = new Date()
  
  // Set times to midnight for accurate day calculation
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return Math.max(0, diffDays)
}

/**
 * Checks if a target date is in the past (overdue).
 */
export function checkIsOverdue(targetDate: string): boolean {
  const target = new Date(targetDate)
  const today = new Date()
  
  // Set times to midnight
  target.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  
  return target < today
}
