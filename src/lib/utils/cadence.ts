export function stravaCadenceToFull(halfCadence: number): number {
  return halfCadence * 2;
}

export function formatCadence(halfCadence: number): string {
  return Math.round(stravaCadenceToFull(halfCadence)).toString();
}

export function formatCadenceWithUnit(halfCadence: number): string {
  return `${formatCadence(halfCadence)} ppm`;
}
