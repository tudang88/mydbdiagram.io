import { join } from 'path';
import { Repository } from './RepositoryInterface';
import { FileRepository } from './FileRepository';
import { DiagramData } from '../../client/types/diagram.types';

/**
 * Repository for Diagram entities
 */
export class DiagramRepository implements Repository<DiagramData> {
  private readonly dataDirectory: string;

  constructor(
    private fileRepository: FileRepository,
    dataDirectory: string = 'diagrams'
  ) {
    this.dataDirectory = dataDirectory;
  }

  /**
   * Find diagram by ID
   */
  async findById(id: string): Promise<DiagramData | null> {
    const filePath = this.getFilePath(id);
    return await this.fileRepository.readJSON<DiagramData>(filePath);
  }

  /**
   * Find all diagrams
   */
  async findAll(): Promise<DiagramData[]> {
    const files = await this.fileRepository.listFiles(this.dataDirectory);
    const diagrams: DiagramData[] = [];

    for (const file of files) {
      const filePath = join(this.dataDirectory, file);
      const data = await this.fileRepository.readJSON<DiagramData>(filePath);
      if (data) {
        diagrams.push(data);
      }
    }

    return diagrams;
  }

  /**
   * Save diagram
   */
  async save(diagram: DiagramData): Promise<DiagramData> {
    const filePath = this.getFilePath(diagram.id);
    await this.fileRepository.writeJSON(filePath, diagram);
    return diagram;
  }

  /**
   * Update diagram
   */
  async update(id: string, updates: Partial<DiagramData>): Promise<DiagramData | null> {
    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updated: DiagramData = {
      ...existing,
      ...updates,
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    return await this.save(updated);
  }

  /**
   * Delete diagram
   */
  async delete(id: string): Promise<boolean> {
    const filePath = this.getFilePath(id);
    return await this.fileRepository.deleteFile(filePath);
  }

  /**
   * Get file path for diagram
   */
  private getFilePath(id: string): string {
    return `${this.dataDirectory}/${id}.json`;
  }
}

