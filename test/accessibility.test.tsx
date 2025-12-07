import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AssistantPage from '@/app/assistant/page';

describe('Accessibility Features', () => {
  it('should use semantic HTML elements', () => {
    const { container } = render(<AssistantPage />);
    
    // Check for main element
    const main = container.querySelector('main');
    expect(main).toBeTruthy();
    
    // Check for header element
    const header = container.querySelector('header');
    expect(header).toBeTruthy();
    
    // Check for section elements
    const sections = container.querySelectorAll('section');
    expect(sections.length).toBeGreaterThanOrEqual(2);
    
    // Check for form element
    const form = container.querySelector('form');
    expect(form).toBeTruthy();
  });

  it('should have aria-label on send button', () => {
    render(<AssistantPage />);
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    expect(sendButton).toBeTruthy();
    expect(sendButton.getAttribute('aria-label')).toBe('Send message');
  });

  it('should have aria-live region for new messages', () => {
    const { container } = render(<AssistantPage />);
    
    const chatSection = container.querySelector('[aria-live="polite"]');
    expect(chatSection).toBeTruthy();
    expect(chatSection?.getAttribute('aria-relevant')).toBe('additions');
    expect(chatSection?.getAttribute('aria-label')).toBe('Chat conversation');
  });

  it('should have aria-label on textarea', () => {
    render(<AssistantPage />);
    
    const textarea = screen.getByRole('textbox', { name: /message input field/i });
    expect(textarea).toBeTruthy();
    expect(textarea.getAttribute('aria-label')).toBe('Message input field');
  });

  it('should ensure keyboard navigation works for interactive elements', () => {
    const { container } = render(<AssistantPage />);
    
    // Check that interactive elements are keyboard accessible (not disabled by tabindex=-1)
    const textarea = container.querySelector('textarea');
    const button = container.querySelector('button[type="submit"]');
    
    expect(textarea).toBeTruthy();
    expect(button).toBeTruthy();
    
    // Ensure no negative tabindex that would prevent keyboard access
    expect(textarea?.getAttribute('tabindex')).not.toBe('-1');
    expect(button?.getAttribute('tabindex')).not.toBe('-1');
  });

  it('should have proper form structure for keyboard submission', () => {
    const { container } = render(<AssistantPage />);
    
    const form = container.querySelector('form');
    expect(form).toBeTruthy();
    
    // Form should contain textarea and submit button
    const textarea = form?.querySelector('textarea');
    const submitButton = form?.querySelector('button[type="submit"]');
    
    expect(textarea).toBeTruthy();
    expect(submitButton).toBeTruthy();
  });
});
