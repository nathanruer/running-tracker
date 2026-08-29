import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ImportedActivitySummary } from '../imported-activity-summary';

describe('ImportedActivitySummary', () => {
  it('renders Strava branding and activity link for strava source', () => {
    render(
      <ImportedActivitySummary
        source="strava"
        externalId="12345"
        date="2026-05-08"
        distance={5.26}
        duration="30:59"
        avgPace="05:53"
      />
    );

    expect(screen.getByText('Synchronisation Strava')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://www.strava.com/activities/12345'
    );
  });

  it('renders intervals.icu branding and activity link for intervals source', () => {
    render(
      <ImportedActivitySummary
        source="intervals_icu"
        externalId="i9876"
        date="2026-05-08"
        distance={9}
        duration="50:00"
        avgPace="06:00"
      />
    );

    expect(screen.getByText('Synchronisation intervals.icu')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      'https://intervals.icu/activities/i9876'
    );
  });

  it('shows summary values and Modifier button when onModify is provided', () => {
    const onModify = vi.fn();
    render(
      <ImportedActivitySummary
        source="intervals_icu"
        externalId={null}
        date={null}
        distance={9}
        duration="50:00"
        avgPace="06:00"
        onModify={onModify}
      />
    );

    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('50:00')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'Modifier' }).click();
    expect(onModify).toHaveBeenCalled();
  });
});
