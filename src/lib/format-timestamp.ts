/**
 * Smart timestamp formatting per Ryan's spec:
 * - Same day: Show time only (e.g., "2:43 PM")
 * - Previous day+: Show date only (e.g., "Feb 4")
 * - Hover tooltip: Full date + time (e.g., "February 4, 2026 at 2:43 PM")
 */

export interface FormattedTimestamp {
  /** Display text - time only for today, date only for older */
  display: string;
  /** Full date + time for tooltip on hover */
  tooltip: string;
}

/**
 * Format a timestamp (unix ms or ISO string) according to Ryan's display rules
 */
export function formatTimestamp(timestamp: number | string): FormattedTimestamp {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
  const now = new Date();
  
  // Check if same day (comparing date strings handles timezone correctly)
  const isToday = date.toDateString() === now.toDateString();
  
  // Display: time only for today, date only for older
  const display = isToday
    ? date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })
    : date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
  
  // Tooltip: full date + time
  const tooltip = date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  
  return { display, tooltip };
}
