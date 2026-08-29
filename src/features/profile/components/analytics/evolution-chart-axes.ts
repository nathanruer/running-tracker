import type { BucketChartDataPoint } from '@/lib/domain/analytics/weekly-calculator';

export type YAxisConfig = {
  domain: [number, number];
  ticks: number[];
};

export function computeYAxisConfig(chartData: BucketChartDataPoint[]): YAxisConfig {
  if (chartData.length === 0) return { domain: [0, 50], ticks: [0, 25, 50] };

  const maxVal = Math.max(...chartData.map(d => (d.km || 0) + (d.plannedKm || 0)), 1);

  let niceMax = 10;
  let ticks = [0, 5, 10];

  if (maxVal <= 5) {
    niceMax = 5;
    ticks = [0, 1, 2, 3, 4, 5];
  } else if (maxVal <= 10) {
    niceMax = 10;
    ticks = [0, 2, 4, 6, 8, 10];
  } else if (maxVal <= 20) {
    niceMax = 20;
    ticks = [0, 5, 10, 15, 20];
  } else if (maxVal <= 40) {
    niceMax = 40;
    ticks = [0, 10, 20, 30, 40];
  } else if (maxVal <= 60) {
    niceMax = 60;
    ticks = [0, 15, 30, 45, 60];
  } else if (maxVal <= 100) {
    niceMax = 100;
    ticks = [0, 25, 50, 75, 100];
  } else if (maxVal <= 150) {
    niceMax = 150;
    ticks = [0, 50, 100, 150];
  } else {
    niceMax = Math.ceil((maxVal * 1.1) / 20) * 20;
    const step = niceMax / 4;
    ticks = [0, step, step * 2, step * 3, niceMax];
  }

  return { domain: [0, niceMax], ticks };
}

export function formatXAxisTick(
  value: string,
  index: number,
  chartData: BucketChartDataPoint[]
): string {
  if (!value) return '';
  const parts = value.split(/\s+/).filter((p: string) => !['-', '→', '–'].includes(p));

  if (parts.length >= 2) {
    const dayPart = parts[0].split('-')[0];
    const monthPart = parts[1].replace('.', '');

    const lastPart = parts[parts.length - 1];
    const yearPart = /^\d{4}$/.test(lastPart) ? lastPart : null;

    const isFirst = index === 0;
    const prevPoint = index > 0 ? chartData[index - 1] : null;
    const prevYear = prevPoint?.label?.split(/\s+/).pop();

    if ((isFirst || (yearPart && prevYear && yearPart !== prevYear)) && yearPart) {
      return `${dayPart} ${monthPart} ${yearPart}`;
    }
    return `${dayPart} ${monthPart}`;
  }
  return value;
}
