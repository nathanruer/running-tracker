import { renderHook, act } from '@testing-library/react';
import { useDateRangeFilter } from '../use-date-range-filter';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

describe('useDateRangeFilter', () => {
    beforeAll(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterAll(() => {
        vi.useRealTimers();
    });

    const items = [
        { id: 1, date: '2024-01-01T10:00:00Z' }, // Today
        { id: 2, date: '2023-12-25T10:00:00Z' }, // 7 days ago (inside 2 weeks)
        { id: 3, date: '2023-12-01T10:00:00Z' }, // 31 days ago (outside 4 weeks)
        { id: 4, date: '2023-10-01T10:00:00Z' }, // 92 days ago (outside 12 weeks: 12*7 = 84 days)
    ];

    it('should return all items by default', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));
        expect(result.current.filteredItems).toHaveLength(4);
    });

    it('should filter 2 weeks', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));
        
        act(() => {
            result.current.setDateRange('2weeks');
        });

        expect(result.current.filteredItems).toHaveLength(2);
        expect(result.current.filteredItems.map(i => i.id)).toEqual(expect.arrayContaining([1, 2]));
    });

    it('should filter 4 weeks', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));
        
        act(() => {
            result.current.setDateRange('4weeks');
        });

        expect(result.current.filteredItems).toHaveLength(2);
        expect(result.current.filteredItems.map(i => i.id)).toEqual(expect.arrayContaining([1, 2]));
    });

    it('should filter 12 weeks', () => {
         const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('12weeks');
        });

        expect(result.current.filteredItems).toHaveLength(3);
        expect(result.current.filteredItems.map(i => i.id)).toEqual(expect.arrayContaining([1, 2, 3]));
    });

    it('should return error when custom date range is less than 14 days', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('custom');
            result.current.setCustomStartDate('2024-01-01');
            result.current.setCustomEndDate('2024-01-10'); // Only 9 days
        });

        expect(result.current.dateError).toBe("La plage doit être d'au moins 2 semaines (14 jours)");
    });

    it('should filter out items when custom date range is less than 14 days', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('custom');
            result.current.setCustomStartDate('2024-01-01');
            result.current.setCustomEndDate('2024-01-05'); // Less than 14 days
        });

        expect(result.current.filteredItems).toHaveLength(0);
    });

    it('should filter by custom date range when range is valid (14+ days)', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('custom');
            result.current.setCustomStartDate('2023-12-01');
            result.current.setCustomEndDate('2024-01-01'); // 31 days
        });

        // Items in range [2023-12-01, 2024-01-01]: id 1 (2024-01-01), id 2 (2023-12-25), id 3 (2023-12-01)
        expect(result.current.filteredItems).toHaveLength(3);
        expect(result.current.filteredItems.map(i => i.id)).toEqual(expect.arrayContaining([1, 2, 3]));
        expect(result.current.dateError).toBe('');
    });

    it('should filter only by start date when end date is not set', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('custom');
            result.current.setCustomStartDate('2023-12-20');
            result.current.setCustomEndDate(''); // No end date
        });

        // Items with dates >= 2023-12-20: id 1 (2024-01-01) and id 2 (2023-12-25)
        expect(result.current.filteredItems).toHaveLength(2);
        expect(result.current.filteredItems.map(i => i.id)).toEqual(expect.arrayContaining([1, 2]));
    });

    it('should filter only by end date when start date is not set', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('custom');
            result.current.setCustomStartDate(''); // No start date
            result.current.setCustomEndDate('2023-10-15');
        });

        // Items with dates <= 2023-10-15: id 4 (2023-10-01)
        expect(result.current.filteredItems).toHaveLength(1);
        expect(result.current.filteredItems.map(i => i.id)).toEqual(expect.arrayContaining([4]));
    });

    it('should return all items when custom range has no dates set', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('custom');
        });

        expect(result.current.filteredItems).toHaveLength(4);
    });

    it('should reset custom dates when resetCustomDates is called', () => {
        const { result } = renderHook(() => useDateRangeFilter(items));

        act(() => {
            result.current.setDateRange('custom');
            result.current.setCustomStartDate('2023-12-01');
            result.current.setCustomEndDate('2024-01-15');
        });

        expect(result.current.customStartDate).toBe('2023-12-01');
        expect(result.current.customEndDate).toBe('2024-01-15');

        act(() => {
            result.current.resetCustomDates();
        });

        expect(result.current.customStartDate).toBe('');
        expect(result.current.customEndDate).toBe('');
    });

    it('should use default range when provided', () => {
        const { result } = renderHook(() => useDateRangeFilter(items, '2weeks'));

        expect(result.current.dateRange).toBe('2weeks');
        expect(result.current.filteredItems).toHaveLength(2);
    });
});
