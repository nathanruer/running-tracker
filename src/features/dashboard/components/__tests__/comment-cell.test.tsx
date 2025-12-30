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

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => (
    <div data-testid="sheet" data-open={open}>
      {children}
    </div>
  ),
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="sheet-trigger">{children}</div>,
  SheetContent: ({ 
    children, 
    side, 
    className 
  }: { 
    children: React.ReactNode; 
    side?: string; 
    className?: string 
  }) => (
    <div data-testid="sheet-content" data-side={side} className={className}>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetDescription: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
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

  it('should show "Afficher plus" when truncated', () => {
    vi.mocked(TruncationHook.useTruncationDetection).mockReturnValue({
      isTruncated: true,
      elementRef: { current: null }
    });

    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Long comment" />
          </tr>
        </tbody>
      </table>
    );
    const elements = screen.getAllByText('Long comment');
    expect(elements.length).toBeGreaterThan(0);
    expect(screen.getByText('Afficher plus')).toBeInTheDocument();
  });

  it('should open sheet when "Afficher plus" is clicked', async () => {
    vi.mocked(TruncationHook.useTruncationDetection).mockReturnValue({
      isTruncated: true,
      elementRef: { current: null }
    });

    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Truncated comment" />
          </tr>
        </tbody>
      </table>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(screen.getByText('Commentaire')).toBeInTheDocument();
    const commentElements = screen.getAllByText('Truncated comment');
    expect(commentElements.length).toBeGreaterThan(0);
  });
});
