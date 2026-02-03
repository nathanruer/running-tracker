import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { WeatherIcon } from '../weather-icons';

vi.mock('lucide-react', () => ({
  Sun: (props: { className?: string }) => <div data-icon="Sun" data-class={props.className} />,
  Cloud: (props: { className?: string }) => <div data-icon="Cloud" data-class={props.className} />,
  CloudSun: (props: { className?: string }) => <div data-icon="CloudSun" data-class={props.className} />,
  CloudFog: (props: { className?: string }) => <div data-icon="CloudFog" data-class={props.className} />,
  CloudDrizzle: (props: { className?: string }) => <div data-icon="CloudDrizzle" data-class={props.className} />,
  CloudRain: (props: { className?: string }) => <div data-icon="CloudRain" data-class={props.className} />,
  CloudSnow: (props: { className?: string }) => <div data-icon="CloudSnow" data-class={props.className} />,
  CloudLightning: (props: { className?: string }) => <div data-icon="CloudLightning" data-class={props.className} />,
}));

describe('WeatherIcon', () => {
  it('renders the expected icon for each range', () => {
    const { container, rerender } = render(<WeatherIcon code={0} className="c" />);
    expect(container.querySelector('[data-icon=\"Sun\"]')).toBeTruthy();

    rerender(<WeatherIcon code={1} />);
    expect(container.querySelector('[data-icon=\"CloudSun\"]')).toBeTruthy();

    rerender(<WeatherIcon code={3} />);
    expect(container.querySelector('[data-icon=\"Cloud\"]')).toBeTruthy();

    rerender(<WeatherIcon code={45} />);
    expect(container.querySelector('[data-icon=\"CloudFog\"]')).toBeTruthy();

    rerender(<WeatherIcon code={51} />);
    expect(container.querySelector('[data-icon=\"CloudDrizzle\"]')).toBeTruthy();

    rerender(<WeatherIcon code={61} />);
    expect(container.querySelector('[data-icon=\"CloudRain\"]')).toBeTruthy();

    rerender(<WeatherIcon code={71} />);
    expect(container.querySelector('[data-icon=\"CloudSnow\"]')).toBeTruthy();

    rerender(<WeatherIcon code={80} />);
    expect(container.querySelector('[data-icon=\"CloudRain\"]')).toBeTruthy();

    rerender(<WeatherIcon code={95} />);
    expect(container.querySelector('[data-icon=\"CloudLightning\"]')).toBeTruthy();

    rerender(<WeatherIcon code={999} />);
    expect(container.querySelector('[data-icon=\"Cloud\"]')).toBeTruthy();
  });
});
