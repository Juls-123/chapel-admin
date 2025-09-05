// Client-side request factory for standardized API calls with automatic JWT token handling
// PHASE 2: Centralized client-side request handling with Supabase integration

import { getAuthHeaders } from '@/lib/auth';

// Standardized error response format
export interface ApiError {
  error: true;
  message: string;
  code: string;
  details?: string;
}

// Success response format
export interface ApiSuccess<T = any> {
  error: false;
  data: T;
  message?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

// Request options interface
export interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
  timeout?: number;
}

// Request factory class
class RequestFactory {
  private baseURL: string;

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  /**
   * Make an authenticated request with automatic JWT token handling
   */
  async request<T = any>(
    endpoint: string, 
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      requireAuth = true,
      timeout = 30000, // 30 seconds default timeout
      headers = {},
      ...fetchOptions
    } = options;

    // Build full URL
    const url = `${this.baseURL}${endpoint}`;

    // Prepare headers
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    // Add authentication headers if required
    if (requireAuth) {
      try {
        const authHeaders = await getAuthHeaders();
        Object.assign(requestHeaders, authHeaders);
      } catch (error) {
        console.warn('Failed to get auth headers:', error);
        // Continue without auth headers - let the server handle 401 responses
      }
    }

    // Set up timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorCode = 'HTTP_ERROR';
        let errorDetails: string | undefined;

        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          if (errorData.code) {
            errorCode = errorData.code;
          }
          if (errorData.details) {
            errorDetails = errorData.details;
          }
        } catch {
          // If response is not JSON, use the default error message
        }

        // Handle specific HTTP status codes
        if (response.status === 401) {
          errorCode = 'UNAUTHORIZED';
          errorMessage = 'Authentication required. Please log in again.';
          // Optionally trigger redirect to login
          this.handleUnauthorized();
        } else if (response.status === 403) {
          errorCode = 'FORBIDDEN';
          errorMessage = 'Access denied. Insufficient permissions.';
        } else if (response.status === 404) {
          errorCode = 'NOT_FOUND';
          errorMessage = 'Resource not found.';
        } else if (response.status >= 500) {
          errorCode = 'SERVER_ERROR';
          errorMessage = 'Server error. Please try again later.';
        }

        const error = new Error(errorMessage) as Error & {
          status: number;
          code: string;
          details?: string;
        };
        error.status = response.status;
        error.code = errorCode;
        error.details = errorDetails;
        throw error;
      }

      // Parse response
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        // Check if response has error format
        if (data.error) {
          const error = new Error(data.message || 'API error') as Error & {
            status: number;
            code: string;
            details?: string;
          };
          error.status = response.status;
          error.code = data.code || 'API_ERROR';
          error.details = data.details;
          throw error;
        }

        // Return data (either from data property or the response itself)
        return data.data !== undefined ? data.data : data;
      } else {
        // Handle non-JSON responses
        return await response.text() as unknown as T;
      }

    } catch (error) {
      clearTimeout(timeoutId);

      // Handle AbortError (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`) as Error & {
          status: number;
          code: string;
        };
        timeoutError.status = 408;
        timeoutError.code = 'TIMEOUT';
        throw timeoutError;
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Handle unauthorized responses (401)
   */
  private handleUnauthorized(): void {
    // Optionally redirect to login or clear auth state
    console.warn('Unauthorized request - user may need to log in again');
    
    // You can add redirect logic here if needed
    // window.location.href = '/login';
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Create and export a default instance
export const apiClient = new RequestFactory();

// Export the class for custom instances
export { RequestFactory };

// Convenience functions for common operations
export const api = {
  get: <T = any>(endpoint: string, options?: RequestOptions) => apiClient.get<T>(endpoint, options),
  post: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => apiClient.post<T>(endpoint, data, options),
  put: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => apiClient.put<T>(endpoint, data, options),
  patch: <T = any>(endpoint: string, data?: any, options?: RequestOptions) => apiClient.patch<T>(endpoint, data, options),
  delete: <T = any>(endpoint: string, options?: RequestOptions) => apiClient.delete<T>(endpoint, options),
};
