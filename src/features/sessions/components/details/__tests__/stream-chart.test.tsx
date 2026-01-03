import { render } from '@testing-library/react';
import { StreamChart } from '../stream-chart';
import { describe, it, expect, vi } from 'vitest';

class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

global.ResizeObserver = ResizeObserverMock;

vi.mock('recharts', async () => {
    const Original = await vi.importActual('recharts');
    return {
        ...Original,
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div style={{ width: 500, height: 200 }} className="recharts-responsive-container">{children}</div>,
    };
});

describe('StreamChart', () => {
    const data = [
        { time: 0, distance: 0, value: 100, formattedValue: '100' }, 
        { time: 60, distance: 1, value: 110, formattedValue: '110' }
    ];
    const config = { 
        key: 'test',
        unit: 'units',
        color: 'red', 
        label: 'Test Stream', 
        formatValue: (v: number) => `${v}`, 
        gradientId: 'grad', 
        formatTooltip: (v: number) => `${v}` 
    };

    it('should render without crashing', () => {
        const { container } = render(<StreamChart data={data} config={config} />);
        expect(container).toBeInTheDocument();
        expect(container.textContent).not.toContain('Aucune donnée disponible');
        expect(container.querySelector('.recharts-responsive-container')).toBeInTheDocument();
    });

     it('should render empty state when no data', () => {
        const { container } = render(<StreamChart data={[]} config={config} />);
        expect(container.textContent).toContain('Aucune donnée disponible');
    });
});
