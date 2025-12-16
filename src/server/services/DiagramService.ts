import { DiagramRepository } from '../repositories/DiagramRepository';
import { DiagramData } from '../../client/types/diagram.types';

/**
 * Service for Diagram business logic
 */
export class DiagramService {
  constructor(private repository: DiagramRepository) {}

  /**
   * Create a new diagram
   */
  async create(data: Omit<DiagramData, 'id' | 'metadata'> & { metadata?: Partial<DiagramData['metadata']> }): Promise<DiagramData> {
    const id = this.generateId();
    const now = new Date().toISOString();

    const diagram: DiagramData = {
      id,
      ...data,
      metadata: {
        createdAt: now,
        updatedAt: now,
        ...data.metadata,
      },
    };

    return await this.repository.save(diagram);
  }

  /**
   * Find diagram by ID
   */
  async findById(id: string): Promise<DiagramData | null> {
    return await this.repository.findById(id);
  }

  /**
   * Find all diagrams
   */
  async findAll(): Promise<DiagramData[]> {
    return await this.repository.findAll();
  }

  /**
   * Update diagram
   */
  async update(id: string, updates: Partial<DiagramData>): Promise<DiagramData | null> {
    return await this.repository.update(id, updates);
  }

  /**
   * Delete diagram
   */
  async delete(id: string): Promise<boolean> {
    return await this.repository.delete(id);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `diagram-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

