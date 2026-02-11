import type { TrainingSession } from '@/lib/types';
import { getSessionDistanceKm, getSessionDurationSeconds, getSessionEffectiveDate } from '@/lib/domain/sessions/session-selectors';
import { getISOWeekEnd, getISOWeekKey, getISOWeekStart, MONTHS_SHORT_FR } from '@/lib/utils/date';
import {
  addDays,
  diffDaysInclusive,
  endOfDay,
  parseDateInput,
  startOfDay,
} from './date-range';
import type { ChartGranularity } from './date-range';

export interface BucketChartDataPoint {
  label: string;
  bucketKey: string;
  km: number;
  plannedKm: number;
  plannedDurationSeconds: number;
  totalWithPlanned: number;
  totalDurationWithPlanned: number;
  completedCount: number;
  plannedCount: number;
  changePercent: number | null;
  changePercentWithPlanned: number | null;
  changePercentDuration: number | null;
  changePercentDurationWithPlanned: number | null;
  diffKm: number | null;
  diffTotalWithPlanned: number | null;
  diffDurationSeconds: number | null;
  diffTotalDurationWithPlanned: number | null;
  isActive: boolean;
  start: Date;
  end: Date;
  isPartial: boolean;
  coverageRatio: number;
  coverageLabel: string;
  isCurrent: boolean;
  durationSeconds: number;
  avgHeartRate: number | null;
  avgPaceSeconds: number | null;
  trainingWeek: number | null;
}

export interface BucketedStats {
  totalKm: number;
  totalSessions: number;
  totalDurationSeconds: number;
  averageKmPerBucket: number;
  averageDurationPerBucket: number;
  averageSessionsPerBucket: number;
  averageKmPerActiveBucket: number;
  activeBucketsCount: number;
  totalBuckets: number;
  chartData: BucketChartDataPoint[];
}

function formatWeekLabel(start: Date, end: Date, includeYear: boolean): string {
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startMonth = MONTHS_SHORT_FR[start.getMonth()];
  const endMonth = MONTHS_SHORT_FR[end.getMonth()];
  const yearSuffix = includeYear ? ` ${end.getFullYear()}` : '';

  if (start.getMonth() === end.getMonth()) {
    return `${startDay}-${endDay} ${startMonth}${yearSuffix}`;
  }
  return `${startDay} ${startMonth} - ${endDay} ${endMonth}${yearSuffix}`;
}

function formatDayLabel(date: Date, includeYear: boolean): string {
  const base = `${date.getDate()} ${MONTHS_SHORT_FR[date.getMonth()]}`;
  return includeYear ? `${base} ${date.getFullYear()}` : base;
}

function formatMonthLabel(date: Date, includeYear: boolean): string {
  const base = `${MONTHS_SHORT_FR[date.getMonth()]}`;
  return includeYear ? `${base} ${date.getFullYear()}` : base;
}

function getBucketStart(date: Date, granularity: ChartGranularity): Date {
  if (granularity === 'day') {
    return startOfDay(date);
  }
  if (granularity === 'month') {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }
  return getISOWeekStart(date);
}

function getBucketEnd(start: Date, granularity: ChartGranularity): Date {
  if (granularity === 'day') {
    return endOfDay(start);
  }
  if (granularity === 'month') {
    const lastDay = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return endOfDay(lastDay);
  }
  return getISOWeekEnd(start);
}

function getNextBucketStart(start: Date, granularity: ChartGranularity): Date {
  if (granularity === 'day') {
    return addDays(start, 1);
  }
  if (granularity === 'month') {
    return new Date(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0);
  }
  return addDays(start, 7);
}

