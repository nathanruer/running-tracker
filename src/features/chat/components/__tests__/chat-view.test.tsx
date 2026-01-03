import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatView } from '../chat-view';
import { useChatMutations } from '../../hooks/use-chat-mutations';

vi.mock('../message-list', () => ({
  MessageList: ({ messages, isLoading, isSending }: {
    messages: unknown[];
    isLoading: boolean;
    isSending: boolean;
  }) => (
    <div data-testid="message-list">
      {isLoading && <div>Loading...</div>}
      {isSending && <div>Sending...</div>}
      <div>Messages: {messages.length}</div>
    </div>
  ),
}));

const mockSendMessage = vi.fn();
const mockAcceptSession = vi.fn();
const mockDeleteSession = vi.fn();
const mockReplace = vi.fn();

let mockIsSending = false;

vi.mock('../../hooks/use-chat-mutations');

vi.mock('@/lib/services/api-client', () => ({
  getSessions: vi.fn(() => Promise.resolve([])),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

global.fetch = vi.fn();

vi.mocked(useChatMutations).mockImplementation(() => ({
  acceptSession: mockAcceptSession,
  deleteSession: mockDeleteSession,
  sendMessage: mockSendMessage,
  isSending: mockIsSending,
  isAccepting: false,
  isDeleting: false,
  loadingSessionId: null,
}));

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSending = false;
  });

  describe('No conversation selected', () => {
    it('should display empty state when no conversation is selected', () => {
      render(<ChatView conversationId={null} />, { wrapper: createWrapper() });

      // Should show centered welcome message
      expect(screen.getByText('Quelle est votre demande aujourd\'hui ?')).toBeInTheDocument();
      expect(screen.getByText('Posez une question ou demandez des conseils d\'entraînement')).toBeInTheDocument();

      // Should have input and send button ready (centered)
      expect(screen.getByPlaceholderText(/Je voudrais 2 séances/i)).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Conversation loaded', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'conv-1',
          title: 'Ma conversation',
          chat_messages: [
            {
              id: 'msg-1',
              role: 'user',
              content: 'Hello',
              recommendations: null,
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      } as Response);
    });

    it('should display conversation title', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Ma conversation')).toBeInTheDocument();
      });
    });

    it('should render MessageList with messages', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
        expect(screen.getByText('Messages: 1')).toBeInTheDocument();
      });
    });

    it('should have input and send button', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Je voudrais 2 séances/i)).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });
  });

  describe('Message sending', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'conv-1',
          title: 'Ma conversation',
          chat_messages: [],
        }),
      } as Response);
    });

    it('should call sendMessage when send button is clicked', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Je voudrais 2 séances/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Je voudrais 2 séances/i);
      const sendButton = screen.getByRole('button');

      // Change input value
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test message' } });
      });

      // Click send button
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should clear input after sending message', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Je voudrais 2 séances/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Je voudrais 2 séances/i) as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Test message' } });
      expect(input.value).toBe('Test message');

      fireEvent.click(screen.getByRole('button'));

      // Input is cleared synchronously in handleSendMessage
      expect(input.value).toBe('');
    });

    it('should send message on Enter key press', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Je voudrais 2 séances/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Je voudrais 2 séances/i);

      // Change input value
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test message' } });
      });

      // Press Enter key
      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      });

      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
    });

    it('should not send message on Shift+Enter', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/Je voudrais 2 séances/i)).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText(/Je voudrais 2 séances/i);

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockSendMessage).not.toHaveBeenCalled();
    });

    it('should disable input and button when sending', async () => {
      mockIsSending = true;

      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      expect(screen.getByPlaceholderText(/Je voudrais 2 séances/i)).toBeDisabled();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should disable send button when input is empty', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });
  });
});
