import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Mock scrollIntoView for testing
Element.prototype.scrollIntoView = () => {};

// Cleanup after each test
afterEach(() => {
  cleanup();
});
