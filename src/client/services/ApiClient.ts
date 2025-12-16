import { apiCache } from '../utils/cache';

/**
 * API Client for HTTP requests
 * Includes caching and request optimization
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export class ApiClient {
  constructor(
    private baseUrl: string = '',
    private enableCache: boolean = true
  ) {}

  /**
   * GET request with caching
   */
  async get<T>(path: string, useCache: boolean = true): Promise<ApiResponse<T>> {
    const cacheKey = `GET:${path}`;

    // Check cache first
    if (this.enableCache && useCache) {
      const cached = apiCache.get(cacheKey) as T | null;
      if (cached !== null) {
        return {
          success: true,
          data: cached,
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await this.handleResponse<T>(response);

      // Cache successful responses
      if (this.enableCache && useCache && result.success && result.data) {
        apiCache.set(cacheKey, result.data);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * POST request (invalidates list cache)
   */
  async post<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await this.handleResponse<T>(response);

      // Invalidate list cache on successful creation
      if (this.enableCache && result.success && path.includes('/api/diagrams')) {
        apiCache.delete('GET:/api/diagrams');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * PUT request (invalidates cache for updated resource)
   */
  async put<T>(path: string, data?: unknown): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data ? JSON.stringify(data) : undefined,
      });

      const result = await this.handleResponse<T>(result);

      // Invalidate cache for updated resource and list
      if (this.enableCache && result.success) {
        const cacheKey = `GET:${path}`;
        apiCache.delete(cacheKey);
        apiCache.delete('GET:/api/diagrams');
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * DELETE request (invalidates cache)
   */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Invalidate related cache entries
      if (this.enableCache) {
        const cacheKey = `GET:${path}`;
        apiCache.delete(cacheKey);
        // Also invalidate list cache
        apiCache.delete('GET:/api/diagrams');
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Handle HTTP response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const statusCode = response.status;

    // Handle empty responses (e.g., 204 No Content)
    if (statusCode === 204) {
      return {
        success: true,
        statusCode,
      };
    }

    // Parse JSON response
    let jsonData: unknown;
    try {
      jsonData = await response.json();
    } catch {
      // If response is not JSON, return error
      return {
        success: false,
        error: `Invalid response format: ${response.statusText}`,
        statusCode,
      };
    }

    // Check for error response
    if (!response.ok) {
      const errorData = jsonData as { error?: string; message?: string };
      return {
        success: false,
        error: errorData.message || errorData.error || response.statusText,
        statusCode,
      };
    }

    // Success response
    return {
      success: true,
      data: jsonData as T,
      statusCode,
    };
  }
}

