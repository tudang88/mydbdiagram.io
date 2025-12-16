import { Request, Response } from 'express';
import { ExportService } from '../services/ExportService';

/**
 * Controller for Export endpoints
 */
export class ExportController {
  constructor(private exportService: ExportService) {}

  /**
   * Export diagram
   */
  async export(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { format, filename } = req.body;

      if (!format) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Export format is required',
        });
        return;
      }

      const result = await this.exportService.export(id, format, {
        filename,
        outputDirectory: './output',
      });

      if (!result.success) {
        res.status(500).json({
          error: 'EXPORT_ERROR',
          message: result.error || 'Export failed',
        });
        return;
      }

      // Return file path and data
      res.json({
        success: true,
        format,
        filePath: result.filePath,
        downloadUrl: `/api/files${result.filePath?.replace('./output', '')}`,
        data: result.data,
      });
    } catch (error) {
      console.error('Error exporting diagram:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  /**
   * Get supported export formats
   */
  async getFormats(_req: Request, res: Response): Promise<void> {
    try {
      const formats = this.exportService.getSupportedFormats();
      res.json({ formats });
    } catch (error) {
      console.error('Error getting formats:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }
}

