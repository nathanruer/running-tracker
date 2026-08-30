const DAY_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?$/;
const EXPLICIT_OFFSET = /(?:[zZ]|[+-]\d{2}:?\d{2})$/;

export function isDayOnly(value: string): boolean {
  return DAY_ONLY.test(value.trim());
}

export function hasExplicitOffset(value: string): boolean {
  return EXPLICIT_OFFSET.test(value.trim());
}

function zoneOffsetMs(instantMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const wall = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return wall - Math.floor(instantMs / 1000) * 1000;
}

function wallToInstant(wallUtcMs: number, timeZone: string): Date {
  const guess = wallUtcMs - zoneOffsetMs(wallUtcMs, timeZone);
  return new Date(wallUtcMs - zoneOffsetMs(guess, timeZone));
}

/** Instant of local midnight for a `YYYY-MM-DD` civil day in the given zone. */
export function zonedDayStart(day: string, timeZone: string): Date {
  const [year, month, dayOfMonth] = day.trim().split('-').map(Number);
  return wallToInstant(Date.UTC(year, month - 1, dayOfMonth), timeZone);
}

/**
 * Instant for a wall-clock timestamp without offset (`YYYY-MM-DDTHH:MM[:SS]`) in the given zone.
 * Returns null when the value is not a bare wall-clock timestamp.
 */
export function zonedWallTime(value: string, timeZone: string): Date | null {
  const match = WALL_TIME.exec(value.trim());
  if (!match) return null;
  const [, year, month, day, hour, minute, second] = match;
  return wallToInstant(
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second ?? 0)),
    timeZone
  );
}

/** Civil day (`YYYY-MM-DD`) of an instant in the given zone. */
export function civilDayInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
