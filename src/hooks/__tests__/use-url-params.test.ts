import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUrlParams } from '../use-url-params';

const mockReplaceState = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', {
    value: { search: '', pathname: '/test' },
    writable: true,
  });
  window.history.replaceState = mockReplaceState;
});

describe('useUrlParams', () => {
  describe('initialization', () => {
    it('should return default values when URL has no params', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
          count: { key: 'count', defaultValue: '0' },
        })
      );
      expect(result.current.params).toEqual({ name: '', count: '0' });
    });

    it('should read values from URL', () => {
      window.location.search = '?name=hello&count=5';
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
          count: { key: 'count', defaultValue: '0' },
        })
      );
      expect(result.current.params).toEqual({ name: 'hello', count: '5' });
    });

    it('should use default for missing URL params', () => {
      window.location.search = '?name=hello';
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
          count: { key: 'count', defaultValue: '0' },
        })
      );
      expect(result.current.params).toEqual({ name: 'hello', count: '0' });
    });

    it('should honor initialValues when provided', () => {
      window.location.search = '?name=hello';
      const { result } = renderHook(() =>
        useUrlParams(
          {
            name: { key: 'name', defaultValue: '' },
          },
          { initialValues: { name: 'server' } }
        )
      );
      expect(result.current.params).toEqual({ name: 'server' });
    });
  });

  describe('validation', () => {
    it('should validate URL values and use valid ones', () => {
      window.location.search = '?period=week';
      const { result } = renderHook(() =>
        useUrlParams({
          period: {
            key: 'period',
            defaultValue: 'all',
            validate: (raw) => (['all', 'week', 'month'].includes(raw) ? raw : null),
          },
        })
      );
      expect(result.current.params.period).toBe('week');
    });

    it('should fall back to default for invalid values', () => {
      window.location.search = '?period=invalid';
      const { result } = renderHook(() =>
        useUrlParams({
          period: {
            key: 'period',
            defaultValue: 'all',
            validate: (raw) => (['all', 'week', 'month'].includes(raw) ? raw : null),
          },
        })
      );
      expect(result.current.params.period).toBe('all');
    });
  });

  describe('setParam', () => {
    it('should update a single param', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      act(() => result.current.setParam('name', 'test'));
      expect(result.current.params.name).toBe('test');
    });

    it('should sync to URL', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      act(() => result.current.setParam('name', 'test'));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toContain('name=test');
    });

    it('should not trigger re-render if value is unchanged', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: 'initial' },
        })
      );
      const paramsBefore = result.current.params;
      act(() => result.current.setParam('name', 'initial'));
      expect(result.current.params).toBe(paramsBefore);
    });
  });

  describe('setParams', () => {
    it('should update multiple params at once', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
          count: { key: 'count', defaultValue: '0' },
        })
      );
      act(() => result.current.setParams({ name: 'hello', count: '5' }));
      expect(result.current.params).toEqual({ name: 'hello', count: '5' });
    });

    it('should produce a single URL update for batch changes', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          a: { key: 'a', defaultValue: '' },
          b: { key: 'b', defaultValue: '' },
        })
      );
      mockReplaceState.mockClear();
      act(() => result.current.setParams({ a: 'x', b: 'y' }));
      const urlCalls = mockReplaceState.mock.calls.filter((c) => c[2]?.includes('a=x'));
      expect(urlCalls.length).toBe(1);
    });

    it('should not trigger re-render if no values changed', () => {
      window.location.search = '?name=hello';
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      const paramsBefore = result.current.params;
      act(() => result.current.setParams({ name: 'hello' }));
      expect(result.current.params).toBe(paramsBefore);
    });
  });

  describe('URL building', () => {
    it('should omit default values from URL', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
          type: { key: 'type', defaultValue: 'all' },
        })
      );
      act(() => result.current.setParam('type', 'all'));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toBe('/test');
    });

    it('should produce clean URL when all values are defaults', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      act(() => result.current.setParam('name', ''));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toBe('/test');
    });

    it('should use custom serialize function', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          items: {
            key: 'items',
            defaultValue: '',
            serialize: (v) => String(v).toUpperCase(),
          },
        })
      );
      act(() => result.current.setParam('items', 'hello'));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toContain('items=HELLO');
    });

    it('should preserve Next.js history state', () => {
      const mockState = { __NA: true };
      Object.defineProperty(window.history, 'state', { value: mockState, writable: true });
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      act(() => result.current.setParam('name', 'test'));
      expect(mockReplaceState.mock.calls.at(-1)?.[0]).toBe(mockState);
    });
  });

  describe('key mapping', () => {
    it('should map internal names to URL keys', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          dateRange: { key: 'range', defaultValue: 'all' },
        })
      );
      act(() => result.current.setParam('dateRange', '4weeks'));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      expect(lastCall?.[2]).toContain('range=4weeks');
      expect(lastCall?.[2]).not.toContain('dateRange');
    });

    it('should read URL keys into internal names', () => {
      window.location.search = '?range=4weeks';
      const { result } = renderHook(() =>
        useUrlParams({
          dateRange: { key: 'range', defaultValue: 'all' },
        })
      );
      expect(result.current.params.dateRange).toBe('4weeks');
    });
  });

  describe('foreign params preservation', () => {
    it('should preserve URL params not owned by this hook', () => {
      window.location.search = '?tab=analytics&other=keep';
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      act(() => result.current.setParam('name', 'test'));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      const url = lastCall?.[2] as string;
      expect(url).toContain('tab=analytics');
      expect(url).toContain('other=keep');
      expect(url).toContain('name=test');
    });

    it('should not destroy foreign params when setting defaults', () => {
      window.location.search = '?tab=analytics';
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      act(() => result.current.setParam('name', ''));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      const url = lastCall?.[2] as string;
      expect(url).toContain('tab=analytics');
    });

    it('should only remove its own keys when resetting to defaults', () => {
      window.location.search = '?tab=analytics&name=hello&range=4weeks';
      const { result } = renderHook(() =>
        useUrlParams({
          name: { key: 'name', defaultValue: '' },
        })
      );
      act(() => result.current.setParam('name', ''));
      const lastCall = mockReplaceState.mock.calls.at(-1);
      const url = lastCall?.[2] as string;
      expect(url).toContain('tab=analytics');
      expect(url).toContain('range=4weeks');
      expect(url).not.toContain('name=');
    });
  });
});
