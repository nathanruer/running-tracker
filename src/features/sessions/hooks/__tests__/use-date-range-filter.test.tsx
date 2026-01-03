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
        
        // 12 weeks = 84 days.
        // Item 4 is 92 days ago. Excluded.
        expect(result.current.filteredItems).toHaveLength(3);
        expect(result.current.filteredItems.map(i => i.id)).toEqual(expect.arrayContaining([1, 2, 3]));
    });
});
