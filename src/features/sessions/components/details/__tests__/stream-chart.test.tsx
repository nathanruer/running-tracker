import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamChart } from '../stream-chart';

let resizeCallback: ResizeObserverCallback | null = null;

class ResizeObserverMock {
  constructor(callback: ResizeObserverCallback) {
    resizeCallback = callback;
  }
  observe() {
    if (resizeCallback) {
      resizeCallback([{ contentRect: { width: 400, height: 200 } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
  }
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children, onMouseLeave }: { children: React.ReactNode; onMouseLeave?: () => void }) => (
    <svg data-testid="area-chart" onMouseLeave={onMouseLeave}>{children}</svg>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: ({ content }: { content?: (props: { active?: boolean; payload?: ReadonlyArray<{ payload: { time: number; distance: number; value: number } }> }) => React.ReactNode }) => {
    if (content) {
      content({
        active: true,
        payload: [{ payload: { time: 60, distance: 1, value: 110 } }],
      });
    }
    return <div data-testid="tooltip" />;
  },
}));

describe('StreamChart', () => {
  const data = [
    { time: 0, distance: 0, value: 100, formattedValue: '100' },
    { time: 60, distance: 1, value: 110, formattedValue: '110' },
  ];
  const config = {
    key: 'test',
    unit: 'units',
    color: 'red',
    label: 'Test Stream',
    formatValue: (v: number) => `${v}`,
    gradientId: 'grad',
    formatTooltip: (v: number) => `${v}`,
  };

  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders empty state when no data', () => {
    render(<StreamChart data={[]} config={config} />);
    expect(screen.getByText('Aucune donnée disponible')).toBeInTheDocument();
  });

  it('renders overlay for active point', () => {
    render(<StreamChart data={data} config={config} activeIndex={1} />);

    expect(screen.getByText('Test Stream')).toBeInTheDocument();
    expect(screen.getByText('01:00')).toBeInTheDocument();
    expect(screen.getAllByText('110').length).toBeGreaterThan(0);
  });

  it('triggers onMouseMove and onMouseLeave', () => {
    const onMouseMove = vi.fn();
    const onMouseLeave = vi.fn();

    render(<StreamChart data={data} config={config} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} />);

    expect(onMouseMove).toHaveBeenCalledWith(1);

    fireEvent.mouseLeave(screen.getByTestId('area-chart'));
    expect(onMouseLeave).toHaveBeenCalled();
  });
});
