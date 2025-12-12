/**
 * Network Resilience and Retry Logic Utilities
 * Implements exponential backoff, request queuing, and error recovery
 * Requirements: 8.1, 8.4
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  jitter?: boolean;
  retryCondition?: (error: any) => boolean;
}

export interface QueuedRequest<T = any> {
  id: string;
  operation: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  timestamp: number;
  retryCount: number;
  options: RetryOptions;
}

export interface NetworkStatus {
  isOnline: boolean;
  lastOnlineTime: number | null;
  connectionType: string | null;
}

/**
 * Network resilience manager with queuing and retry capabilities
 */
export class NetworkResilienceManager {
  private requestQueue: Map<string, QueuedRequest> = new Map();
  private networkStatus: NetworkStatus = {
    isOnline: navigator.onLine,
    lastOnlineTime: navigator.onLine ? Date.now() : null,
    connectionType: null
  };
  private processingQueue = false;
  private listeners: Set<(status: NetworkStatus) => void> = new Set();

  constructor() {
    this.initializeNetworkMonitoring();
  }

  /**
   * Initialize network status monitoring
   */
  private initializeNetworkMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Monitor online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Monitor connection type changes if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.networkStatus.connectionType = connection.effectiveType || connection.type;
        connection.addEventListener('change', this.handleConnectionChange.bind(this));
      }
    }
  }

  /**
   * Handle online event
   */
  private handleOnline(): void {
    console.log('🌐 Network back online - processing queued requests');
    this.networkStatus.isOnline = true;
    this.networkStatus.lastOnlineTime = Date.now();
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Handle offline event
   */
  private handleOffline(): void {
    console.log('🌐 Network offline - requests will be queued');
    this.networkStatus.isOnline = false;
    this.notifyListeners();
  }

  /**
   * Handle connection type changes
   */
  private handleConnectionChange(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.networkStatus.connectionType = connection.effectiveType || connection.type;
        console.log(`🌐 Connection type changed to: ${this.networkStatus.connectionType}`);
        this.notifyListeners();
      }
    }
  }

  /**
   * Add network status listener
   */
  public addNetworkStatusListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.add(listener);
  }

  /**
   * Remove network status listener
   */
  public removeNetworkStatusListener(listener: (status: NetworkStatus) => void): void {
    this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of network status changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.networkStatus);
      } catch (error) {
        console.error('Network status listener error:', error);
      }
    });
  }

  /**
   * Get current network status
   */
  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      jitter = true,
      retryCondition = this.defaultRetryCondition
    } = options;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // If offline and not the first attempt, queue the request
        if (!this.networkStatus.isOnline && attempt > 0) {
          return this.queueRequest(operation, options);
        }

        const result = await operation();
        
        // Success - log if this was a retry
        if (attempt > 0) {
          console.log(`✅ Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        // Check if we should retry this error
        if (!retryCondition(error)) {
          console.log('❌ Error not retryable:', error);
          throw error;
        }

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and optional jitter
        let delay = Math.min(baseDelay * Math.pow(backoffFactor, attempt), maxDelay);
        
        if (jitter) {
          // Add random jitter (±25% of delay)
          const jitterAmount = delay * 0.25;
          delay += (Math.random() - 0.5) * 2 * jitterAmount;
        }

        console.warn(`⚠️ Operation failed on attempt ${attempt + 1}, retrying in ${Math.round(delay)}ms:`, error);
        
        // Wait before retry
        await this.delay(delay);
      }
    }

    // All retries exhausted
    console.error(`❌ Operation failed after ${maxRetries + 1} attempts:`, lastError);
    
    // If offline, queue the request for later
    if (!this.networkStatus.isOnline) {
      console.log('📤 Queueing failed request for when network returns');
      return this.queueRequest(operation, options);
    }
    
    throw lastError;
  }

  /**
   * Queue request for later execution when network is available
   */
  private queueRequest<T>(
    operation: () => Promise<T>,
    options: RetryOptions
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const requestId = this.generateRequestId();
      const queuedRequest: QueuedRequest<T> = {
        id: requestId,
        operation,
        resolve,
        reject,
        timestamp: Date.now(),
        retryCount: 0,
        options
      };

      this.requestQueue.set(requestId, queuedRequest);
      console.log(`📤 Request queued (${requestId}). Queue size: ${this.requestQueue.size}`);

      // Clean up old queued requests (older than 1 hour)
      this.cleanupOldRequests();
    });
  }

  /**
   * Process queued requests when network is available
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.size === 0) {
      return;
    }

    this.processingQueue = true;
    console.log(`📥 Processing ${this.requestQueue.size} queued requests`);

    const requests = Array.from(this.requestQueue.values());
    
    for (const request of requests) {
      try {
        // Remove from queue before processing
        this.requestQueue.delete(request.id);
        
        // Execute the queued operation with retry logic
        const result = await this.executeWithRetry(request.operation, request.options);
        request.resolve(result);
        
        console.log(`✅ Queued request ${request.id} processed successfully`);
        
        // Small delay between processing requests to avoid overwhelming the server
        await this.delay(100);
        
      } catch (error) {
        console.error(`❌ Queued request ${request.id} failed:`, error);
        request.reject(error);
      }
    }

    this.processingQueue = false;
    console.log('📥 Queue processing completed');
  }

  /**
   * Default retry condition - retry on network errors and 5xx server errors
   */
  private defaultRetryCondition(error: any): boolean {
    // Network errors (including generic Error with network-related messages)
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true;
    }
    
    // Generic network errors
    if (error.message && (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('fetch')
    )) {
      return true;
    }
    
    // Timeout errors
    if (error.name === 'AbortError' || error.message.includes('timeout')) {
      return true;
    }
    
    // HTTP errors
    if (error.status) {
      // Retry on 5xx server errors and some 4xx errors
      return error.status >= 500 || 
             error.status === 408 || // Request Timeout
             error.status === 429 || // Too Many Requests
             error.status === 502 || // Bad Gateway
             error.status === 503 || // Service Unavailable
             error.status === 504;   // Gateway Timeout
    }
    
    return false;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Clean up old queued requests
   */
  private cleanupOldRequests(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let cleanedCount = 0;

    for (const [id, request] of this.requestQueue.entries()) {
      if (request.timestamp < oneHourAgo) {
        this.requestQueue.delete(id);
        request.reject(new Error('Request expired in queue'));
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired queued requests`);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  public getQueueStatus(): { size: number; oldestTimestamp: number | null } {
    const requests = Array.from(this.requestQueue.values());
    return {
      size: requests.length,
      oldestTimestamp: requests.length > 0 
        ? Math.min(...requests.map(r => r.timestamp))
        : null
    };
  }

  /**
   * Clear all queued requests
   */
  public clearQueue(): void {
    const count = this.requestQueue.size;
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue.clear();
    console.log(`🧹 Cleared ${count} queued requests`);
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
    this.clearQueue();
    this.listeners.clear();
  }
}

