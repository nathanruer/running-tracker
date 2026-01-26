import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChatSkeleton } from '../chat-skeleton';

describe('ChatSkeleton', () => {
  it('should render skeleton container', () => {
    const { container } = render(<ChatSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should render sidebar skeleton on desktop', () => {
    const { container } = render(<ChatSkeleton />);
    const sidebar = container.querySelector('.hidden.md\\:flex.w-80');
    expect(sidebar).toBeInTheDocument();
  });

  it('should render mobile header', () => {
    const { container } = render(<ChatSkeleton />);
    const mobileHeader = container.querySelector('.md\\:hidden');
    expect(mobileHeader).toBeInTheDocument();
  });

  it('should render conversation list placeholders', () => {
    const { container } = render(<ChatSkeleton />);
    const placeholders = container.querySelectorAll('.flex.items-center.gap-3.p-3');
    expect(placeholders.length).toBe(10);
  });

  it('should render main hero area in landing mode', () => {
    const { container } = render(<ChatSkeleton mode="landing" />);
    const hero = container.querySelector('.h-10.md\\:h-14');
    expect(hero).toBeInTheDocument();
  });

  it('should render bubbles in conversation mode', () => {
    const { container } = render(<ChatSkeleton mode="conversation" />);
    const bubbles = container.querySelectorAll('.h-14, .h-32, .h-12');
    expect(bubbles.length).toBeGreaterThanOrEqual(3);
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
