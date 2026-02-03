import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChatSidebar } from '../chat-sidebar';
import { useConversationMutations } from '../../hooks/use-conversation-mutations';

vi.mock('../conversation-list-item', () => ({
  ConversationListItem: ({ conversation, onSelect, onPrefetch, onRename, onDelete }: {
    conversation: { id: string; title: string };
    onSelect: (id: string) => void;
    onPrefetch: (id: string) => void;
    onRename: (conversation: { id: string; title: string }) => void;
    onDelete: (id: string) => void;
  }) => (
    <div
      data-testid={`conversation-${conversation.id}`}
      onMouseEnter={() => onPrefetch(conversation.id)}
      onFocus={() => onPrefetch(conversation.id)}
      onClick={() => onSelect(conversation.id)}
      tabIndex={0}
    >
      <span>{conversation.title}</span>
      <button type="button" onClick={() => onRename(conversation)}>rename</button>
      <button type="button" onClick={() => onDelete(conversation.id)}>delete</button>
    </div>
  ),
}));

vi.mock('../../hooks/use-conversation-mutations', () => ({
  useConversationMutations: vi.fn(() => ({
    createConversation: vi.fn(),
    renameConversation: vi.fn(),
    deleteConversation: vi.fn(),
    isCreating: false,
    renameDialogOpen: false,
    setRenameDialogOpen: vi.fn(),
    selectedForRename: null,
    newTitle: '',
    setNewTitle: vi.fn(),
    handleRenameClick: vi.fn(),
    handleRenameSubmit: vi.fn(),
    handleRenameCancel: vi.fn(),
    isRenaming: false,
    deleteDialogOpen: false,
    setDeleteDialogOpen: vi.fn(),
    handleDeleteClick: vi.fn(),
    handleDeleteSubmit: vi.fn(),
    handleDeleteCancel: vi.fn(),
    isDeleting: false,
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
  const prefetchSpy = vi.spyOn(queryClient, 'prefetchQuery');
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return { Wrapper, queryClient, prefetchSpy };
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

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Conversations')).toBeInTheDocument();
  });

  it('should display create button', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    const createButton = screen.getByRole('button');
    expect(createButton).toBeInTheDocument();
  });

  it('should call onSelectConversation when creating new chat', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    await user.click(screen.getByTestId('btn-new-conversation'));

    expect(mockOnSelectConversation).toHaveBeenCalledWith('');
  });

  it('should disable create button when disableCreate is true', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
        disableCreate={true}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('btn-new-conversation')).toBeDisabled();
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

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
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

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByText('Aucune conversation')).toBeInTheDocument();
      expect(screen.getByText('Créez-en une pour commencer')).toBeInTheDocument();
    });
  });

  it('should prefetch conversation on hover', async () => {
    const mockConversations = [
      {
        id: 'conv-1',
        title: 'Conversation 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { chat_messages: 3 },
      },
    ];

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => mockConversations,
    } as Response);

    const { Wrapper, prefetchSpy } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    await waitFor(() => {
      expect(screen.getByTestId('conversation-conv-1')).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId('conversation-conv-1'));

    expect(prefetchSpy).toHaveBeenCalled();
  });

  it('should clear selection when active conversation is deleted', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId="conv-1"
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    const options = vi.mocked(useConversationMutations).mock.calls[0]?.[0];
    options?.onConversationDeleted?.('conv-1');

    expect(mockOnSelectConversation).toHaveBeenCalledWith('');
  });

  it('should submit rename on Enter key', async () => {
    const handleRenameSubmit = vi.fn();
    vi.mocked(useConversationMutations).mockReturnValueOnce({
      createConversation: vi.fn(),
      renameConversation: vi.fn(),
      deleteConversation: vi.fn(),
      isCreating: false,
      renameDialogOpen: true,
      setRenameDialogOpen: vi.fn(),
      selectedForRename: { id: 'conv-1', title: 'Test', createdAt: '', updatedAt: '' },
      newTitle: 'Nouveau titre',
      setNewTitle: vi.fn(),
      handleRenameClick: vi.fn(),
      handleRenameSubmit,
      handleRenameCancel: vi.fn(),
      isRenaming: false,
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteSubmit: vi.fn(),
      handleDeleteCancel: vi.fn(),
      isDeleting: false,
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    const input = screen.getByPlaceholderText('Nouveau titre');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleRenameSubmit).toHaveBeenCalled();
  });

  it('should disable rename button when title is empty', async () => {
    vi.mocked(useConversationMutations).mockReturnValueOnce({
      createConversation: vi.fn(),
      renameConversation: vi.fn(),
      deleteConversation: vi.fn(),
      isCreating: false,
      renameDialogOpen: true,
      setRenameDialogOpen: vi.fn(),
      selectedForRename: { id: 'conv-1', title: 'Test', createdAt: '', updatedAt: '' },
      newTitle: '   ',
      setNewTitle: vi.fn(),
      handleRenameClick: vi.fn(),
      handleRenameSubmit: vi.fn(),
      handleRenameCancel: vi.fn(),
      isRenaming: false,
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteSubmit: vi.fn(),
      handleDeleteCancel: vi.fn(),
      isDeleting: false,
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    const renameButton = screen.getByRole('button', { name: 'Renommer' });
    expect(renameButton).toBeDisabled();
  });

  it('should update title on input change', async () => {
    const setNewTitle = vi.fn();
    vi.mocked(useConversationMutations).mockReturnValueOnce({
      createConversation: vi.fn(),
      renameConversation: vi.fn(),
      deleteConversation: vi.fn(),
      isCreating: false,
      renameDialogOpen: true,
      setRenameDialogOpen: vi.fn(),
      selectedForRename: { id: 'conv-1', title: 'Test', createdAt: '', updatedAt: '' },
      newTitle: '',
      setNewTitle,
      handleRenameClick: vi.fn(),
      handleRenameSubmit: vi.fn(),
      handleRenameCancel: vi.fn(),
      isRenaming: false,
      deleteDialogOpen: false,
      setDeleteDialogOpen: vi.fn(),
      handleDeleteClick: vi.fn(),
      handleDeleteSubmit: vi.fn(),
      handleDeleteCancel: vi.fn(),
      isDeleting: false,
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    const { Wrapper } = createWrapper();
    render(
      <ChatSidebar
        selectedConversationId={null}
        onSelectConversation={mockOnSelectConversation}
      />,
      { wrapper: Wrapper }
    );

    fireEvent.change(screen.getByPlaceholderText('Nouveau titre'), { target: { value: 'Titre' } });

    expect(setNewTitle).toHaveBeenCalledWith('Titre');
  });
});
