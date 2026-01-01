import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentCell } from '../comment-cell';
import * as TruncationHook from '../../hooks/use-truncation-detection';

vi.mock('../../hooks/use-truncation-detection', () => ({
  useTruncationDetection: vi.fn()
}));

vi.mock('@/components/ui/table', () => ({
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
}));

describe('CommentCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "-" when comment is empty', () => {
    vi.mocked(TruncationHook.useTruncationDetection).mockReturnValue({
      isTruncated: false,
      elementRef: { current: null }
    });

    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="" />
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('should show full comment when not truncated', () => {
    vi.mocked(TruncationHook.useTruncationDetection).mockReturnValue({
      isTruncated: false,
      elementRef: { current: null }
    });

    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Simple comment" />
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText('Simple comment')).toBeInTheDocument();
  });

  it('should show "Afficher plus" when truncated and onShowMore is provided', () => {
    vi.mocked(TruncationHook.useTruncationDetection).mockReturnValue({
      isTruncated: true,
      elementRef: { current: null }
    });

    const mockOnShowMore = vi.fn();

    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Long comment" onShowMore={mockOnShowMore} />
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText('Long comment')).toBeInTheDocument();
    expect(screen.getByText('Afficher plus')).toBeInTheDocument();
  });

  it('should not show "Afficher plus" when truncated but no onShowMore callback', () => {
    vi.mocked(TruncationHook.useTruncationDetection).mockReturnValue({
      isTruncated: true,
      elementRef: { current: null }
    });

    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Truncated comment without callback" />
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText('Truncated comment without callback')).toBeInTheDocument();
    expect(screen.queryByText('Afficher plus')).not.toBeInTheDocument();
  });

  it('should call onShowMore when button is clicked', () => {
    vi.mocked(TruncationHook.useTruncationDetection).mockReturnValue({
      isTruncated: true,
      elementRef: { current: null }
    });

    const mockOnShowMore = vi.fn();

    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Truncated comment" onShowMore={mockOnShowMore} />
          </tr>
        </tbody>
      </table>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnShowMore).toHaveBeenCalledTimes(1);
  });
});
