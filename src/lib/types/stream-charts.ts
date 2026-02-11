/**
 * Stream chart types
 * 
 * Types for Strava stream data visualization
 */

/**
 * Generic data point for stream charts
 */
export interface StreamDataPoint {
  distance: number;
  time: number;
  value: number;
  formattedValue: string;
}

/**
 * Stream chart configuration
 */
export interface StreamChartConfig {
  key: string;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  formatValue: (value: number) => string;
  formatTooltip: (value: number) => string;
  curveType?: 'linear' | 'monotone';
  reversed?: boolean;
  domain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
}
