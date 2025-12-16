/**
 * Medication Scheduler
 * Calculates next dose dates based on periodicity rules
 */

export type Periodicity = "daily" | "weekly" | "monthly" | "custom";

export interface PeriodicityConfig {
  periodicity: Periodicity;
  customInterval?: number; // days for custom periodicity
  weekDays?: number[]; // [0-6] for weekly (0=Sunday, 6=Saturday)
  monthDays?: number[]; // [1-31] for monthly
}

/**
 * Calculate next dose date based on periodicity configuration
 * @param lastDate - Last dose date
 * @param config - Periodicity configuration
 * @returns Next dose date
 */
export function calculateNextDose(lastDate: Date, config: PeriodicityConfig): Date {
  const next = new Date(lastDate);

  switch (config.periodicity) {
    case "daily":
      // Add 1 day
      next.setDate(next.getDate() + 1);
      break;

    case "weekly":
      // Find next matching week day
      if (!config.weekDays || config.weekDays.length === 0) {
        // Default to same day next week
        next.setDate(next.getDate() + 7);
      } else {
        // Sort week days
        const sortedDays = [...config.weekDays].sort((a, b) => a - b);
        const currentDay = next.getDay();
        
        // Find next day in the list
        let nextDay = sortedDays.find(day => day > currentDay);
        
        if (nextDay === undefined) {
          // Wrap to next week, use first day
          nextDay = sortedDays[0]!;
          const daysToAdd = (7 - currentDay) + nextDay;
          next.setDate(next.getDate() + daysToAdd);
        } else {
          // Same week
          const daysToAdd = nextDay - currentDay;
          next.setDate(next.getDate() + daysToAdd);
        }
      }
      break;

    case "monthly":
      // Find next matching month day
      if (!config.monthDays || config.monthDays.length === 0) {
        // Default to same day next month
        next.setMonth(next.getMonth() + 1);
      } else {
        // Sort month days
        const sortedDays = [...config.monthDays].sort((a, b) => a - b);
        const currentDay = next.getDate();
        
        // Find next day in current month
        let nextDay = sortedDays.find(day => day > currentDay);
        
        if (nextDay === undefined) {
          // Move to next month, use first day
          next.setMonth(next.getMonth() + 1);
          nextDay = sortedDays[0]!;
          next.setDate(nextDay);
        } else {
          // Same month
          next.setDate(nextDay);
        }
        
        // Handle invalid dates (e.g., Feb 30)
        if (next.getDate() !== nextDay) {
          // Day doesn't exist in this month, move to next month
          next.setMonth(next.getMonth() + 1);
          next.setDate(sortedDays[0]!);
        }
      }
      break;

    case "custom":
      // Add custom interval in days
      const interval = config.customInterval || 1;
      next.setDate(next.getDate() + interval);
      break;
  }

  return next;
}

/**
 * Calculate multiple future doses
 * @param startDate - Start date
 * @param config - Periodicity configuration
 * @param count - Number of doses to calculate
 * @returns Array of future dose dates
 */
export function calculateFutureDoses(
  startDate: Date,
  config: PeriodicityConfig,
  count: number = 5
): Date[] {
  const doses: Date[] = [new Date(startDate)];
  
  for (let i = 1; i < count; i++) {
    const nextDose = calculateNextDose(doses[i - 1]!, config);
    doses.push(nextDose);
  }
  
  return doses;
}

/**
 * Calculate next dose based on auto-schedule rule
 * @param lastDate - Last dose date
 * @param intervalType - Type of interval (days, weeks, months, years)
 * @param intervalValue - Value of interval
 * @returns Next dose date
 */
export function calculateAutoScheduledDose(
  lastDate: Date,
  intervalType: "days" | "weeks" | "months" | "years",
  intervalValue: number
): Date {
  const next = new Date(lastDate);

  switch (intervalType) {
    case "days":
      next.setDate(next.getDate() + intervalValue);
      break;
    case "weeks":
      next.setDate(next.getDate() + (intervalValue * 7));
      break;
    case "months":
      next.setMonth(next.getMonth() + intervalValue);
      break;
    case "years":
      next.setFullYear(next.getFullYear() + intervalValue);
      break;
  }

  return next;
}

/**
 * Parse week days from JSON string
 */
export function parseWeekDays(weekDaysJson: string | null): number[] | undefined {
  if (!weekDaysJson) return undefined;
  try {
    const parsed = JSON.parse(weekDaysJson);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Parse month days from JSON string
 */
export function parseMonthDays(monthDaysJson: string | null): number[] | undefined {
  if (!monthDaysJson) return undefined;
  try {
    const parsed = JSON.parse(monthDaysJson);
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
