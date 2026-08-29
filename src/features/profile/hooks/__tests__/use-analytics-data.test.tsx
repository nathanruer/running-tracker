import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsData } from '../use-analytics-data';
import * as sessionsApi from '@/lib/services/api-client/sessions';

vi.mock('@/lib/services/api-client/sessions', () => ({
  getSessionsAnalytics: vi.fn(),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

const filters = { dateRange: 'all', granularity: 'week', customStartDate: '', customEndDate: '' } as const;

describe('useAnalyticsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns server-computed stats and range label', async () => {
    vi.mocked(sessionsApi.getSessionsAnalytics).mockResolvedValue({
      customDateError: '',
      rangeLabel: '1 jan → 1 fév',
      stats: {
        totalKm: 120,
        totalSessions: 12,
        totalDurationSeconds: 3600,
        averageKmPerBucket: 30,
        averageDurationPerBucket: 900,
        averageSessionsPerBucket: 3,
        averageKmPerActiveBucket: 30,
        activeBucketsCount: 4,
        totalBuckets: 4,
        chartData: [],
      },
    });

    const { result } = renderHook(() => useAnalyticsData(filters), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.stats.totalKm).toBe(120);
    });
    expect(result.current.rangeLabel).toBe('1 jan → 1 fév');
    expect(sessionsApi.getSessionsAnalytics).toHaveBeenCalledWith(filters);
  });

  it('falls back to empty stats before data arrives', () => {
    vi.mocked(sessionsApi.getSessionsAnalytics).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useAnalyticsData(filters), { wrapper: createWrapper() });

    expect(result.current.stats.totalKm).toBe(0);
    expect(result.current.stats.chartData).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });
});
