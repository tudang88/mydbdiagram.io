import { Request, Response } from 'express';
import { DiagramService } from '../services/DiagramService';
import { ValidationService } from '../services/ValidationService';

/**
 * Controller for Diagram endpoints
 */
export class DiagramController {
  constructor(
    private diagramService: DiagramService,
    private validationService: ValidationService
  ) {}

  /**
   * Create a new diagram
   */
  async create(req: Request, res: Response): Promise<void> {
    try {
      const validation = this.validationService.validateDiagram(req.body);
      if (!validation.isValid) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid diagram data',
          details: validation.errors,
        });
        return;
      }

      const diagram = await this.diagramService.create(req.body);
      res.status(201).json(diagram);
    } catch (error) {
      console.error('Error creating diagram:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  /**
   * Get diagram by ID
   */
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const diagram = await this.diagramService.findById(id);

      if (!diagram) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Diagram with id ${id} not found`,
        });
        return;
      }

      res.json(diagram);
    } catch (error) {
      console.error('Error getting diagram:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  /**
   * List all diagrams
   */
  async list(_req: Request, res: Response): Promise<void> {
    try {
      const diagrams = await this.diagramService.findAll();
      res.json({ diagrams });
    } catch (error) {
      console.error('Error listing diagrams:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  /**
   * Update diagram
   */
  async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const validation = this.validationService.validateDiagram(req.body);

      if (!validation.isValid) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid diagram data',
          details: validation.errors,
        });
        return;
      }

      const diagram = await this.diagramService.update(id, req.body);

      if (!diagram) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Diagram with id ${id} not found`,
        });
        return;
      }

      res.json(diagram);
    } catch (error) {
      console.error('Error updating diagram:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }

  /**
   * Delete diagram
   */
  async delete(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.diagramService.delete(id);

      if (!deleted) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `Diagram with id ${id} not found`,
        });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting diagram:', error);
      res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }
}

