export const STREAM_CHART_CONSTANTS = {
  PACE_DOMAIN_MULTIPLIER: 2.2,
  CHART_PADDING_PERCENT: 0.1,
  CHART_HEIGHT: 140,
  CHART_MARGINS: {
    LEFT: 40,
    RIGHT: 10,
    TOP: 5,
    BOTTOM: 35,
  },
} as const;

export const CHART_DISPLAY_ORDER = ['altitude', 'pace', 'heartrate', 'cadence'] as const;
export type ChartKey = typeof CHART_DISPLAY_ORDER[number];
