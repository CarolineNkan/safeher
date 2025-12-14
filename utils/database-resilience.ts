/**
 * Database Error Recovery and User Feedback Utilities
 * Implements retry logic for database operations and comprehensive error handling
 * Requirements: 8.3, 8.5
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
  hint?: string;
  isRetryable: boolean;
  userMessage: string;
  userAction?: string;
}

export interface DatabaseRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
}

/**
 * Database error classification and user-friendly messages
 */
export class DatabaseErrorHandler {
  private static readonly ERROR_MAPPINGS: Record<string, Partial<DatabaseError>> = {
    // Connection errors
    'PGRST301': {
      isRetryable: true,
      userMessage: 'Database connection issue. Retrying...',
      userAction: 'Please wait while we reconnect to the database.'
    },
    'PGRST302': {
      isRetryable: true,
      userMessage: 'Database temporarily unavailable.',
      userAction: 'Please try again in a few moments.'
    },
    
    // Authentication errors
    'PGRST103': {
      isRetryable: false,
      userMessage: 'Authentication required.',
      userAction: 'Please log in again to continue.'
    },
    'PGRST104': {
      isRetryable: false,
      userMessage: 'Access denied.',
      userAction: 'You do not have permission to perform this action.'
    },
    
    // Data validation errors
    'PGRST116': {
      isRetryable: false,
      userMessage: 'Record not found.',
      userAction: 'The requested item may have been deleted or moved.'
    },
    'PGRST202': {
      isRetryable: false,
      userMessage: 'Invalid data provided.',
      userAction: 'Please check your input and try again.'
    },
    
    // Constraint violations
    '23505': {
      isRetryable: false,
      userMessage: 'Duplicate entry detected.',
      userAction: 'This item already exists. Please use a different value.'
    },
    '23503': {
      isRetryable: false,
      userMessage: 'Related record not found.',
      userAction: 'Please ensure all required information is provided.'
    },
    '23514': {
      isRetryable: false,
      userMessage: 'Data validation failed.',
      userAction: 'Please check that all fields contain valid values.'
    },
    
    // Resource errors
    '53300': {
      isRetryable: true,
      userMessage: 'Database is busy.',
      userAction: 'Please wait a moment and try again.'
    },
    '08006': {
      isRetryable: true,
      userMessage: 'Connection lost.',
      userAction: 'Reconnecting to database...'
    },
    
    // Table/schema errors
    '42P01': {
      isRetryable: false,
      userMessage: 'Service temporarily unavailable.',
      userAction: 'Please contact support if this issue persists.'
    },
    '42703': {
      isRetryable: false,
      userMessage: 'Data format error.',
      userAction: 'Please contact support - there may be a system issue.'
    }
  };

  /**
   * Classify database error and provide user-friendly information
   */
  public static classifyError(error: any): DatabaseError {
    const code = error?.code || error?.error?.code || 'UNKNOWN';
    const message = error?.message || error?.error?.message || 'Unknown database error';
    const details = error?.details || error?.error?.details;
    const hint = error?.hint || error?.error?.hint;

    const mapping = this.ERROR_MAPPINGS[code] || {
      isRetryable: this.isDefaultRetryable(error),
      userMessage: 'A database error occurred.',
      userAction: 'Please try again. If the problem persists, contact support.'
    };

    return {
      code,
      message,
      details,
      hint,
      isRetryable: mapping.isRetryable!,
      userMessage: mapping.userMessage!,
      userAction: mapping.userAction
    };
  }

  /**
   * Default retry logic for unknown errors
   */
  private static isDefaultRetryable(error: any): boolean {
    const message = (error?.message || '').toLowerCase();
    
    // Network-related errors are usually retryable
    if (message.includes('network') || 
        message.includes('timeout') || 
        message.includes('connection') ||
        message.includes('fetch')) {
      return true;
    }
    
    // Server errors (5xx) are usually retryable
    if (error?.status >= 500) {
      return true;
    }
    
    // Default to not retryable for safety
    return false;
  }

  /**
   * Get user guidance for resolving common database issues
   */
  public static getUserGuidance(error: DatabaseError): string[] {
    const guidance: string[] = [];

    if (error.isRetryable) {
      guidance.push('This is usually a temporary issue that resolves automatically.');
      guidance.push('The system will retry the operation for you.');
    }

    switch (error.code) {
      case 'PGRST103':
      case 'PGRST104':
        guidance.push('Try refreshing the page and logging in again.');
        guidance.push('Clear your browser cache if the problem persists.');
        break;
        
      case '23505':
        guidance.push('Check if you\'re trying to create something that already exists.');
        guidance.push('Try using a different name or identifier.');
        break;
        
      case 'PGRST116':
        guidance.push('The item you\'re looking for may have been deleted.');
        guidance.push('Try refreshing the page to see the latest data.');
        break;
        
      case '53300':
        guidance.push('The database is experiencing high load.');
        guidance.push('Wait 30-60 seconds before trying again.');
        break;
        
      case '08006':
      case 'PGRST301':
      case 'PGRST302':
        guidance.push('Check your internet connection.');
        guidance.push('The system will automatically reconnect when possible.');
        break;
        
      default:
        if (error.isRetryable) {
          guidance.push('Wait a few moments and the operation will be retried automatically.');
        } else {
          guidance.push('Please check your input data for any errors.');
          guidance.push('Contact support if you continue to see this error.');
        }
    }

    return guidance;
  }
}

/**
 * Database operations with retry logic and error recovery
 */
