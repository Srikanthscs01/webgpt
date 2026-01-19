/**
 * Gets a date range for analytics queries
 */
export function getDateRange(range: string | number): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();
  
  // Parse range string like '7d', '30d', '90d', '1y'
  let days = 30; // default
  if (typeof range === 'number') {
    days = range;
  } else if (typeof range === 'string') {
    if (range.endsWith('d')) {
      days = parseInt(range);
    } else if (range.endsWith('y')) {
      days = parseInt(range) * 365;
    }
  }
  
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Formats a date for display
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0] || '';
}

