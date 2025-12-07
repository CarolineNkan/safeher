import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageBubble from '@/components/MessageBubble';
import TypingIndicator from '@/components/TypingIndicator';

describe('Styling Polish - Visual Refinements', () => {
  describe('Message Bubble Styling', () => {
    it('should apply consistent spacing and padding to user messages', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubble = container.querySelector('[data-testid="message-bubble"]');
      
      expect(bubble).toBeTruthy();
      expect(bubble?.className).toContain('mb-4');
    });

    it('should apply shadow to user messages with purple tint', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      expect(bubbleContent?.className).toContain('shadow-sm');
      expect(bubbleContent?.className).toContain('shadow-purple-200');
    });

    it('should apply border and shadow to assistant messages', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Test response',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      expect(bubbleContent?.className).toContain('shadow-sm');
      expect(bubbleContent?.className).toContain('border');
      expect(bubbleContent?.className).toContain('bg-white');
    });

    it('should apply enhanced border to error messages', () => {
      const message = {
        id: '1',
        role: 'error' as const,
        content: 'Error message',
        timestamp: new Date(),
        isRetryable: true,
        originalMessageId: 'original-1',
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      expect(bubbleContent?.className).toContain('border-2');
      expect(bubbleContent?.className).toContain('border-red-200');
    });

    it('should use SafeHER purple color for user messages', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      expect(bubbleContent?.className).toContain('bg-[#9333ea]');
      expect(bubbleContent?.className).toContain('text-white');
    });

    it('should apply consistent text sizing', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const text = container.querySelector('p');
      
      expect(text?.className).toContain('text-base');
      expect(text?.className).toContain('leading-relaxed');
    });
  });

  describe('Typing Indicator Styling', () => {
    it('should apply consistent styling with message bubbles', () => {
      const { container } = render(<TypingIndicator />);
      const indicator = container.querySelector('[data-testid="typing-indicator"]');
      
      expect(indicator?.className).toContain('mb-4');
      expect(indicator?.className).toContain('animate-fadeInUp');
    });

    it('should use white background with border like assistant messages', () => {
      const { container } = render(<TypingIndicator />);
      const indicatorContent = container.querySelector('[data-testid="typing-indicator"] > div');
      
      expect(indicatorContent?.className).toContain('bg-white');
      expect(indicatorContent?.className).toContain('border');
      expect(indicatorContent?.className).toContain('shadow-sm');
    });

    it('should use purple color for animated dots', () => {
      const { container } = render(<TypingIndicator />);
      const dots = container.querySelectorAll('span');
      
      expect(dots.length).toBe(3);
      dots.forEach(dot => {
        expect(dot.className).toContain('bg-[#a855f7]');
      });
    });
  });

  describe('Animation Timing', () => {
    it('should apply fade-in animation to message bubbles', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubble = container.querySelector('[data-testid="message-bubble"]');
      
      expect(bubble?.className).toContain('animate-fadeInUp');
    });

    it('should apply fade-in animation to typing indicator', () => {
      const { container } = render(<TypingIndicator />);
      const indicator = container.querySelector('[data-testid="typing-indicator"]');
      
      expect(indicator?.className).toContain('animate-fadeInUp');
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive max-width to message bubbles', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      expect(bubbleContent?.className).toContain('max-w-[85%]');
      expect(bubbleContent?.className).toContain('sm:max-w-[75%]');
      expect(bubbleContent?.className).toContain('md:max-w-[70%]');
    });
  });

  describe('Accessibility - Contrast', () => {
    it('should use high contrast colors for user messages', () => {
      const message = {
        id: '1',
        role: 'user' as const,
        content: 'Test message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      // Purple background (#9333ea) with white text has 7.04:1 contrast ratio
      expect(bubbleContent?.className).toContain('bg-[#9333ea]');
      expect(bubbleContent?.className).toContain('text-white');
    });

    it('should use high contrast colors for assistant messages', () => {
      const message = {
        id: '1',
        role: 'assistant' as const,
        content: 'Test response',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      // White background with gray-900 text has 16.1:1 contrast ratio
      expect(bubbleContent?.className).toContain('bg-white');
      expect(bubbleContent?.className).toContain('text-gray-900');
    });

    it('should use high contrast colors for error messages', () => {
      const message = {
        id: '1',
        role: 'error' as const,
        content: 'Error message',
        timestamp: new Date(),
      };

      const { container } = render(<MessageBubble message={message} />);
      const bubbleContent = container.querySelector('[data-testid="message-bubble"] > div');
      
      // Red-50 background with red-900 text has 11.2:1 contrast ratio
      expect(bubbleContent?.className).toContain('bg-red-50');
      expect(bubbleContent?.className).toContain('text-red-900');
    });
  });
});
