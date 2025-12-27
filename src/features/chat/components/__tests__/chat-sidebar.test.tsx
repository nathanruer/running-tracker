import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatSidebar } from '../chat-sidebar';

vi.mock('../conversation-list-item', () => ({
  ConversationListItem: ({ conversation }: { conversation: { id: string; title: string } }) => (
    <div data-testid={`conversation-${conversation.id}`}>{conversation.title}</div>
  ),
}));

vi.mock('../hooks/use-conversation-mutations', () => ({
  useConversationMutations: vi.fn(() => ({
    createConversation: vi.fn(),
    deleteConversation: vi.fn(),
    isCreating: false,
    renameDialogOpen: false,
    setRenameDialogOpen: vi.fn(),
    newTitle: '',
    setNewTitle: vi.fn(),
    handleRenameClick: vi.fn(),
    handleRenameSubmit: vi.fn(),
    handleRenameCancel: vi.fn(),
    isRenaming: false,
  })),
}));

global.fetch = vi.fn();

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

describe('ChatSidebar', () => {
  const mockOnSelectConversation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display conversations header', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Conversations')).toBeInTheDocument();
  });

  it('should display create button', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: createWrapper() }
    );

    const createButton = screen.getByRole('button');
    expect(createButton).toBeInTheDocument();
  });

  it('should display conversations list', async () => {
    const mockConversations = [
      {
        id: 'conv-1',
        title: 'Conversation 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { chat_messages: 3 },
      },
      {
        id: 'conv-2',
        title: 'Conversation 2',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { chat_messages: 5 },
      },
    ];

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockConversations,
    } as Response);

    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
      expect(screen.getByTestId('conversation-conv-2')).toBeInTheDocument();
    });
  });

  it('should display empty state when no conversations', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText('Aucune conversation')).toBeInTheDocument();
      expect(screen.getByText('Créez-en une pour commencer')).toBeInTheDocument();
    });
  });
});
