/**
 * Network Resilience Tests
 * Tests for network resilience utilities and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkResilienceManager, executeWithRetry, resilientFetch } from '@/utils/network-resilience';

describe('Network Resilience', () => {
  let networkManager: NetworkResilienceManager;

  beforeEach(() => {
    networkManager = new NetworkResilienceManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    networkManager.cleanup();
  });

  describe('NetworkResilienceManager', () => {
    it('should initialize with correct default network status', () => {
      const status = networkManager.getNetworkStatus();
      expect(status).toHaveProperty('isOnline');
      expect(status).toHaveProperty('lastOnlineTime');
      expect(status).toHaveProperty('connectionType');
    });

    it('should execute operation successfully on first try', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      const result = await networkManager.executeWithRetry(mockOperation);
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry operation on failure', async () => {
      const mockOperation = vi.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue('success');
      
      const result = await networkManager.executeWithRetry(mockOperation, {
        maxRetries: 2,
        baseDelay: 10 // Fast for testing
      });
      
      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should respect retry condition', async () => {
      const mockOperation = vi.fn().mockRejectedValue(new Error('Validation error'));
      
      await expect(
        networkManager.executeWithRetry(mockOperation, {
          maxRetries: 2,
          retryCondition: (error) => !error.message.includes('Validation')
        })
      ).rejects.toThrow('Validation error');
      
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should handle queue operations', async () => {
      const queueStatus = networkManager.getQueueStatus();
      expect(queueStatus.size).toBe(0);
      expect(queueStatus.oldestTimestamp).toBeNull();
    });
  });

  describe('executeWithRetry', () => {
    it('should work as standalone function', async () => {
      const mockOperation = vi.fn().mockResolvedValue('standalone success');
      
      const result = await executeWithRetry(mockOperation);
      
      expect(result).toBe('standalone success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  describe('resilientFetch', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should make successful fetch request', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);
      
      const response = await resilientFetch('/api/test');
      
      expect(response).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith('/api/test', expect.any(Object));
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      
      (global.fetch as any).mockResolvedValue(mockResponse);
      
      await expect(resilientFetch('/api/test', {}, { maxRetries: 0 })).rejects.toThrow('HTTP 500: Internal Server Error');
    }, 10000);

    it('should handle network errors with retry', async () => {
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ ok: true });
      
      const response = await resilientFetch('/api/test', {}, {
        maxRetries: 1,
        baseDelay: 10
      });
      
      expect(response.ok).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});