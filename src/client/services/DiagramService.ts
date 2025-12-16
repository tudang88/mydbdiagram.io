import { ApiClient } from './ApiClient';
import { DiagramData } from '../types/diagram.types';
import { DiagramValidator } from '../core/validator/DiagramValidator';
import { Diagram } from '../core/diagram/Diagram';
import { debounce } from '../utils/debounce';

/**
 * Service for Diagram operations
 */
export interface SaveResult {
  success: boolean;
  data?: DiagramData;
  errors?: Array<{ field: string; message: string }>;
}

export interface LoadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ListResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export class DiagramService {
  constructor(
    private apiClient: ApiClient,
    private validator: DiagramValidator
  ) {}

  /**
   * Save diagram
   */
  async saveDiagram(diagram: Diagram): Promise<SaveResult> {
    return this.saveDiagramInternal(diagram);
  }

  /**
   * Internal save implementation
   */
  private async saveDiagramInternal(diagram: Diagram): Promise<SaveResult> {
    // Validate diagram
    const validation = this.validator.validate(diagram);
    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Convert to JSON
    const diagramData = diagram.toJSON();

    // Check if diagram has ID (update) or not (create)
    const response = diagram.getId()
      ? await this.apiClient.put<DiagramData>(`/api/diagrams/${diagram.getId()}`, diagramData)
      : await this.apiClient.post<DiagramData>('/api/diagrams', diagramData);

    if (!response.success) {
      return {
        success: false,
        errors: [{ field: 'api', message: response.error || 'Failed to save diagram' }],
      };
    }

    return {
      success: true,
      data: response.data,
    };
  }

  /**
   * Load diagram by ID
   */
  async loadDiagram(id: string): Promise<LoadResult<Diagram>> {
    const response = await this.apiClient.get<DiagramData>(`/api/diagrams/${id}`);

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to load diagram',
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'Diagram data not found in response',
      };
    }

    try {
      const diagram = Diagram.fromJSON(response.data);
      return {
        success: true,
        data: diagram,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse diagram',
      };
    }
  }

  /**
   * List all diagrams
   */
  async listDiagrams(): Promise<ListResult<Array<{ id: string; name?: string; updatedAt?: string }>>> {
    const response = await this.apiClient.get<{ diagrams: DiagramData[] }>('/api/diagrams');

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to list diagrams',
      };
    }

    if (!response.data) {
      return {
        success: false,
        error: 'Diagrams data not found in response',
      };
    }

    // Transform to summary format
    const summaries = response.data.diagrams.map((diagram) => ({
      id: diagram.id,
      name: diagram.tables[0]?.name || 'Untitled',
      updatedAt: diagram.metadata.updatedAt,
    }));

    return {
      success: true,
      data: summaries,
    };
  }

  /**
   * Delete diagram
   */
  async deleteDiagram(id: string): Promise<DeleteResult> {
    const response = await this.apiClient.delete(`/api/diagrams/${id}`);

    if (!response.success) {
      return {
        success: false,
        error: response.error || 'Failed to delete diagram',
      };
    }

    return {
      success: true,
    };
  }
}

