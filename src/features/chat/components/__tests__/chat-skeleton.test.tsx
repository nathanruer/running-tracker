import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatSkeleton } from '../chat-skeleton';

describe('ChatSkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<ChatSkeleton />);

    expect(container.firstChild).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('bg-background');
  });

  it('should render sidebar skeleton on desktop', () => {
    const { container } = render(<ChatSkeleton />);

    const sidebar = container.querySelector('.md\\:flex.w-80');
    expect(sidebar).toBeInTheDocument();
  });

  it('should render mobile header', () => {
    const { container } = render(<ChatSkeleton />);

    const mobileHeader = container.querySelector('.md\\:hidden');
    expect(mobileHeader).toBeInTheDocument();
  });

  it('should render conversation list placeholders', () => {
    const { container } = render(<ChatSkeleton />);

    const placeholders = container.querySelectorAll('.h-10.w-10.bg-muted\\/10');
    expect(placeholders.length).toBe(6);
  });

  it('should render message area skeleton', () => {
    const { container } = render(<ChatSkeleton />);

    const messageArea = container.querySelector('.p-6.md\\:p-8');
    expect(messageArea).toBeInTheDocument();
  });

  it('should render input skeleton', () => {
    const { container } = render(<ChatSkeleton />);

    const inputSkeleton = container.querySelector('.h-14.w-full.max-w-4xl');
    expect(inputSkeleton).toBeInTheDocument();
  });

  it('should have animated elements', () => {
    const { container } = render(<ChatSkeleton />);

    const animatedElements = container.querySelectorAll('.animate-pulse');
    expect(animatedElements.length).toBeGreaterThan(0);
  });
});
