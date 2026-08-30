/** Cadence is stored per leg (rpm, as reported by the watch); runners read steps per minute. */
export function legCadenceToSpm(legCadence: number): number {
  return legCadence * 2;
}

export function formatCadence(legCadence: number): string {
  return Math.round(legCadenceToSpm(legCadence)).toString();
}

export function formatCadenceWithUnit(legCadence: number): string {
  return `${formatCadence(legCadence)} ppm`;
}
