'use client';

import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { StreamDataPoint, StreamChartConfig } from '@/lib/types/stream-charts';
import { formatDuration } from '@/lib/utils/duration';
import { STREAM_CHART_CONSTANTS } from '@/lib/constants/stream-charts';

interface StreamChartProps {
  data: StreamDataPoint[];
  config: StreamChartConfig;
  activeIndex?: number | null;
  onMouseMove?: (index: number | null) => void;
  onMouseLeave?: () => void;
}

/**
 * Generic stream chart component with area fill, gradient, and synchronized hover
 */
export function StreamChart({
  data,
  config,
  activeIndex,
  onMouseMove,
  onMouseLeave,
}: StreamChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const pendingIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);

  const handleMouseLeave = useCallback(() => {
    pendingIndexRef.current = null;
    if (onMouseLeave) {
      onMouseLeave();
    }
  }, [onMouseLeave]);

  const dataIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d, i) => {
      map.set(`${d.distance}-${d.time}`, i);
    });
    return map;
  }, [data]);

  const CustomTooltip = useCallback((props: { active?: boolean; payload?: ReadonlyArray<{ payload: StreamDataPoint }> }) => {
    const { active, payload } = props;
    if (active && payload && payload.length > 0 && onMouseMove) {
      const dataPoint = payload[0].payload;
      const index = dataIndexMap.get(`${dataPoint.distance}-${dataPoint.time}`) ?? -1;
      if (index !== -1 && index !== pendingIndexRef.current) {
        pendingIndexRef.current = index;
        requestAnimationFrame(() => {
          if (pendingIndexRef.current !== null) {
            onMouseMove(pendingIndexRef.current);
          }
        });
      }
    }
    return null;
  }, [dataIndexMap, onMouseMove]);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height: STREAM_CHART_CONSTANTS.CHART_HEIGHT }}
      >
        Aucune donnée disponible
      </div>
    );
  }

  const values = data.map(d => d.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);

  const range = dataMax - dataMin || (dataMin === 0 ? 10 : dataMin * 0.1);
  const padding = range * STREAM_CHART_CONSTANTS.CHART_PADDING_PERCENT;

  let domainMin = dataMin - padding;
  let domainMax = dataMax + padding;

  if (config.domain) {
    if (typeof config.domain[0] === 'number') domainMin = config.domain[0];
    if (typeof config.domain[1] === 'number') domainMax = config.domain[1];
  } else {
    if (dataMin >= 0 && domainMin < 0) domainMin = 0;
  }

  const chartDomain = [domainMin, domainMax];

  const baseValue = config.reversed ? domainMax : undefined;

  const gradientY1 = config.reversed ? '1' : '0';
  const gradientY2 = config.reversed ? '0' : '1';

  const activePoint = activeIndex !== null && activeIndex !== undefined && activeIndex < data.length 
    ? data[activeIndex] 
    : null;

  const getOverlayPosition = () => {
    if (!activePoint || !dimensions || activeIndex === null || activeIndex === undefined) {
      return null;
    }

    const chartWidth = dimensions.width;
    const chartHeight = dimensions.height;

    const { LEFT, RIGHT, TOP, BOTTOM } = STREAM_CHART_CONSTANTS.CHART_MARGINS;

    const plotWidth = chartWidth - LEFT - RIGHT;
    const plotHeight = chartHeight - TOP - BOTTOM;

    const xRatio = data.length > 1 ? activeIndex / (data.length - 1) : 0;
    const x = LEFT + (xRatio * plotWidth);

    const valueRange = chartDomain[1] - chartDomain[0] || 1;
    const clampedValue = Math.max(chartDomain[0], Math.min(chartDomain[1], activePoint.value));
    const yRatio = (clampedValue - chartDomain[0]) / valueRange;

    if (config.reversed) {
       const yOffset = yRatio * plotHeight;
       return { x, y: TOP + yOffset, plotHeight: plotHeight + TOP };
    } else {
       const yOffset = (1 - yRatio) * plotHeight;
       return { x, y: TOP + yOffset, plotHeight: plotHeight + TOP };
    }
  };

  const position = getOverlayPosition();

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div 
          className="w-2.5 h-2.5 rounded-full" 
          style={{ backgroundColor: config.color }}
        />
        <span className="text-sm font-medium text-foreground">
          {config.label}
        </span>
      </div>

      <div
        ref={chartRef}
        className="w-full relative"
        style={{ height: STREAM_CHART_CONSTANTS.CHART_HEIGHT }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={config.gradientId} x1="0" y1={gradientY1} x2="0" y2={gradientY2}>
                <stop offset="0%" stopColor={config.color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="distance"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={(value) => `${value.toFixed(1)}`}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              dataKey="value"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              tickFormatter={config.formatValue}
              reversed={config.reversed}
              domain={chartDomain}
              width={40}
              tickCount={8}
              minTickGap={10}
              interval="preserveStartEnd"
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#${config.gradientId})`}
              dot={false}
              baseValue={baseValue}
            />
            <Tooltip cursor={false} content={CustomTooltip} />
          </AreaChart>
        </ResponsiveContainer>

        {activePoint && position && (
          <>
            <div 
              className="absolute top-0 w-px pointer-events-none"
              style={{
                left: position.x,
                height: '100%',
                backgroundColor: 'hsl(var(--foreground) / 0.3)',
              }}
            />
            
            <div 
              className="absolute pointer-events-none flex flex-col items-center z-20"
              style={{ 
                left: position.x,
                top: 0,
                transform: 'translateX(-50%)',
              }}
            >
              <div 
                className="px-2 py-1 rounded-t text-[10px] font-bold border-x border-t whitespace-nowrap w-full text-center"
                style={{ 
                  backgroundColor: 'hsl(var(--muted))',
                  borderColor: 'hsl(var(--border))',
                  color: 'hsl(var(--foreground))',
                }}
              >
                {formatDuration(activePoint.time)}
              </div>
              <div 
                className="px-2 py-1 rounded-b text-[11px] font-semibold border shadow-sm whitespace-nowrap min-w-[max-content]"
                style={{ 
                  backgroundColor: 'hsl(var(--background))',
                  borderColor: 'hsl(var(--border))',
                  color: config.color,
                  marginTop: -1,
                }}
              >
                {config.formatTooltip(activePoint.value)}
              </div>
            </div>
            
            <div 
              className="absolute pointer-events-none rounded-full border-2"
              style={{ 
                left: position.x,
                top: position.y,
                width: 8,
                height: 8,
                transform: 'translate(-50%, -50%)',
                backgroundColor: config.color,
                borderColor: 'hsl(var(--background))',
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
