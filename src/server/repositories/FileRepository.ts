import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * File repository for file system operations
 */
export class FileRepository {
  constructor(private baseDirectory: string = './data') {
    // Ensure base directory exists
    this.ensureDirectoryExists(baseDirectory);
  }

  /**
   * Read JSON file
   */
  async readJSON<T>(filePath: string): Promise<T | null> {
    try {
      const fullPath = this.getFullPath(filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Write JSON file
   */
  async writeJSON<T>(filePath: string, data: T): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    const dir = join(fullPath, '..');

    // Ensure directory exists
    await this.ensureDirectoryExists(dir);

    // Write file
    await fs.writeFile(fullPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * List files in directory
   */
  async listFiles(directory: string): Promise<string[]> {
    try {
      const fullPath = this.getFullPath(directory);
      const files = await fs.readdir(fullPath);
      return files.filter(file => file.endsWith('.json'));
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.unlink(fullPath);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get full path
   */
  private getFullPath(filePath: string): string {
    if (filePath.startsWith('/')) {
      return filePath; // Absolute path
    }
    return join(this.baseDirectory, filePath);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Ignore if directory already exists
      if (error instanceof Error && 'code' in error && error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
