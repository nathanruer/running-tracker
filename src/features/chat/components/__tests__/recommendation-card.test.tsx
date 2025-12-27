import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecommendationCard } from '../recommendation-card';
import type { AIRecommendedSession } from '@/lib/types';

vi.mock('@/lib/utils/chat/formatters', () => ({
  formatDuration: vi.fn((minutes) => `${minutes} min`),
}));

describe('RecommendationCard', () => {
  const mockSession: AIRecommendedSession = {
    recommendation_id: 'rec-1',
    session_type: 'Endurance fondamentale',
    duration_min: 45,
    duration_minutes: 45,
    estimated_distance_km: 8,
    target_pace_min_km: '5:30',
    target_hr_zone: 'Zone 2',
    target_hr_bpm: 145,
    target_rpe: 6,
    why_this_session: 'Pour développer votre endurance de base',
  };

  const mockOnAccept = vi.fn();
  const mockOnDelete = vi.fn();
  const mockGetAddedSessionId = vi.fn(() => 'session-123');

  const defaultProps = {
    session: mockSession,
    displaySessionNumber: 5,
    isAdded: false,
    isCompleted: false,
    completedSession: null,
    loadingSessionId: null,
    onAccept: mockOnAccept,
    onDelete: mockOnDelete,
    getAddedSessionId: mockGetAddedSessionId,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display information', () => {
    it('should display session number', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Séance 5')).toBeInTheDocument();
    });

    it('should display session type', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Endurance fondamentale')).toBeInTheDocument();
    });

    it('should display session metrics', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('8 km')).toBeInTheDocument();
      expect(screen.getByText('45 min')).toBeInTheDocument();
      expect(screen.getByText('5:30 /km')).toBeInTheDocument();
    });

    it('should display heart rate info', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText(/FC:/)).toBeInTheDocument();
      expect(screen.getByText(/145/)).toBeInTheDocument();
      expect(screen.getByText(/bpm/)).toBeInTheDocument();
    });

    it('should display RPE when present', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('RPE: 6/10')).toBeInTheDocument();
    });

    it('should not display RPE when absent', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          session={{ ...mockSession, target_rpe: undefined }}
        />
      );

      expect(screen.queryByText(/RPE:/)).not.toBeInTheDocument();
    });

    it('should display reason for session', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByText('Pour développer votre endurance de base')).toBeInTheDocument();
    });

    it('should display interval structure for interval sessions', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          session={{
            ...mockSession,
            session_type: 'Fractionné',
            interval_structure: '8x400m R:1\'',
          }}
        />
      );

      expect(screen.getByText('Fractionné: 8x400m R:1\'')).toBeInTheDocument();
    });
  });

  describe('Not added state', () => {
    it('should show "Ajouter" button when not added', () => {
      render(<RecommendationCard {...defaultProps} />);

      expect(screen.getByRole('button', { name: /ajouter/i })).toBeInTheDocument();
    });

    it('should call onAccept when "Ajouter" button is clicked', () => {
      render(<RecommendationCard {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: /ajouter/i }));

      expect(mockOnAccept).toHaveBeenCalledWith(mockSession);
    });

    it('should disable "Ajouter" button when loading', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          loadingSessionId="rec-1"
        />
      );

      expect(screen.getByRole('button', { name: /ajouter/i })).toBeDisabled();
    });

    it('should not disable button when different session is loading', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          loadingSessionId="other-rec"
        />
      );

      expect(screen.getByRole('button', { name: /ajouter/i })).not.toBeDisabled();
    });
  });

  describe('Added but not completed state', () => {
    it('should show "Supprimer" button when added but not completed', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          isAdded={true}
          isCompleted={false}
        />
      );

      expect(screen.getByRole('button', { name: /supprimer/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ajouter/i })).not.toBeInTheDocument();
    });

    it('should call onDelete with correct params when "Supprimer" is clicked', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          isAdded={true}
          isCompleted={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /supprimer/i }));

      expect(mockGetAddedSessionId).toHaveBeenCalledWith(mockSession);
      expect(mockOnDelete).toHaveBeenCalledWith({
        sessionId: 'session-123',
        recommendationId: 'rec-1',
      });
    });

    it('should disable "Supprimer" button when loading', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          isAdded={true}
          loadingSessionId="rec-1"
        />
      );

      expect(screen.getByRole('button', { name: /supprimer/i })).toBeDisabled();
    });
  });

  describe('Completed state', () => {
    it('should show "Réalisée" badge when completed', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          isAdded={true}
          isCompleted={true}
        />
      );

      expect(screen.getByText('Réalisée')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ajouter/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /supprimer/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle session with "reason" instead of "why_this_session"', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          session={{
            ...mockSession,
            why_this_session: undefined,
            reason: 'Alternative reason text',
          }}
        />
      );

      expect(screen.getByText('Alternative reason text')).toBeInTheDocument();
    });

    it('should handle session with "type" instead of "session_type"', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          session={{
            ...mockSession,
            session_type: undefined,
            type: 'Récupération',
          }}
        />
      );

      expect(screen.getByText('Récupération')).toBeInTheDocument();
    });

    it('should handle duration_min when duration_minutes is absent', async () => {
      const { formatDuration } = await import('@/lib/utils/chat/formatters');

      render(
        <RecommendationCard
          {...defaultProps}
          session={{
            ...mockSession,
            duration_minutes: undefined,
            duration_min: 60,
          }}
        />
      );

      expect(formatDuration).toHaveBeenCalledWith(60);
    });

    it('should display target_hr_zone when target_hr_bpm is absent', () => {
      render(
        <RecommendationCard
          {...defaultProps}
          session={{
            ...mockSession,
            target_hr_bpm: undefined,
            target_hr_zone: 'Zone 3',
          }}
        />
      );

      expect(screen.getByText(/FC:/)).toBeInTheDocument();
      expect(screen.getByText(/Zone 3/)).toBeInTheDocument();
      expect(screen.queryByText(/bpm/)).not.toBeInTheDocument();
    });
  });
});
