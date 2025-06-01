/**
 * Interface representing the base fields present in all entities
 * Used for type safety in generic operations and repositories
 */
export interface IBaseEntity {
  /**
   * Unique identifier (UUID)
   */
  readonly id: string;

  /**
   * Creation timestamp
   */
  readonly createdAt: Date;

  /**
   * Last update timestamp
   */
  readonly updatedAt: Date;

  /**
   * Soft delete timestamp (null if not deleted)
   */
  readonly deletedAt?: Date | null;

  /**
   * Version for optimistic locking
   */
  readonly version: number;

  /**
   * Check if entity is soft deleted
   */
  isDeleted(): boolean;

  /**
   * Check if entity was recently created
   */
  isRecentlyCreated(): boolean;

  /**
   * Check if entity was recently updated
   */
  isRecentlyUpdated(): boolean;

  /**
   * Serialize to JSON
   */
  toJSON(): Record<string, unknown>;
}

/**
 * Type for entity creation (excludes auto-generated fields)
 */
export type CreateEntityData<T extends IBaseEntity> = Omit<
  T,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'deletedAt'
  | 'version'
  | 'isDeleted'
  | 'isRecentlyCreated'
  | 'isRecentlyUpdated'
  | 'toJSON'
>;

/**
 * Type for entity updates (excludes auto-generated and immutable fields)
 */
export type UpdateEntityData<T extends IBaseEntity> = Partial<
  Omit<
    T,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'deletedAt'
    | 'version'
    | 'isDeleted'
    | 'isRecentlyCreated'
    | 'isRecentlyUpdated'
    | 'toJSON'
  >
>;

/**
 * Type for entity with only the ID field
 */
export type EntityId = Pick<IBaseEntity, 'id'>;
