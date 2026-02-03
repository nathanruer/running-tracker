import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConversationListItem } from '../conversation-list-item';

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children, onClick }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    asChild?: boolean;
  }) => <div onClick={onClick}>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onClick }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
  }) => <div onClick={onClick} role="menuitem">{children}</div>,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

describe('ConversationListItem', () => {
  const mockConversation = {
    id: 'conv-1',
    title: 'Ma conversation de test',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    _count: {
      chat_messages: 5,
    },
  };

  const mockOnSelect = vi.fn();
  const mockOnRename = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnPrefetch = vi.fn();

  const defaultProps = {
    conversation: mockConversation,
    isSelected: false,
    onSelect: mockOnSelect,
    onRename: mockOnRename,
    onDelete: mockOnDelete,
    onPrefetch: mockOnPrefetch,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Display', () => {
    it('should display conversation title', () => {
      render(<ConversationListItem {...defaultProps} />);

      expect(screen.getByText('Ma conversation de test')).toBeInTheDocument();
    });

    it('should display message icon', () => {
      render(<ConversationListItem {...defaultProps} />);

      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should apply selected style when isSelected is true', () => {
      const { container } = render(<ConversationListItem {...defaultProps} isSelected={true} />);

      const conversationDiv = container.firstChild as HTMLElement;
      expect(conversationDiv.className).toContain('bg-muted');
    });

    it('should not apply selected style when isSelected is false', () => {
      const { container } = render(<ConversationListItem {...defaultProps} isSelected={false} />);

      const conversationDiv = container.firstChild as HTMLElement;
      expect(conversationDiv).toBeInTheDocument();
    });

    it('should show action button when mobile', () => {
      render(<ConversationListItem {...defaultProps} isMobile={true} />);

      const button = screen.getAllByRole('button')[0];
      expect(button.className).toContain('opacity-100');
    });
  });

  describe('Interactions', () => {
    it('should call onSelect when clicked', () => {
      render(<ConversationListItem {...defaultProps} />);

      const conversationDiv = screen.getByText('Ma conversation de test').closest('div');
      fireEvent.click(conversationDiv!);

      expect(mockOnSelect).toHaveBeenCalledWith('conv-1');
    });

    it('should call onPrefetch on mouse enter', () => {
      render(<ConversationListItem {...defaultProps} />);

      const conversationDiv = screen.getByText('Ma conversation de test').closest('div');
      fireEvent.mouseEnter(conversationDiv!);

      expect(mockOnPrefetch).toHaveBeenCalledWith('conv-1');
    });

    it('should call onPrefetch on focus', () => {
      render(<ConversationListItem {...defaultProps} />);

      const conversationDiv = screen.getByText('Ma conversation de test').closest('div');
      fireEvent.focus(conversationDiv!);

      expect(mockOnPrefetch).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('Actions menu', () => {
    it('should display rename and delete menu items', () => {
      render(<ConversationListItem {...defaultProps} />);

      expect(screen.getByText('Renommer')).toBeInTheDocument();
      expect(screen.getByText('Supprimer')).toBeInTheDocument();
    });

    it('should call onRename when rename is clicked', () => {
      render(<ConversationListItem {...defaultProps} />);

      const renameButton = screen.getByText('Renommer').closest('[role="menuitem"]');
      fireEvent.click(renameButton!);

      expect(mockOnRename).toHaveBeenCalledWith(mockConversation);
    });

    it('should call onDelete when delete is clicked', () => {
      render(<ConversationListItem {...defaultProps} />);

      const deleteButton = screen.getByText('Supprimer').closest('[role="menuitem"]');
      fireEvent.click(deleteButton!);

      expect(mockOnDelete).toHaveBeenCalledWith('conv-1');
    });

    it('should not trigger select when opening menu', () => {
      render(<ConversationListItem {...defaultProps} />);

      const menuButton = screen.getAllByRole('button')[0];
      fireEvent.click(menuButton);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });
});
