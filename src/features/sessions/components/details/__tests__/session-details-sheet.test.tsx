import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SessionDetailsSheet } from '../session-details-sheet';
import { type TrainingSession } from '@/lib/types';

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-content">{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-header">{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-title">{children}</div>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-description">{children}</div>,
}));

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div data-testid="scroll-area">{children}</div>,
}));

describe('SessionDetailsSheet', () => {
  const mockOnOpenChange = vi.fn();

  const mockSession: TrainingSession = {
    id: '1',
    sessionNumber: 1,
    week: 1,
    date: '2024-01-01T10:00:00Z',
    sessionType: 'Fractionné',
    duration: '01:00:00',
    distance: 10,
    avgPace: '5:00',
    avgHeartRate: 150,
    perceivedExertion: 7,
    comments: 'Test session',
    status: 'completed',
    userId: 'user1',
    intervalDetails: {
      workoutType: '10x400m',
      steps: [
        { stepNumber: 1, stepType: 'warmup', duration: '10:00', distance: 2000, pace: '5:00', hr: 140 },
        { stepNumber: 2, stepType: 'effort', duration: '1:30', distance: 400, pace: '3:45', hr: 170 }
      ],
      repetitionCount: 10,
      effortDuration: '1:30',
      recoveryDuration: '1:00',
      effortDistance: 400,
      recoveryDistance: null,
      targetEffortPace: '4:00',
      targetEffortHR: 170,
      targetRecoveryPace: '6:00',
    },
    // Strava simulated data
    source: 'strava',
    externalId: '12345',
    elevationGain: 150,
    averageCadence: 180,
    averageTemp: 20,
    calories: 800,
    stravaData: {
      id: 12345,
      name: 'Test Run',
      distance: 10000,
      moving_time: 3600,
      elapsed_time: 3600,
      total_elevation_gain: 150,
      type: 'Run',
      start_date: '2024-01-01T10:00:00Z',
      start_date_local: '2024-01-01T10:00:00',
      average_speed: 2.78,
      max_speed: 3.5,
      average_heartrate: 150,
      average_cadence: 180,
      average_temp: 20,
      elev_high: 300,
      elev_low: 150,
      calories: 800,
      map: { id: 'map1', summary_polyline: 'encoded_polyline' }
    }
  };

  it('should not render when not open', () => {
    render(<SessionDetailsSheet open={false} onOpenChange={mockOnOpenChange} session={mockSession} />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
  });

  it('should render session details when open', () => {
    render(<SessionDetailsSheet open={true} onOpenChange={mockOnOpenChange} session={mockSession} />);
    
    expect(screen.getByTestId('sheet')).toBeInTheDocument();
    expect(screen.getByText(/Séance sans date|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche/i)).toBeInTheDocument();
    
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByText('01:00:00')).toBeInTheDocument();
  });

  it('should render Strava metrics section when available', () => {
    render(<SessionDetailsSheet open={true} onOpenChange={mockOnOpenChange} session={mockSession} />);

    expect(screen.getByText('Données Capteurs')).toBeInTheDocument();
    expect(screen.getAllByText('150').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('360')).toBeInTheDocument();
    expect(screen.getByText('800')).toBeInTheDocument();
  });

  it('should render Intervals section for interval sessions', () => {
    render(<SessionDetailsSheet open={true} onOpenChange={mockOnOpenChange} session={mockSession} />);
    
    expect(screen.getByText(/Structure de la séance/i)).toBeInTheDocument();
    expect(screen.getByText(/2 segments/i)).toBeInTheDocument();
    
    expect(screen.getByText('E1')).toBeInTheDocument();
    expect(screen.getByText('01:30')).toBeInTheDocument();
  });

  it('should not render Intervals section if no details', () => {
    const simpleSession = { ...mockSession, intervalDetails: null };
    render(<SessionDetailsSheet open={true} onOpenChange={mockOnOpenChange} session={simpleSession} />);
    
    expect(screen.queryByText(/Structure de la séance/i)).not.toBeInTheDocument();
  });

  it('should render comments when present', () => {
    render(<SessionDetailsSheet open={true} onOpenChange={mockOnOpenChange} session={mockSession} />);

    expect(screen.getByText('Notes de séance')).toBeInTheDocument();
    expect(screen.getByText('Test session')).toBeInTheDocument();
  });

  it('should format target duration consistently (HH:MM:SS for >= 60min)', () => {
    const plannedSession: TrainingSession = {
      ...mockSession,
      duration: null,
      targetDuration: 63, // 63 minutes = 01:03:00
      date: null,
      plannedDate: null,
      status: 'planned',
      intervalDetails: null,
    };

    render(<SessionDetailsSheet open={true} onOpenChange={mockOnOpenChange} session={plannedSession} />);

    // Should display as ~01:03:00 (HH:MM:SS) not ~63 min
    expect(screen.getByText(/~01:03:00/i)).toBeInTheDocument();
    expect(screen.queryByText(/63 min/i)).not.toBeInTheDocument();
  });

  it('should format target duration consistently (MM:SS for < 60min)', () => {
    const plannedSession: TrainingSession = {
      ...mockSession,
      duration: null,
      targetDuration: 45, // 45 minutes = 45:00
      date: null,
      plannedDate: null,
      status: 'planned',
      intervalDetails: null,
    };

    render(<SessionDetailsSheet open={true} onOpenChange={mockOnOpenChange} session={plannedSession} />);

    // Should display as ~45:00 (MM:SS) not ~45 min
    expect(screen.getByText(/~45:00/i)).toBeInTheDocument();
    expect(screen.queryByText(/45 min/i)).not.toBeInTheDocument();
  });
});
