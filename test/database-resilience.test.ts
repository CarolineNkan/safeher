/**
 * Database Resilience Tests
 * Tests for database error handling and recovery utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DatabaseErrorHandler, ResilientDatabaseClient, ErrorMessageFormatter } from '@/utils/database-resilience';

describe('Database Resilience', () => {
  describe('DatabaseErrorHandler', () => {
    it('should classify known database errors correctly', () => {
      const error = { code: 'PGRST116', message: 'Record not found' };
      const classified = DatabaseErrorHandler.classifyError(error);
      
      expect(classified.code).toBe('PGRST116');
      expect(classified.isRetryable).toBe(false);
      expect(classified.userMessage).toBe('Record not found.');
    });

    it('should classify connection errors as retryable', () => {
      const error = { code: 'PGRST301', message: 'Connection failed' };
      const classified = DatabaseErrorHandler.classifyError(error);
      
      expect(classified.isRetryable).toBe(true);
      expect(classified.userMessage).toBe('Database connection issue. Retrying...');
    });

    it('should handle unknown errors gracefully', () => {
      const error = { code: 'UNKNOWN_ERROR', message: 'Something went wrong' };
      const classified = DatabaseErrorHandler.classifyError(error);
      
      expect(classified.code).toBe('UNKNOWN_ERROR');
      expect(classified.userMessage).toBe('A database error occurred.');
    });

    it('should provide user guidance for errors', () => {
      const error = DatabaseErrorHandler.classifyError({ code: 'PGRST103' });
      const guidance = DatabaseErrorHandler.getUserGuidance(error);
      
      expect(guidance).toContain('Try refreshing the page and logging in again.');
    });
  });

  describe('ErrorMessageFormatter', () => {
    it('should format error for user display', () => {
      const dbError = DatabaseErrorHandler.classifyError({ 
        code: 'PGRST301', 
        message: 'Connection failed' 
      });
      
      const formatted = ErrorMessageFormatter.formatForUser(dbError);
      
      expect(formatted.title).toBe('Temporary Issue');
      expect(formatted.severity).toBe('warning');
      expect(formatted.actions).toBeInstanceOf(Array);
    });

    it('should format error for logging', () => {
      const dbError = DatabaseErrorHandler.classifyError({ 
        code: 'PGRST116', 
        message: 'Record not found',
        details: { table: 'users' }
      });
      
      const formatted = ErrorMessageFormatter.formatForLogging(dbError);
      
      expect(formatted).toContain('Database Error [PGRST116]');
      expect(formatted).toContain('Record not found');
      expect(formatted).toContain('Retryable: false');
    });
  });

  describe('ResilientDatabaseClient', () => {
    let mockClient: any;
    let resilientClient: ResilientDatabaseClient;

    beforeEach(() => {
      mockClient = {
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
      
      resilientClient = new ResilientDatabaseClient(mockClient);
    });

    it('should execute successful database operation', async () => {
      // Mock the full chain for select operation
      mockClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null })
      });
      
      const result = await resilientClient.select('test_table');
      
      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.error).toBeNull();
    });

    it('should handle database errors', async () => {
      // Mock the full chain for select operation with error
      mockClient.from.mockReturnValue({
        select: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { code: 'PGRST116', message: 'Not found' } 
        })
      });
      
      const result = await resilientClient.select('test_table');
      
      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('PGRST116');
    });

    it('should retry retryable errors', async () => {
      const mockSelect = vi.fn()
        .mockResolvedValueOnce({ 
          data: null, 
          error: { code: 'PGRST301', message: 'Connection failed' } 
        })
        .mockResolvedValue({ data: [{ id: 1 }], error: null });
      
      mockClient.from.mockReturnValue({
        select: mockSelect
      });
      
      const result = await resilientClient.select('test_table', '*', {
        maxRetries: 1,
        baseDelay: 10
      });
      
      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.error).toBeNull();
      expect(mockSelect).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const mockSelect = vi.fn().mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116', message: 'Not found' } 
      });
      
      mockClient.from.mockReturnValue({
        select: mockSelect
      });
      
      const result = await resilientClient.select('test_table');
      
      expect(result.data).toBeNull();
      expect(result.error?.isRetryable).toBe(false);
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it('should test database connection', async () => {
      mockClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });
      
      const health = await resilientClient.testConnection();
      
      expect(health.isHealthy).toBe(true);
      expect(health.error).toBeNull();
    });
  });
});