function getBucketKey(start: Date, granularity: ChartGranularity): string {
  if (granularity === 'day') {
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    const day = String(start.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (granularity === 'month') {
    const year = start.getFullYear();
    const month = String(start.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
  return getISOWeekKey(start);
}

function formatBucketLabel(start: Date, end: Date, granularity: ChartGranularity, includeYear: boolean): string {
  if (granularity === 'day') {
    return formatDayLabel(start, includeYear);
  }
  if (granularity === 'month') {
    return formatMonthLabel(start, includeYear);
  }
  return formatWeekLabel(start, end, includeYear);
}

function generateBucketStarts(rangeStart: Date, rangeEnd: Date, granularity: ChartGranularity): Date[] {
  const starts: Date[] = [];
  let cursor = getBucketStart(rangeStart, granularity);
  while (cursor <= rangeEnd) {
    starts.push(cursor);
    cursor = getNextBucketStart(cursor, granularity);
  }
  return starts;
}

export function calculateBucketedStats(params: {
  completedSessions: TrainingSession[];
  plannedSessions: TrainingSession[];
  rangeStart: Date | null;
  rangeEnd: Date | null;
  granularity: ChartGranularity;
  includePlannedInOpenBucket?: boolean;
}): BucketedStats {
  const { completedSessions, plannedSessions, rangeStart, rangeEnd, granularity, includePlannedInOpenBucket = false } = params;
  if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) {
    return {
      totalKm: 0,
      totalSessions: 0,
      totalDurationSeconds: 0,
      averageKmPerBucket: 0,
      averageDurationPerBucket: 0,
      averageSessionsPerBucket: 0,
      averageKmPerActiveBucket: 0,
      activeBucketsCount: 0,
      totalBuckets: 0,
      chartData: [],
    };
  }

  const completedList = completedSessions ?? [];
  const plannedList = plannedSessions ?? [];
  const bucketStarts = generateBucketStarts(rangeStart, rangeEnd, granularity);
  const includeYear = rangeStart.getFullYear() !== rangeEnd.getFullYear();

  const buckets = new Map<string, {
    completedKm: number;
    plannedKm: number;
    completedCount: number;
    plannedCount: number;
    durationSeconds: number;
    plannedDurationSeconds: number;
    hrSum: number;
    hrCount: number;
    start: Date;
    end: Date;
  }>();

  bucketStarts.forEach((start) => {
    const end = getBucketEnd(start, granularity);
    buckets.set(getBucketKey(start, granularity), {
      completedKm: 0,
      plannedKm: 0,
      completedCount: 0,
      plannedCount: 0,
      durationSeconds: 0,
      plannedDurationSeconds: 0,
      hrSum: 0,
      hrCount: 0,
      start,
      end,
    });
  });

  let totalKmAccumulator = 0;
  let totalSessionsAccumulator = 0;
  let totalDurationAccumulator = 0;

  const currentBucketStart = includePlannedInOpenBucket ? getBucketStart(rangeEnd, granularity) : null;
  const currentBucketEnd = currentBucketStart ? getBucketEnd(currentBucketStart, granularity) : null;

  completedList.forEach((session) => {
    const effectiveDate = getSessionEffectiveDate(session);
    const sessionDate = parseDateInput(effectiveDate);
    if (!sessionDate) return;
    const withinRange = sessionDate >= rangeStart && sessionDate <= rangeEnd;
    const withinOpenBucket = Boolean(
      currentBucketStart &&
      currentBucketEnd &&
      sessionDate >= currentBucketStart &&
      sessionDate <= currentBucketEnd
    );
    if (!withinRange && !withinOpenBucket) return;

    const bucketStart = getBucketStart(sessionDate, granularity);
    const key = getBucketKey(bucketStart, granularity);
    const bucket = buckets.get(key);
    if (!bucket) return;

    const distance = getSessionDistanceKm(session);
    bucket.completedKm += distance;
    bucket.completedCount += 1;
    totalKmAccumulator += distance;
    totalSessionsAccumulator += 1;

    const durationSec = getSessionDurationSeconds(session);
    bucket.durationSeconds += durationSec;
    totalDurationAccumulator += durationSec;

    if (session.avgHeartRate) {
      bucket.hrSum += session.avgHeartRate;
      bucket.hrCount += 1;
    }
  });

  plannedList.forEach((session) => {
    const effectiveDate = getSessionEffectiveDate(session);
    const sessionDate = parseDateInput(effectiveDate);
    if (!sessionDate) return;
    const withinRange = sessionDate >= rangeStart && sessionDate <= rangeEnd;
    const withinOpenBucket = Boolean(
      currentBucketStart &&
      currentBucketEnd &&
      sessionDate >= rangeStart &&
      sessionDate >= currentBucketStart &&
      sessionDate <= currentBucketEnd
    );
    if (!withinRange && !withinOpenBucket) return;

    const bucketStart = getBucketStart(sessionDate, granularity);
    const key = getBucketKey(bucketStart, granularity);
    const bucket = buckets.get(key);
    if (!bucket) return;

    const distance = getSessionDistanceKm(session);
    bucket.plannedKm += distance;
    bucket.plannedCount += 1;
    bucket.plannedDurationSeconds += getSessionDurationSeconds(session);
  });

  const chartData: BucketChartDataPoint[] = bucketStarts.map((start) => {
    const key = getBucketKey(start, granularity);
    const bucket = buckets.get(key);
    const end = bucket?.end ?? getBucketEnd(start, granularity);
    const completedKm = Number((bucket?.completedKm ?? 0).toFixed(1));
    const plannedKm = Number((bucket?.plannedKm ?? 0).toFixed(1));
    const totalWithPlanned = Number((completedKm + plannedKm).toFixed(1));
    const completedCount = bucket?.completedCount ?? 0;
    const plannedCount = bucket?.plannedCount ?? 0;
    const durationSeconds = bucket?.durationSeconds ?? 0;
    const plannedDurationSeconds = bucket?.plannedDurationSeconds ?? 0;
    const totalDurationWithPlanned = durationSeconds + plannedDurationSeconds;
    const hrSum = bucket?.hrSum ?? 0;
    const hrCount = bucket?.hrCount ?? 0;

    const bucketDays = diffDaysInclusive(start, end);
    const overlapStart = rangeStart > start ? rangeStart : start;
    const overlapEnd = rangeEnd < end ? rangeEnd : end;
    const coverageDays = overlapStart > overlapEnd ? 0 : diffDaysInclusive(overlapStart, overlapEnd);
    const coverageRatio = bucketDays > 0 ? coverageDays / bucketDays : 0;
    const isPartial = coverageDays > 0 && coverageDays < bucketDays;
    const coverageLabel = `${coverageDays}/${bucketDays} j`;

    const avgHeartRate = hrCount > 0 ? Math.round(hrSum / hrCount) : null;
    const avgPaceSeconds = completedKm > 0 ? Math.round(durationSeconds / completedKm) : null;
    const now = new Date();
    const isCurrent = now >= start && now < end;

    return {
      label: formatBucketLabel(start, end, granularity, includeYear),
      bucketKey: key,
      km: completedKm,
      plannedKm,
      plannedDurationSeconds,
      totalWithPlanned,
      totalDurationWithPlanned,
      completedCount,
      plannedCount,
      changePercent: null,
      changePercentWithPlanned: null,
      changePercentDuration: null,
      changePercentDurationWithPlanned: null,
      diffKm: null,
      diffTotalWithPlanned: null,
      diffDurationSeconds: null,
      diffTotalDurationWithPlanned: null,
      isActive: completedKm > 0 || plannedKm > 0,
      start,
      end,
      isPartial,
      coverageRatio,
      coverageLabel,
      isCurrent,
      durationSeconds,
      avgHeartRate,
      avgPaceSeconds,
      trainingWeek: null,
    };
  });

  let trainingWeekCounter = 0;
  if (granularity === 'week') {
    chartData.forEach((data) => {
      if (data.isActive) {
        trainingWeekCounter += 1;
        data.trainingWeek = trainingWeekCounter;
      } else {
        data.trainingWeek = null;
      }
    });
  }

  let previousActiveKm: number | null = null;
  let previousActiveTotalWithPlanned: number | null = null;
  let previousActiveDuration: number | null = null;
  let previousActiveTotalDurationWithPlanned: number | null = null;

  chartData.forEach((data) => {
    if (!data.isActive) return;

    if (previousActiveKm !== null && previousActiveKm > 0) {
      if (data.km > 0) {
        data.changePercent = Number((((data.km - previousActiveKm) / previousActiveKm) * 100).toFixed(1));
        data.diffKm = Number((data.km - previousActiveKm).toFixed(1));
      }
    }

    if (previousActiveTotalWithPlanned !== null && previousActiveTotalWithPlanned > 0) {
      if (data.totalWithPlanned > 0) {
        data.changePercentWithPlanned = Number((((data.totalWithPlanned - previousActiveTotalWithPlanned) / previousActiveTotalWithPlanned) * 100).toFixed(1));
        data.diffTotalWithPlanned = Number((data.totalWithPlanned - previousActiveTotalWithPlanned).toFixed(1));
      }
    }

    if (previousActiveTotalDurationWithPlanned !== null && previousActiveTotalDurationWithPlanned > 0) {
      if (data.totalDurationWithPlanned > 0) {
        data.changePercentDurationWithPlanned = Number((((data.totalDurationWithPlanned - previousActiveTotalDurationWithPlanned) / previousActiveTotalDurationWithPlanned) * 100).toFixed(1));
        data.diffTotalDurationWithPlanned = data.totalDurationWithPlanned - previousActiveTotalDurationWithPlanned;
      }
    }

    if (previousActiveDuration !== null && previousActiveDuration > 0) {
      if (data.durationSeconds > 0) {
        data.changePercentDuration = Number((((data.durationSeconds - previousActiveDuration) / previousActiveDuration) * 100).toFixed(1));
        data.diffDurationSeconds = data.durationSeconds - previousActiveDuration;
      }
    }

    if (data.km > 0) previousActiveKm = data.km;
    if (data.totalWithPlanned > 0) previousActiveTotalWithPlanned = data.totalWithPlanned;
    if (data.durationSeconds > 0) previousActiveDuration = data.durationSeconds;
    if (data.totalDurationWithPlanned > 0) previousActiveTotalDurationWithPlanned = data.totalDurationWithPlanned;
  });

  const totalBuckets = chartData.length;
  const activeBucketsCount = chartData.filter((data) => data.km > 0).length;
  const totalKm = Number(totalKmAccumulator.toFixed(1));
  const totalSessions = totalSessionsAccumulator;
  const totalDurationSeconds = totalDurationAccumulator;

  return {
    totalKm,
    totalSessions,
    totalDurationSeconds,
    averageKmPerBucket: totalBuckets > 0 ? totalKm / totalBuckets : 0,
    averageDurationPerBucket: totalBuckets > 0 ? totalDurationSeconds / totalBuckets : 0,
    averageSessionsPerBucket: totalBuckets > 0 ? totalSessions / totalBuckets : 0,
    averageKmPerActiveBucket: activeBucketsCount > 0 ? totalKm / activeBucketsCount : 0,
    activeBucketsCount,
    totalBuckets,
    chartData,
  };
}
