import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MessageList } from '../message-list';
import type { AIRecommendedSession, TrainingSession } from '@/lib/types';

HTMLElement.prototype.scrollIntoView = vi.fn();
HTMLElement.prototype.scrollTo = vi.fn();

vi.mock('../recommendation-card', () => ({
  RecommendationCard: ({ session, isAdded, getAddedSessionId }: {
    session: AIRecommendedSession;
    isAdded?: boolean;
    getAddedSessionId?: (session: AIRecommendedSession) => string | null;
  }) => (
    <div data-testid={`recommendation-${session.recommendation_id}`} data-added={String(isAdded)}>
      {getAddedSessionId ? getAddedSessionId(session) : null}
      {session.session_type}
    </div>
  ),
}));

vi.mock('@/lib/domain/sessions/helpers', () => ({
  getAddedSessionId: vi.fn((session: AIRecommendedSession, sessions: TrainingSession[]) => {
    const match = sessions.find((s) => s.recommendationId === session.recommendation_id);
    return match?.id ?? null;
  }),
}));

describe('MessageList', () => {
  const mockOnAcceptSession = vi.fn();
  const mockOnDeleteSession = vi.fn();

  const defaultProps = {
    messages: [],
    isLoading: false,
    isSending: false,
    loadingSessionId: null,
    allSessions: [] as TrainingSession[],
    onAcceptSession: mockOnAcceptSession,
    onDeleteSession: mockOnDeleteSession,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading states', () => {
    it('should render messages when provided', () => {
      const { container } = render(
        <MessageList
          {...defaultProps}
          isLoading={false}
          messages={[
            {
              id: '1',
              role: 'user',
              content: 'Hello',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      const userMessage = container.querySelector('.bg-violet-600');
      expect(userMessage).toBeInTheDocument();
    });

    it('should display sending indicator when isSending is true', () => {
      render(<MessageList {...defaultProps} isSending={true} />);

      expect(screen.getByText('Le coach réfléchit...')).toBeInTheDocument();
    });

    it('should render streaming content when provided', () => {
      render(
        <MessageList
          {...defaultProps}
          isStreaming={true}
          streamingContent="Streaming..."
        />
      );

      expect(screen.getByTestId('chat-loading-indicator')).toBeInTheDocument();
      expect(screen.getByText('Streaming...')).toBeInTheDocument();
    });
  });

  describe('Message rendering', () => {
    it('should render user messages', () => {
      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'user',
              content: 'Bonjour coach',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.getByText('Bonjour coach')).toBeInTheDocument();
    });

    it('should render assistant messages', () => {
      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Bonjour, comment puis-je vous aider ?',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.getByText('Bonjour, comment puis-je vous aider ?')).toBeInTheDocument();
    });

    it('should render multiple messages in order', () => {
      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'user',
              content: 'Message 1',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
            {
              id: '2',
              role: 'assistant',
              content: 'Message 2',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
            {
              id: '3',
              role: 'user',
              content: 'Message 3',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 2')).toBeInTheDocument();
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });

    it('should display model name when present', () => {
      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Hello',
              recommendations: null,
              model: 'gpt-4',
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.getByText('Modèle: gpt-4')).toBeInTheDocument();
    });

    it('should auto-scroll when messages update', () => {
      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Hello',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
    });
  });

  describe('Recommendations', () => {
    it('should display single recommendation with correct label', () => {
      const mockSession: AIRecommendedSession = {
        recommendation_id: 'rec-1',
        session_type: 'Endurance fondamentale',
        duration_min: 45,
        estimated_distance_km: 8,
      };

      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Voici une recommandation',
              recommendations: {
                recommended_sessions: [mockSession],
              },
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.getByText('1 Recommandation du coach')).toBeInTheDocument();
      expect(screen.getByTestId('recommendation-rec-1')).toBeInTheDocument();
    });

    it('should display multiple recommendations with correct label', () => {
      const mockSession1: AIRecommendedSession = {
        recommendation_id: 'rec-1',
        session_type: 'Endurance fondamentale',
        duration_min: 45,
        estimated_distance_km: 8,
      };

      const mockSession2: AIRecommendedSession = {
        recommendation_id: 'rec-2',
        session_type: 'Fractionné',
        duration_min: 30,
        estimated_distance_km: 5,
      };

      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Voici des recommandations',
              recommendations: {
                recommended_sessions: [mockSession1, mockSession2],
              },
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.getByText('2 Recommandations du coach')).toBeInTheDocument();
      expect(screen.getByTestId('recommendation-rec-1')).toBeInTheDocument();
      expect(screen.getByTestId('recommendation-rec-2')).toBeInTheDocument();
    });

    it('should not render recommendations section when null', () => {
      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Message sans recommandations',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.queryByText(/séance.*recommandée/i)).not.toBeInTheDocument();
    });

    it('should not render recommendations section when empty', () => {
      render(
        <MessageList
          {...defaultProps}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Message sans recommandations',
              recommendations: {},
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.queryByText(/séance.*recommandée/i)).not.toBeInTheDocument();
    });

    it('should mark recommendation as added when session exists', () => {
      const mockSession: AIRecommendedSession = {
        recommendation_id: 'rec-1',
        session_type: 'Endurance',
        duration_min: 30,
        estimated_distance_km: 5,
      };

      const matchedSession: TrainingSession = {
        id: 'session-1',
        userId: 'user-1',
        sessionNumber: 1,
        week: 1,
        date: '2024-01-01',
        sessionType: 'Endurance',
        duration: '00:30:00',
        distance: 5,
        avgPace: '06:00',
        avgHeartRate: 140,
        perceivedExertion: 4,
        comments: '',
        status: 'completed',
        intervalDetails: null,
        recommendationId: 'rec-1',
      };

      render(
        <MessageList
          {...defaultProps}
          allSessions={[matchedSession]}
          messages={[
            {
              id: '1',
              role: 'assistant',
              content: 'Voici une recommandation',
              recommendations: {
                recommended_sessions: [mockSession],
              },
              createdAt: new Date().toISOString(),
            },
          ]}
        />
      );

      expect(screen.getByTestId('recommendation-rec-1')).toHaveAttribute('data-added', 'true');
    });
  });

  describe('Auto-scroll', () => {
    it('should have scrollable container', () => {
      const { container } = render(<MessageList {...defaultProps} />);

      const scrollContainer = container.querySelector('div[class*="overflow-y-auto"]');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should scroll to bottom when streaming', () => {
      vi.useFakeTimers();
      const { container, rerender } = render(
        <MessageList
          {...defaultProps}
          isStreaming={false}
          streamingContent=""
        />
      );

      const scrollContainer = container.querySelector('div[class*="overflow-y-auto"]') as HTMLDivElement;
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true });

      rerender(
        <MessageList
          {...defaultProps}
          isStreaming={true}
          streamingContent="Hello"
        />
      );

      act(() => {
        vi.runAllTimers();
      });

      expect(scrollContainer.scrollTop).toBe(1000);
      vi.useRealTimers();
    });

    it('should clear previous debounce timer on rapid streaming updates', () => {
      vi.useFakeTimers();
      const clearSpy = vi.spyOn(global, 'clearTimeout');

      const { rerender } = render(
        <MessageList
          {...defaultProps}
          isStreaming={true}
          streamingContent="A"
        />
      );

      rerender(
        <MessageList
          {...defaultProps}
          isStreaming={true}
          streamingContent="B"
        />
      );

      act(() => {
        vi.runAllTimers();
      });

      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
      vi.useRealTimers();
    });
  });
});
