import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommentCell } from '../comment-cell';

vi.mock('@/components/ui/table', () => ({
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
}));

describe('CommentCell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show "—" when comment is empty', () => {
    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="" />
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show simplified "—" when comment is just whitespace', () => {
    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="   " />
          </tr>
        </tbody>
      </table>
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('should show comment text', () => {
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

  it('should apply planned styles when isPlanned is true', () => {
    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Planned comment" isPlanned={true} />
          </tr>
        </tbody>
      </table>
    );
    
    const commentDiv = screen.getByText('Planned comment');
    expect(commentDiv.className).toContain('text-muted-foreground/30');
  });

  it('should apply normal styles when isPlanned is false', () => {
    render(
      <table>
        <tbody>
          <tr>
            <CommentCell comment="Normal comment" isPlanned={false} />
          </tr>
        </tbody>
      </table>
    );
    
    const commentDiv = screen.getByText('Normal comment');
    expect(commentDiv.className).toContain('text-muted-foreground/50');
  });
});
