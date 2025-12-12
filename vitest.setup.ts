import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.local' });

// Mock scrollIntoView for testing
Element.prototype.scrollIntoView = () => {};

// Cleanup after each test
afterEach(() => {
  cleanup();
});
