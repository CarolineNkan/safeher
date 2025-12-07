import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  messageGenerator,
  messagesArrayGenerator,
  roleGenerator,
  contentGenerator,
  whitespaceStringGenerator,
  multiLineTextGenerator,
} from './utils/generators';

describe('Testing Infrastructure Setup', () => {
  it('should have vitest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should have fast-check working', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n;
      })
    );
  });

  describe('Message Generators', () => {
    it('should generate valid message objects', () => {
      fc.assert(
        fc.property(messageGenerator(), (message) => {
          expect(message).toHaveProperty('id');
          expect(message).toHaveProperty('role');
          expect(message).toHaveProperty('content');
          expect(message).toHaveProperty('timestamp');
          expect(['user', 'assistant']).toContain(message.role);
          expect(typeof message.content).toBe('string');
          expect(message.content.length).toBeGreaterThan(0);
          expect(message.timestamp).toBeInstanceOf(Date);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate valid role values', () => {
      fc.assert(
        fc.property(roleGenerator(), (role) => {
          expect(['user', 'assistant']).toContain(role);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate non-empty content', () => {
      fc.assert(
        fc.property(contentGenerator(), (content) => {
          expect(content.length).toBeGreaterThan(0);
          expect(content.length).toBeLessThanOrEqual(500);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate message arrays', () => {
      fc.assert(
        fc.property(messagesArrayGenerator(2, 10), (messages) => {
          expect(Array.isArray(messages)).toBe(true);
          expect(messages.length).toBeGreaterThanOrEqual(2);
          expect(messages.length).toBeLessThanOrEqual(10);
          messages.forEach((msg) => {
            expect(msg).toHaveProperty('id');
            expect(msg).toHaveProperty('role');
            expect(msg).toHaveProperty('content');
            expect(msg).toHaveProperty('timestamp');
          });
          return true;
        }),
        { numRuns: 50 }
      );
    });

    it('should generate whitespace-only strings', () => {
      fc.assert(
        fc.property(whitespaceStringGenerator(), (str) => {
          expect(str.trim()).toBe('');
          expect(str.length).toBeGreaterThan(0);
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should generate multi-line text', () => {
      fc.assert(
        fc.property(multiLineTextGenerator(), (text) => {
          expect(text).toContain('\n');
          const lines = text.split('\n');
          expect(lines.length).toBeGreaterThanOrEqual(2);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
});
