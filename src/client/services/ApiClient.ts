/**
 * API Client for HTTP requests
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export class ApiClient {
  constructor(private baseUrl: string = '') {}

  /**
   * GET request
   */
  async get<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * POST request
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

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * PUT request
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

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * DELETE request
   */
  async delete<T>(path: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

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

