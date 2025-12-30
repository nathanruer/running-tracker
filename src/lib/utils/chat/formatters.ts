/**
 * Formats a duration in minutes to a readable format
 * @param minutes - Duration in minutes
 * @returns Formatted string (e.g., "1h30", "45 min")
 */
export function formatDurationChat(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}
