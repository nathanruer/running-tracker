import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { StreamsSection } from '../streams-section';

vi.mock('../stream-chart', () => ({
  StreamChart: ({ config }: { config: { id: string; domain?: [number, number] } }) => (
    <div data-testid={`chart-${config.id}`} data-domain={config.domain?.join(',') ?? ''} />
  ),
}));

vi.mock('@/lib/utils/geo/stream-charts', () => ({
  STREAM_CONFIGS: {
    pace: { id: 'pace', domain: [0, 10] },
    altitude: { id: 'altitude' },
  },
}));

vi.mock('@/lib/constants/stream-charts', () => ({
  CHART_DISPLAY_ORDER: ['pace', 'altitude'],
  STREAM_CHART_CONSTANTS: {
    CHART_HEIGHT: 220,
  },
}));

const mockUseStreamData = vi.fn();
vi.mock('../../../hooks/details/use-stream-data', () => ({
  useStreamData: (streams: unknown) => mockUseStreamData(streams),
}));

describe('StreamsSection', () => {
  it('returns null when no available streams', () => {
    mockUseStreamData.mockReturnValue({
      validatedStreams: null,
      availableStreams: [],
      chartData: {},
      paceDomain: null,
    });

    const { container } = render(<StreamsSection streams={{}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders charts in display order and applies pace domain', async () => {
    mockUseStreamData.mockReturnValue({
      validatedStreams: { ok: true },
      availableStreams: ['pace', 'altitude'],
      chartData: {
        pace: [{ x: 1, y: 2 }],
        altitude: [{ x: 1, y: 3 }],
      },
      paceDomain: [3, 8],
    });

    render(<StreamsSection streams={{}} />);

    const pace = await screen.findByTestId('chart-pace');
    expect(pace).toBeInTheDocument();
    expect(pace.getAttribute('data-domain')).toBe('3,8');

    const altitude = await screen.findByTestId('chart-altitude');
    expect(altitude).toBeInTheDocument();
  });

  it('skips charts with empty data', async () => {
    mockUseStreamData.mockReturnValue({
      validatedStreams: { ok: true },
      availableStreams: ['pace', 'altitude'],
      chartData: {
        pace: [],
        altitude: [{ x: 1, y: 3 }],
      },
      paceDomain: [3, 8],
    });

    render(<StreamsSection streams={{}} />);

    expect(screen.queryByTestId('chart-pace')).toBeNull();
    expect(await screen.findByTestId('chart-altitude')).toBeInTheDocument();
  });
});
