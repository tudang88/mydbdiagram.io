import { ApiClient, ApiResponse } from './ApiClient';

/**
 * Export result
 */
export interface ExportResult {
  success: boolean;
  format?: string;
  filePath?: string;
  downloadUrl?: string;
  data?: string | ArrayBuffer;
  error?: string;
}

/**
 * Service for Export operations
 */
export class ExportService {
  constructor(private apiClient: ApiClient) {}

  /**
   * Export diagram
   */
  async exportDiagram(diagramId: string, format: string, filename?: string): Promise<ExportResult> {
    const response = await this.apiClient.post<{
      success: boolean;
      format: string;
      filePath: string;
      downloadUrl: string;
      data?: string;
    }>(`/api/diagrams/${diagramId}/export`, {
      format,
      filename,
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Export failed',
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'Export data not found in response',
      };
    }

    return {
      success: true,
      format: response.data.format,
      filePath: response.data.filePath,
      downloadUrl: response.data.downloadUrl,
      data: response.data.data,
    };
  }

  /**
   * Get supported export formats
   */
  async getSupportedFormats(): Promise<ApiResponse<{ formats: string[] }>> {
    return await this.apiClient.get<{ formats: string[] }>('/api/diagrams/formats');
  }
}
