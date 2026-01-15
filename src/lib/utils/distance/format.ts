/**
 * Formats distance with appropriate unit
 * @param meters - Distance in meters
 * @param unit - Target unit ('km' or 'm')
 * @param decimals - Number of decimal places (default: 1 for km, 0 for m)
 * @returns Formatted distance string with unit
 * @example formatDistance(5432) // "5.4 km"
 * @example formatDistance(543, 'm') // "543 m"
 */
export function formatDistance(
  meters: number,
  unit: 'km' | 'm' = 'km',
  decimals?: number
): string {
  if (unit === 'km') {
    const km = meters / 1000;
    const dec = decimals !== undefined ? decimals : 1;
    return `${km.toFixed(dec)} km`;
  }
  return `${Math.round(meters)} m`;
}
