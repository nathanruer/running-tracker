import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUrlParams } from '../use-url-params';

const mockReplace = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

beforeEach(() => {
  vi.clearAllMocks();
  currentSearch = '';
  Object.defineProperty(window, 'location', {
    value: { search: '', pathname: '/test' },
    writable: true,
  });
});

function setUrl(search: string) {
  currentSearch = search;
  window.location.search = search;
}

const defs = {
  name: { key: 'name', defaultValue: '' },
  count: { key: 'count', defaultValue: '0' },
};

describe('useUrlParams', () => {
  describe('reading from the URL', () => {
    it('returns default values when URL has no params', () => {
      const { result } = renderHook(() => useUrlParams(defs));
      expect(result.current.params).toEqual({ name: '', count: '0' });
    });

    it('reads values from the URL', () => {
      setUrl('?name=hello&count=5');
      const { result } = renderHook(() => useUrlParams(defs));
      expect(result.current.params).toEqual({ name: 'hello', count: '5' });
    });

    it('uses defaults for missing params', () => {
      setUrl('?name=hello');
      const { result } = renderHook(() => useUrlParams(defs));
      expect(result.current.params).toEqual({ name: 'hello', count: '0' });
    });

    it('falls back to default when validation rejects the raw value', () => {
      setUrl('?mode=invalid');
      const { result } = renderHook(() =>
        useUrlParams({
          mode: {
            key: 'mode',
            defaultValue: 'list',
            validate: (raw) => (raw === 'grid' || raw === 'list' ? raw : null),
          },
        })
      );
      expect(result.current.params.mode).toBe('list');
    });

    it('keeps validated values', () => {
      setUrl('?mode=grid');
      const { result } = renderHook(() =>
        useUrlParams({
          mode: {
            key: 'mode',
            defaultValue: 'list',
            validate: (raw) => (raw === 'grid' || raw === 'list' ? raw : null),
          },
        })
      );
      expect(result.current.params.mode).toBe('grid');
    });
  });

  describe('writing to the URL', () => {
    it('replaces the URL with the new param', () => {
      const { result } = renderHook(() => useUrlParams(defs));

      act(() => {
        result.current.setParam('name', 'hello');
      });

      expect(mockReplace).toHaveBeenCalledWith('/test?name=hello', { scroll: false });
    });

    it('omits params equal to their default', () => {
      setUrl('?name=hello');
      const { result } = renderHook(() => useUrlParams(defs));

      act(() => {
        result.current.setParam('name', '');
      });

      expect(mockReplace).toHaveBeenCalledWith('/test', { scroll: false });
    });

    it('applies multiple updates atomically via setParams', () => {
      const { result } = renderHook(() => useUrlParams(defs));

      act(() => {
        result.current.setParams({ name: 'a', count: '2' });
      });

      expect(mockReplace).toHaveBeenCalledTimes(1);
      const url = mockReplace.mock.calls[0][0] as string;
      expect(url).toContain('name=a');
      expect(url).toContain('count=2');
    });

    it('preserves foreign query params it does not own', () => {
      setUrl('?other=keep&name=x');
      const { result } = renderHook(() => useUrlParams(defs));

      act(() => {
        result.current.setParam('name', 'y');
      });

      const url = mockReplace.mock.calls[0][0] as string;
      expect(url).toContain('other=keep');
      expect(url).toContain('name=y');
    });

    it('uses a custom serializer when provided', () => {
      const { result } = renderHook(() =>
        useUrlParams({
          flag: {
            key: 'flag',
            defaultValue: false as boolean,
            serialize: (v) => (v ? 'yes' : ''),
          },
        })
      );

      act(() => {
        result.current.setParam('flag', true);
      });

      expect(mockReplace).toHaveBeenCalledWith('/test?flag=yes', { scroll: false });
    });

    it('drops params whose serializer returns an empty string', () => {
      setUrl('?flag=yes');
      const { result } = renderHook(() =>
        useUrlParams({
          flag: {
            key: 'flag',
            defaultValue: false as boolean,
            validate: (raw) => raw === 'yes',
            serialize: (v) => (v ? 'yes' : ''),
          },
        })
      );

      act(() => {
        result.current.setParam('flag', false);
      });

      expect(mockReplace).toHaveBeenCalledWith('/test', { scroll: false });
    });
  });

  describe('URL as source of truth', () => {
    it('reflects new search params on rerender (back/forward navigation)', () => {
      const { result, rerender } = renderHook(() => useUrlParams(defs));
      expect(result.current.params.name).toBe('');

      setUrl('?name=from-history');
      rerender();

      expect(result.current.params.name).toBe('from-history');
    });
  });
});
