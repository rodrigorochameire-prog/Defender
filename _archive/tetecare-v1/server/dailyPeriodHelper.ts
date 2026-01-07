/**
 * Daily Period Helper
 * 
 * Handles calculation and management of multi-day stay periods (check-in/check-out)
 */

/**
 * Calculate number of days between check-in and check-out dates
 * Includes both check-in and check-out days
 * 
 * Example: Check-in Monday, Check-out Wednesday = 3 days (Mon, Tue, Wed)
 * 
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Number of days (minimum 1)
 */
export function calculateDailyCount(checkInDate: Date, checkOutDate: Date): number {
  // Normalize dates to start of day for accurate calculation
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  
  const checkOut = new Date(checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  
  // Calculate difference in milliseconds
  const diffMs = checkOut.getTime() - checkIn.getTime();
  
  // Convert to days and add 1 to include both start and end days
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  
  // Ensure at least 1 day
  return Math.max(1, diffDays);
}

/**
 * Generate array of dates for the entire stay period
 * 
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Array of Date objects for each day of the stay
 */
export function generatePeriodDates(checkInDate: Date, checkOutDate: Date): Date[] {
  const dates: Date[] = [];
  
  const current = new Date(checkInDate);
  current.setHours(0, 0, 0, 0);
  
  const end = new Date(checkOutDate);
  end.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Check if a date falls within a stay period
 * 
 * @param date - Date to check
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns true if date is within the period
 */
export function isDateInPeriod(
  date: Date,
  checkInDate: Date,
  checkOutDate: Date
): boolean {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  
  const checkOut = new Date(checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  
  return normalized >= checkIn && normalized <= checkOut;
}

/**
 * Format period for display
 * 
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @param dailyCount - Number of days
 * @returns Formatted string (e.g., "14/12 a 17/12 (4 diárias)")
 */
export function formatPeriod(
  checkInDate: Date,
  checkOutDate: Date,
  dailyCount: number
): string {
  const checkIn = new Date(checkInDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  
  const checkOut = new Date(checkOutDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
  
  const diariasText = dailyCount === 1 ? "diária" : "diárias";
  
  return `${checkIn} a ${checkOut} (${dailyCount} ${diariasText})`;
}

/**
 * Validate period dates
 * 
 * @param checkInDate - Check-in date
 * @param checkOutDate - Check-out date
 * @returns Validation result with error message if invalid
 */
export function validatePeriod(
  checkInDate: Date,
  checkOutDate: Date
): { valid: boolean; error?: string } {
  const checkIn = new Date(checkInDate);
  checkIn.setHours(0, 0, 0, 0);
  
  const checkOut = new Date(checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  
  if (checkOut < checkIn) {
    return {
      valid: false,
      error: "Data de check-out deve ser posterior à data de check-in",
    };
  }
  
  // Check if period is too long (e.g., more than 90 days)
  const diffMs = checkOut.getTime() - checkIn.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays > 90) {
    return {
      valid: false,
      error: "Período não pode exceder 90 dias",
    };
  }
  
  return { valid: true };
}
