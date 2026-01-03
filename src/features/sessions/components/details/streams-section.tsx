'use client';

import { useState, useCallback } from 'react';
import { StreamChart } from './stream-chart';
import { STREAM_CONFIGS } from '@/lib/utils/streams';
import { useStreamData } from '../../hooks/details/use-stream-data';
import { CHART_DISPLAY_ORDER } from '@/lib/constants/stream-charts';

interface StreamsSectionProps {
  streams: unknown;
}

/**
 * Section displaying all available stream charts for an activity with synchronized tooltips
 */
export function StreamsSection({ streams }: StreamsSectionProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const { validatedStreams, availableStreams, chartData, paceDomain } = useStreamData(streams);

  const handleMouseMove = useCallback((index: number | null) => {
    setActiveIndex(index);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  if (!validatedStreams || availableStreams.length === 0) {
    return null;
  }

  const streamsToShow = CHART_DISPLAY_ORDER.filter((key) => availableStreams.includes(key));

  return (
    <div className="space-y-6">
      {streamsToShow.map((streamKey) => {
        const config = STREAM_CONFIGS[streamKey];
        const data = chartData[streamKey as keyof typeof chartData] || [];
        
        if (!config || data.length === 0) return null;

        const chartConfig = streamKey === 'pace' && paceDomain
          ? { ...config, domain: paceDomain as [number, number] }
          : config;

        return (
          <div 
            key={streamKey}
            className="p-4 rounded-xl bg-muted/20 border border-border/50"
          >
            <StreamChart 
              data={data} 
              config={chartConfig}
              activeIndex={activeIndex}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          </div>
        );
      })}
    </div>
  );
}
