import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImportedActivitySummary } from '../imported-activity-summary';

describe('ImportedActivitySummary', () => {
  it('renders the intervals.icu branding, the activity link and the metrics', () => {
    render(
      <ImportedActivitySummary
        externalId="i12345"
        date="2026-05-08"
        distance={5.26}
        duration="30:59"
        avgPace="05:53"
      />
    );

    expect(screen.getByText('Synchronisation intervals.icu')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', 'https://intervals.icu/activities/i12345');
    expect(screen.getByText('5.26')).toBeInTheDocument();
    expect(screen.getByText('30:59')).toBeInTheDocument();
    expect(screen.getByText('05:53')).toBeInTheDocument();
  });

  it('omits the link without an external id and shows placeholders', () => {
    render(<ImportedActivitySummary externalId={null} date={null} distance={null} duration={null} avgPace={null} />);

    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });

  it('calls onModify from the Modifier button', () => {
    const onModify = vi.fn();
    render(<ImportedActivitySummary externalId="i1" distance={5} duration="30:00" avgPace="06:00" onModify={onModify} />);

    screen.getByRole('button', { name: 'Modifier' }).click();
    expect(onModify).toHaveBeenCalledTimes(1);
  });
});
