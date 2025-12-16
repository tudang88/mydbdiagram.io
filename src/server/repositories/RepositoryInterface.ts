/**
 * Repository interface for data access operations
 */
export interface Repository<T, TId = string> {
  findById(id: TId): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  update(id: TId, updates: Partial<T>): Promise<T | null>;
  delete(id: TId): Promise<boolean>;
}
