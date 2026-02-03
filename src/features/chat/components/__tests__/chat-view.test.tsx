import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatView } from '../chat-view';
import { useChatMutations } from '../../hooks/use-chat-mutations';
import { useStreamingChat } from '../../hooks/use-streaming-chat';
import { useConversationCreation } from '../../hooks/use-conversation-creation';

vi.mock('../message-list', () => ({
  MessageList: ({ messages, isLoading, isStreaming }: {
    messages: unknown[];
    isLoading: boolean;
    isStreaming: boolean;
  }) => (
    <div data-testid="message-list">
      {isLoading && <div>Loading...</div>}
      {isStreaming && <div>Streaming...</div>}
      <div>Messages: {messages.length}</div>
    </div>
  ),
}));

const mockSendStreamingMessage = vi.fn();
const mockAcceptSession = vi.fn();
const mockDeleteSession = vi.fn();

let mockIsStreaming = false;

vi.mock('../../hooks/use-chat-mutations');
vi.mock('../../hooks/use-streaming-chat');
vi.mock('../../hooks/use-conversation-creation');

const mockGetConversation = vi.fn();

vi.mock('@/lib/services/api-client', () => ({
  getSessions: vi.fn(() => Promise.resolve([])),
  getConversation: (...args: unknown[]) => mockGetConversation(...args),
  createConversationWithMessage: vi.fn(() => Promise.resolve({ conversationId: 'new-id', messageId: 'msg-id' })),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: vi.fn(),
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

vi.mocked(useChatMutations).mockImplementation(() => ({
  acceptSession: mockAcceptSession,
  deleteSession: mockDeleteSession,
  sendMessage: vi.fn(),
  isAccepting: false,
  isDeleting: false,
  isSending: false,
  loadingSessionId: null,
}));

vi.mocked(useStreamingChat).mockImplementation(() => ({
  streamingContent: '',
  isStreaming: mockIsStreaming,
  sendStreamingMessage: mockSendStreamingMessage,
  cancelStream: vi.fn(),
}));

const mockCreateAndRedirect = vi.fn();
let mockIsCreating = false;

vi.mocked(useConversationCreation).mockImplementation(() => ({
  isCreating: mockIsCreating,
  createAndRedirect: mockCreateAndRedirect,
}));

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsStreaming = false;
    mockIsCreating = false;
  });

  describe('No conversation selected', () => {
    it('should display empty state when no conversation is selected', () => {
      render(<ChatView conversationId={null} />, { wrapper: createWrapper() });

      expect(screen.getByText(/Comment puis-je/)).toBeInTheDocument();
      expect(screen.getByText(/vous aider/)).toBeInTheDocument();
      expect(screen.getByText(/Votre coach personnel est là pour optimiser chaque kilomètre/)).toBeInTheDocument();

      expect(screen.getByPlaceholderText('Programme moi 4 séances pour cette semaine...')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should create conversation when sending without conversationId', async () => {
      const user = userEvent.setup();

      render(<ChatView conversationId={null} />, { wrapper: createWrapper() });

      const input = screen.getByPlaceholderText('Programme moi 4 séances pour cette semaine...');
      await user.type(input, 'Bonjour');
      await user.click(screen.getByTestId('chat-send-button'));

      expect(mockCreateAndRedirect).toHaveBeenCalledWith('Bonjour');
    });

    it('should send on Enter in empty state', async () => {
      render(<ChatView conversationId={null} />, { wrapper: createWrapper() });

      const input = screen.getByPlaceholderText('Programme moi 4 séances pour cette semaine...');
      fireEvent.change(input, { target: { value: 'Salut' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

      expect(mockCreateAndRedirect).toHaveBeenCalledWith('Salut');
    });

    it('should disable input when creating', () => {
      mockIsCreating = true;
      render(<ChatView conversationId={null} />, { wrapper: createWrapper() });

      expect(screen.getByTestId('chat-input')).toBeDisabled();
      expect(screen.getByTestId('chat-send-button')).toBeDisabled();
    });
  });

  describe('Conversation loaded', () => {
    beforeEach(() => {
      mockGetConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'Ma conversation',
        chat_messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello',
            recommendations: null,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    });

    it('should display conversation title', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
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
        expect(screen.getByPlaceholderText('Envoyez un message...')).toBeInTheDocument();
        expect(screen.getByRole('button')).toBeInTheDocument();
      });
    });
  });

  describe('Message sending', () => {
    beforeEach(() => {
      mockGetConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'Ma conversation',
        chat_messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello',
            recommendations: null,
            createdAt: new Date().toISOString(),
          },
        ],
      });
    });

    it('should call sendStreamingMessage when send button is clicked', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Envoyez un message...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Envoyez un message...');
      const sendButton = screen.getByRole('button');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test message' } });
      });

      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(mockSendStreamingMessage).toHaveBeenCalledWith('conv-1', 'Test message');
    });

    it('should clear input after sending message', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Envoyez un message...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Envoyez un message...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'Test message' } });
      expect(input.value).toBe('Test message');

      fireEvent.click(screen.getByRole('button'));

      expect(input.value).toBe('');
    });

    it('should send message on Enter key press', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Envoyez un message...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Envoyez un message...');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test message' } });
      });

      await act(async () => {
        fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      });

      expect(mockSendStreamingMessage).toHaveBeenCalledWith('conv-1', 'Test message');
    });

    it('should not send message on Shift+Enter', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Envoyez un message...')).toBeInTheDocument();
      });

      const input = screen.getByPlaceholderText('Envoyez un message...');

      fireEvent.change(input, { target: { value: 'Test message' } });
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(mockSendStreamingMessage).not.toHaveBeenCalled();
    });

    it('should disable input and button when streaming', async () => {
      mockIsStreaming = true;

      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Envoyez un message...')).toBeDisabled();
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });

    it('should disable send button when input is empty', async () => {
      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeDisabled();
      });
    });

    it('should request streaming when last message is user', async () => {
      mockGetConversation.mockResolvedValue({
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
      });

      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockSendStreamingMessage).toHaveBeenCalledWith('conv-1', 'Hello', {
          skipOptimisticUserMessage: true,
          skipSaveUserMessage: true,
        });
      });
    });

    it('should not request streaming when last message is assistant', async () => {
      mockGetConversation.mockResolvedValue({
        id: 'conv-1',
        title: 'Ma conversation',
        chat_messages: [
          {
            id: 'msg-1',
            role: 'assistant',
            content: 'Hello',
            recommendations: null,
            createdAt: new Date().toISOString(),
          },
        ],
      });

      render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('message-list')).toBeInTheDocument();
      });

      expect(mockSendStreamingMessage).not.toHaveBeenCalled();
    });

    it('should only stream once for the same last message', async () => {
      mockGetConversation.mockResolvedValue({
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
      });

      const { rerender } = render(<ChatView conversationId="conv-1" />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockSendStreamingMessage).toHaveBeenCalledTimes(1);
      });

      rerender(<ChatView conversationId="conv-1" />);

      expect(mockSendStreamingMessage).toHaveBeenCalledTimes(1);
    });
  });
});
