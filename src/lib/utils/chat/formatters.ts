/**
 * Formate une durée en minutes en format lisible
 * @param minutes - Durée en minutes
 * @returns Chaîne formatée (ex: "1h30", "45 min")
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${m.toString().padStart(2, '0')}`;
}
