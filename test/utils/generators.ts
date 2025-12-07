import * as fc from 'fast-check';

/**
 * Message interface matching the design specification
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Generator for message role
 */
export const roleGenerator = (): fc.Arbitrary<'user' | 'assistant'> => {
  return fc.constantFrom('user', 'assistant');
};

/**
 * Generator for message content
 * Generates non-empty strings with reasonable length
 */
export const contentGenerator = (): fc.Arbitrary<string> => {
  return fc.string({ minLength: 1, maxLength: 500 });
};

/**
 * Generator for message ID
 * Generates UUID-like strings
 */
export const messageIdGenerator = (): fc.Arbitrary<string> => {
  return fc.uuid();
};

/**
 * Generator for timestamps
 * Generates dates within a reasonable range
 */
export const timestampGenerator = (): fc.Arbitrary<Date> => {
  return fc.date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
  });
};

/**
 * Generator for complete Message objects
 */
export const messageGenerator = (): fc.Arbitrary<Message> => {
  return fc.record({
    id: messageIdGenerator(),
    role: roleGenerator(),
    content: contentGenerator(),
    timestamp: timestampGenerator(),
  });
};

/**
 * Generator for arrays of messages
 * @param minLength Minimum number of messages
 * @param maxLength Maximum number of messages
 */
export const messagesArrayGenerator = (
  minLength: number = 0,
  maxLength: number = 20
): fc.Arbitrary<Message[]> => {
  return fc.array(messageGenerator(), { minLength, maxLength });
};

/**
 * Generator for chronologically ordered messages
 */
export const chronologicalMessagesGenerator = (
  minLength: number = 2,
  maxLength: number = 20
): fc.Arbitrary<Message[]> => {
  return messagesArrayGenerator(minLength, maxLength).map((messages) => {
    return messages.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
    );
  });
};

/**
 * Generator for user messages only
 */
export const userMessageGenerator = (): fc.Arbitrary<Message> => {
  return fc.record({
    id: messageIdGenerator(),
    role: fc.constant('user' as const),
    content: contentGenerator(),
    timestamp: timestampGenerator(),
  });
};

/**
 * Generator for assistant messages only
 */
export const assistantMessageGenerator = (): fc.Arbitrary<Message> => {
  return fc.record({
    id: messageIdGenerator(),
    role: fc.constant('assistant' as const),
    content: contentGenerator(),
    timestamp: timestampGenerator(),
  });
};

/**
 * Generator for whitespace-only strings (for testing empty input validation)
 */
export const whitespaceStringGenerator = (): fc.Arbitrary<string> => {
  return fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 })
    .map((chars) => chars.join(''));
};

/**
 * Generator for multi-line text (for testing input expansion)
 */
export const multiLineTextGenerator = (): fc.Arbitrary<string> => {
  return fc
    .array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 })
    .map((lines) => lines.join('\n'));
};
