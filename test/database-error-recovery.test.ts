/**
 * Database Error Recovery Integration Tests
 * Tests the complete database error recovery and user feedback system
 * Requirements: 8.3, 8.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResilientDatabaseClient, DatabaseErrorHandler, ErrorMessageFormatter } from '@/utils/database-resilience';

describe('Database Error Recovery Integration', () => {
  let mockSupabaseClient: any;
  let resilientClient: ResilientDatabaseClient;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn()
    };

    resilientClient = new ResilientDatabaseClient(mockSupabaseClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Classification and User Feedback', () => {
    it('should provide appropriate user feedback for connection errors', () => {
      const error = { code: 'PGRST301', message: 'Connection failed' };
      const classified = DatabaseErrorHandler.classifyError(error);
      const userFeedback = ErrorMessageFormatter.formatForUser(classified);

      expect(classified.isRetryable).toBe(true);
      expect(userFeedback.title).toBe('Temporary Issue');
      expect(userFeedback.severity).toBe('warning');
      expect(userFeedback.message).toBe('Database connection issue. Retrying...');
      expect(userFeedback.actions).toContain('Check your internet connection.');
    });

    it('should provide appropriate user feedback for authentication errors', () => {
      const error = { code: 'PGRST103', message: 'Authentication required' };
      const classified = DatabaseErrorHandler.classifyError(error);
      const userFeedback = ErrorMessageFormatter.formatForUser(classified);

      expect(classified.isRetryable).toBe(false);
      expect(userFeedback.title).toBe('Database Error');
      expect(userFeedback.severity).toBe('error');
      expect(userFeedback.message).toBe('Authentication required.');
      expect(userFeedback.actions).toContain('Try refreshing the page and logging in again.');
    });

    it('should provide appropriate user feedback for constraint violations', () => {
      const error = { code: '23505', message: 'Duplicate key value violates unique constraint' };
      const classified = DatabaseErrorHandler.classifyError(error);
      const userFeedback = ErrorMessageFormatter.formatForUser(classified);

      expect(classified.isRetryable).toBe(false);
      expect(userFeedback.message).toBe('Duplicate entry detected.');
      expect(userFeedback.actions).toContain('Try using a different name or identifier.');
    });

    it('should provide appropriate user feedback for record not found errors', () => {
      const error = { code: 'PGRST116', message: 'Record not found' };
      const classified = DatabaseErrorHandler.classifyError(error);
      const userFeedback = ErrorMessageFormatter.formatForUser(classified);

      expect(classified.isRetryable).toBe(false);
      expect(userFeedback.message).toBe('Record not found.');
      expect(userFeedback.actions).toContain('Try refreshing the page to see the latest data.');
    });
  });

  describe('Retry Logic Integration', () => {
    it('should retry retryable database operations with exponential backoff', async () => {
      const mockSelect = vi.fn()
        .mockResolvedValueOnce({ 
          data: null, 
          error: { code: 'PGRST301', message: 'Connection failed' } 
        })
        .mockResolvedValueOnce({ 
          data: null, 
          error: { code: '53300', message: 'Database busy' } 
        })
        .mockResolvedValue({ data: [{ id: 1, name: 'Test Contact' }], error: null });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const startTime = Date.now();
      const result = await resilientClient.select('emergency_contacts', '*', {
        maxRetries: 2,
        baseDelay: 10,
        backoffFactor: 2
      });
      const endTime = Date.now();

      expect(result.data).toEqual([{ id: 1, name: 'Test Contact' }]);
      expect(result.error).toBeNull();
      expect(mockSelect).toHaveBeenCalledTimes(3);
      
      // Should have waited for retries (10ms + 20ms = 30ms minimum)
      expect(endTime - startTime).toBeGreaterThan(25);
    });

    it('should not retry non-retryable errors', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Record not found' } 
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect
      });

      const result = await resilientClient.select('emergency_contacts');

      expect(result.data).toBeNull();
      expect(result.error?.isRetryable).toBe(false);
      expect(result.error?.code).toBe('PGRST116');
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed error scenarios correctly', async () => {
      const mockInsert = vi.fn()
        .mockResolvedValueOnce({ 
          data: null, 
          error: { code: 'PGRST301', message: 'Connection failed' } 
        })
        .mockResolvedValue({ 
          data: null, 
          error: { code: '23505', message: 'Duplicate key' } 
        });

      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      const result = await resilientClient.insert('emergency_contacts', {
        name: 'Test Contact',
        phone: '1234567890'
      }, {
        maxRetries: 2,
        baseDelay: 10
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('23505');
      expect(result.error?.isRetryable).toBe(false);
      expect(mockInsert).toHaveBeenCalledTimes(2); // First call retried, second failed
    });
  });

  describe('Database Health Monitoring', () => {
    it('should correctly assess database health when connection is good', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      const health = await resilientClient.testConnection();

      expect(health.isHealthy).toBe(true);
      expect(health.error).toBeNull();
    });

    it('should correctly assess database health when connection fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { code: 'PGRST301', message: 'Connection failed' } 
          })
        })
      });

      const health = await resilientClient.testConnection();

      expect(health.isHealthy).toBe(false);
      expect(health.error?.code).toBe('PGRST301');
      expect(health.error?.isRetryable).toBe(true);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format errors for logging with all relevant details', () => {
      const error = {
        code: 'PGRST116',
        message: 'Record not found',
        details: { table: 'emergency_contacts', id: '123' },
        hint: 'Check if the record exists'
      };

      const classified = DatabaseErrorHandler.classifyError(error);
      const logMessage = ErrorMessageFormatter.formatForLogging(classified);

      expect(logMessage).toContain('Database Error [PGRST116]');
      expect(logMessage).toContain('Record not found');
      expect(logMessage).toContain('Details: {"table":"emergency_contacts","id":"123"}');
      expect(logMessage).toContain('Hint: Check if the record exists');
      expect(logMessage).toContain('Retryable: false');
    });

    it('should handle errors without optional fields gracefully', () => {
      const error = { code: 'UNKNOWN', message: 'Something went wrong' };
      const classified = DatabaseErrorHandler.classifyError(error);
      const logMessage = ErrorMessageFormatter.formatForLogging(classified);

      expect(logMessage).toContain('Database Error [UNKNOWN]');
      expect(logMessage).toContain('Something went wrong');
      expect(logMessage).not.toContain('Details:');
      expect(logMessage).not.toContain('Hint:');
      expect(logMessage).toContain('Retryable: false');
    });
  });

  describe('User Guidance System', () => {
    it('should provide comprehensive guidance for common issues', () => {
      const scenarios = [
        {
          code: 'PGRST103',
          expectedGuidance: ['Try refreshing the page and logging in again.']
        },
        {
          code: '23505',
          expectedGuidance: ['Check if you\'re trying to create something that already exists.']
        },
        {
          code: '53300',
          expectedGuidance: ['Wait 30-60 seconds before trying again.']
        },
        {
          code: '08006',
          expectedGuidance: ['Check your internet connection.']
        }
      ];

      scenarios.forEach(({ code, expectedGuidance }) => {
        const error = DatabaseErrorHandler.classifyError({ code, message: 'Test error' });
        const guidance = DatabaseErrorHandler.getUserGuidance(error);
        
        expectedGuidance.forEach(expected => {
          expect(guidance).toContain(expected);
        });
      });
    });

    it('should provide default guidance for unknown errors', () => {
      const error = DatabaseErrorHandler.classifyError({ 
        code: 'UNKNOWN_ERROR', 
        message: 'Something unexpected happened' 
      });
      const guidance = DatabaseErrorHandler.getUserGuidance(error);

      expect(guidance).toContain('Please check your input data for any errors.');
      expect(guidance).toContain('Contact support if you continue to see this error.');
    });
  });
});