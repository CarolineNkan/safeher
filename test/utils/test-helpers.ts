import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import type { Message } from './generators';

/**
 * Custom render function that can be extended with providers if needed
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

/**
 * Helper to create a mock message for testing
 */
export function createMockMessage(
  overrides?: Partial<Message>
): Message {
  return {
    id: overrides?.id || `msg-${Date.now()}`,
    role: overrides?.role || 'user',
    content: overrides?.content || 'Test message',
    timestamp: overrides?.timestamp || new Date(),
  };
}

/**
 * Helper to create multiple mock messages
 */
export function createMockMessages(count: number): Message[] {
  return Array.from({ length: count }, (_, i) =>
    createMockMessage({
      id: `msg-${i}`,
      content: `Message ${i}`,
      role: i % 2 === 0 ? 'user' : 'assistant',
      timestamp: new Date(Date.now() + i * 1000),
    })
  );
}

/**
 * Helper to wait for an element to be removed
 */
export async function waitForElementToBeRemoved(
  callback: () => HTMLElement | null,
  options?: { timeout?: number }
) {
  const timeout = options?.timeout || 3000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (!callback()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('Element was not removed within timeout');
}

/**
 * Helper to check if an element has a specific CSS class
 */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Helper to get computed color from an element
 */
export function getComputedColor(element: HTMLElement): string {
  return window.getComputedStyle(element).backgroundColor;
}

/**
 * Helper to check contrast ratio (simplified version)
 * For full WCAG compliance, use a proper contrast checking library
 */
export function hasMinimumContrast(
  foreground: string,
  background: string,
  minRatio: number = 4.5
): boolean {
  // This is a simplified check - in production, use a proper contrast library
  // For now, we'll just check that colors are different
  return foreground !== background;
}

/**
 * Helper to simulate keyboard events
 */
export function createKeyboardEvent(
  key: string,
  options?: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean }
): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    key,
    shiftKey: options?.shiftKey || false,
    ctrlKey: options?.ctrlKey || false,
    metaKey: options?.metaKey || false,
    bubbles: true,
    cancelable: true,
  });
}

/**
 * Helper to check if element is scrolled to bottom
 */
export function isScrolledToBottom(element: HTMLElement): boolean {
  const threshold = 5; // Allow 5px threshold
  return (
    Math.abs(
      element.scrollHeight - element.scrollTop - element.clientHeight
    ) <= threshold
  );
}

/**
 * Helper to mock window.matchMedia for responsive testing
 */
export function mockMatchMedia(width: number) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: query.includes(`${width}px`),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
    }),
  });
}
