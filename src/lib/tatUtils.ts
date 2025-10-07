// TAT (Turn Around Time) calculation utilities

export interface TATResult {
  display: string;
  status: 'normal' | 'warning' | 'overdue';
  remainingHours: number;
  remainingMinutes: number;
  isOverdue: boolean;
}

/**
 * Calculate real-time TAT (Turn Around Time) for a query
 * @param submittedAt - The date/time when the query was submitted
 * @param tatHours - Expected TAT in hours (default: 24)
 * @returns TATResult object with display string and status
 */
export function calculateRealTimeTAT(submittedAt: string | Date, tatHours: number = 24): TATResult {
  const submitted = new Date(submittedAt);
  const now = new Date();
  
  // Check if submitted date is valid
  if (isNaN(submitted.getTime())) {
    return {
      display: '24 hours',
      status: 'normal',
      remainingHours: 24,
      remainingMinutes: 0,
      isOverdue: false
    };
  }
  
  // Calculate time elapsed since submission
  const elapsedMs = now.getTime() - submitted.getTime();
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  
  // Calculate remaining time
  const remainingHours = tatHours - elapsedHours;
  const remainingMs = (tatHours * 60 * 60 * 1000) - elapsedMs;
  
  if (remainingMs <= 0) {
    // Overdue
    const overdueHours = Math.abs(remainingHours);
    const overdueDays = Math.floor(overdueHours / 24);
    const overdueRemainingHours = Math.floor(overdueHours % 24);
    const overdueMinutes = Math.floor((Math.abs(remainingMs) % (1000 * 60 * 60)) / (1000 * 60));
    
    let display;
    if (overdueDays > 0) {
      display = `${overdueDays}d ${overdueRemainingHours}h overdue`;
    } else if (overdueRemainingHours > 0) {
      display = `${overdueRemainingHours}h ${overdueMinutes}m overdue`;
    } else {
      display = `${overdueMinutes}m overdue`;
    }
    
    return {
      display,
      status: 'overdue',
      remainingHours: 0,
      remainingMinutes: 0,
      isOverdue: true
    };
  }
  
  // Calculate remaining time components
  const remainingDays = Math.floor(remainingHours / 24);
  const remainingHoursOnly = Math.floor(remainingHours % 24);
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  
  // Format display string
  let display;
  if (remainingDays > 0) {
    display = `${remainingDays}d ${remainingHoursOnly}h ${remainingMinutes}m`;
  } else if (remainingHoursOnly > 0) {
    display = `${remainingHoursOnly}h ${remainingMinutes}m`;
  } else {
    display = `${remainingMinutes}m`;
  }
  
  // Determine status
  let status: 'normal' | 'warning' | 'overdue';
  if (remainingHours <= 2) {
    status = 'warning'; // Less than 2 hours remaining
  } else {
    status = 'normal';
  }
  
  return {
    display,
    status,
    remainingHours: Math.floor(remainingHours),
    remainingMinutes,
    isOverdue: false
  };
}

/**
 * Get CSS classes for TAT display based on status
 */
export function getTATStyleClasses(tatResult: TATResult): string {
  switch (tatResult.status) {
    case 'overdue':
      return 'text-red-600 font-bold animate-pulse';
    case 'warning':
      return 'text-orange-600 font-bold';
    case 'normal':
    default:
      return 'text-blue-600 font-medium';
  }
}

/**
 * Format TAT for display with appropriate styling
 */
export function formatTATDisplay(submittedAt: string | Date, tatHours: number = 24): {
  display: string;
  className: string;
  status: 'normal' | 'warning' | 'overdue';
} {
  const tatResult = calculateRealTimeTAT(submittedAt, tatHours);
  const className = getTATStyleClasses(tatResult);
  
  return {
    display: tatResult.display,
    className,
    status: tatResult.status
  };
}

/**
 * Hook to provide real-time TAT updates
 */
export function useRealTimeTAT(submittedAt: string | Date, tatHours: number = 24) {
  const [tatResult, setTatResult] = React.useState<TATResult>(() => 
    calculateRealTimeTAT(submittedAt, tatHours)
  );
  
  React.useEffect(() => {
    // Update TAT immediately
    setTatResult(calculateRealTimeTAT(submittedAt, tatHours));
    
    // Set up interval to update every minute
    const interval = setInterval(() => {
      setTatResult(calculateRealTimeTAT(submittedAt, tatHours));
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [submittedAt, tatHours]);
  
  return {
    ...tatResult,
    className: getTATStyleClasses(tatResult)
  };
}

// For React import
import * as React from 'react';