// Global instance
export const networkManager = new NetworkResilienceManager();

/**
 * Convenience function for executing operations with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  return networkManager.executeWithRetry(operation, options);
}

/**
 * Enhanced fetch with retry logic and network resilience
 */
export async function resilientFetch(
  url: string,
  options: RequestInit = {},
  retryOptions?: RetryOptions
): Promise<Response> {
  const fetchOperation = async (): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is ok
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        (error as any).response = response;
        throw error;
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  return executeWithRetry(fetchOperation, retryOptions);
}

/**
 * Enhanced JSON fetch with retry logic
 */
export async function resilientFetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  retryOptions?: RetryOptions
): Promise<T> {
  const response = await resilientFetch(url, options, retryOptions);
  return response.json();
}

/**
 * SOS-specific retry options for critical emergency operations
 */
export const SOS_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 5, // More retries for critical SOS operations
  baseDelay: 1000, // Start with 1 second
  maxDelay: 30000, // Max 30 seconds between retries
  backoffFactor: 2, // Exponential backoff
  jitter: true, // Add randomness to avoid thundering herd
  retryCondition: (error: any) => {
    // Retry on all network errors and server errors for SOS operations
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return true;
    }
    
    if (error.message && (
      error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('connection') ||
      error.message.toLowerCase().includes('timeout') ||
      error.message.toLowerCase().includes('fetch')
    )) {
      return true;
    }
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return true;
    }
    
    if (error.status) {
      // For SOS operations, retry on more error codes
      return error.status >= 500 || 
             error.status === 408 || // Request Timeout
             error.status === 429 || // Too Many Requests
             error.status === 502 || // Bad Gateway
             error.status === 503 || // Service Unavailable
             error.status === 504 || // Gateway Timeout
             error.status === 522 || // Connection Timed Out
             error.status === 524;   // A Timeout Occurred
    }
    
    return false;
  }
};

/**
 * Location update specific retry options (less aggressive for frequent updates)
 */
export const LOCATION_UPDATE_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3, // Fewer retries for frequent location updates
  baseDelay: 500, // Shorter initial delay
  maxDelay: 10000, // Max 10 seconds
  backoffFactor: 1.5, // Less aggressive backoff
  jitter: true,
  retryCondition: (error: any) => {
    // Similar to SOS but less aggressive
    if (error.name === 'TypeError' && error.message?.includes('fetch')) {
      return true;
    }
    
    if (error.status) {
      return error.status >= 500 || 
             error.status === 408 || 
             error.status === 502 || 
             error.status === 503 || 
             error.status === 504;
    }
    
    return false;
  }
};