export class ResilientDatabaseClient {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Execute database operation with retry logic
   */
  public async executeWithRetry<T>(
    operation: (client: SupabaseClient) => Promise<{ data: T | null; error: any }>,
    options: DatabaseRetryOptions = {}
  ): Promise<{ data: T | null; error: DatabaseError | null }> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      backoffFactor = 2,
      retryCondition = (error) => DatabaseErrorHandler.classifyError(error).isRetryable
    } = options;

    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🗄️ Database operation attempt ${attempt + 1}`);
        
        const result = await operation(this.client);
        
        if (result.error) {
          const classifiedError = DatabaseErrorHandler.classifyError(result.error);
          
          // If error is not retryable, return immediately
          if (!retryCondition(result.error)) {
            console.error('❌ Non-retryable database error:', classifiedError);
            return { data: null, error: classifiedError };
          }
          
          lastError = result.error;
          
          // Don't retry on the last attempt
          if (attempt === maxRetries) {
            break;
          }
          
          // Calculate delay with exponential backoff
          const delay = baseDelay * Math.pow(backoffFactor, attempt);
          console.warn(`⚠️ Database operation failed on attempt ${attempt + 1}, retrying in ${delay}ms:`, classifiedError.userMessage);
          
          // Wait before retry
          await this.delay(delay);
          continue;
        }
        
        // Success
        if (attempt > 0) {
          console.log(`✅ Database operation succeeded on attempt ${attempt + 1}`);
        }
        
        return { data: result.data, error: null };
        
      } catch (error) {
        lastError = error;
        
        const classifiedError = DatabaseErrorHandler.classifyError(error);
        
        // If error is not retryable, return immediately
        if (!retryCondition(error)) {
          console.error('❌ Non-retryable database error:', classifiedError);
          return { data: null, error: classifiedError };
        }
        
        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(backoffFactor, attempt);
        console.warn(`⚠️ Database operation failed on attempt ${attempt + 1}, retrying in ${delay}ms:`, classifiedError.userMessage);
        
        // Wait before retry
        await this.delay(delay);
      }
    }

    // All retries exhausted
    const finalError = DatabaseErrorHandler.classifyError(lastError);
    console.error(`❌ Database operation failed after ${maxRetries + 1} attempts:`, finalError);
    
    return { data: null, error: finalError };
  }

  /**
   * Resilient select operation
   */
  public async select<T>(
    table: string,
    query?: string,
    options?: DatabaseRetryOptions
  ): Promise<{ data: T[] | null; error: DatabaseError | null }> {
    const result = await this.executeWithRetry(async (client) => {
      return await client.from(table).select(query || '*');
    }, options);
    
    // Ensure we return the data as an array for select operations
    if (result.data && !Array.isArray(result.data)) {
      return { data: [result.data] as T[], error: result.error };
    }
    
    return result as { data: T[] | null; error: DatabaseError | null };
  }

  /**
   * Resilient insert operation
   */
  public async insert<T>(
    table: string,
    data: any,
    options?: DatabaseRetryOptions
  ): Promise<{ data: T | null; error: DatabaseError | null }> {
    return this.executeWithRetry(async (client) => {
      return await client.from(table).insert(data).select().single();
    }, options);
  }

  /**
   * Resilient update operation
   */
  public async update<T>(
    table: string,
    data: any,
    match: any,
    options?: DatabaseRetryOptions
  ): Promise<{ data: T | null; error: DatabaseError | null }> {
    return this.executeWithRetry(async (client) => {
      return await client.from(table).update(data).match(match).select().single();
    }, options);
  }

  /**
   * Resilient delete operation
   */
  public async delete<T>(
    table: string,
    match: any,
    options?: DatabaseRetryOptions
  ): Promise<{ data: T | null; error: DatabaseError | null }> {
    return this.executeWithRetry(async (client) => {
      return await client.from(table).delete().match(match).select().single();
    }, options);
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<{ isHealthy: boolean; error: DatabaseError | null }> {
    try {
      const result = await this.executeWithRetry(async (client) => {
        return await client.from('sos_events').select('id').limit(1);
      }, { maxRetries: 1 });

      return {
        isHealthy: result.error === null,
        error: result.error
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: DatabaseErrorHandler.classifyError(error)
      };
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create resilient database client
 */
export function createResilientDatabaseClient(): ResilientDatabaseClient {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
  
  return new ResilientDatabaseClient(supabase);
}

/**
 * Error message formatter for user display
 */
export class ErrorMessageFormatter {
  /**
   * Format error for user display with actionable guidance
   */
  public static formatForUser(error: DatabaseError): {
    title: string;
    message: string;
    actions: string[];
    severity: 'error' | 'warning' | 'info';
  } {
    const guidance = DatabaseErrorHandler.getUserGuidance(error);
    
    let severity: 'error' | 'warning' | 'info' = 'error';
    if (error.isRetryable) {
      severity = 'warning';
    }
    
    let title = 'Database Error';
    if (error.isRetryable) {
      title = 'Temporary Issue';
    }
    
    return {
      title,
      message: error.userMessage,
      actions: guidance,
      severity
    };
  }

  /**
   * Format error for logging/debugging
   */
  public static formatForLogging(error: DatabaseError): string {
    return `Database Error [${error.code}]: ${error.message}${
      error.details ? ` | Details: ${JSON.stringify(error.details)}` : ''
    }${
      error.hint ? ` | Hint: ${error.hint}` : ''
    } | Retryable: ${error.isRetryable}`;
  }
}