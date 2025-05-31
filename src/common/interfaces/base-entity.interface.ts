export interface IBaseEntity {
  readonly id: string;

  readonly createdAt: Date;

  readonly updatedAt: Date;

  readonly version: Date | null;

  isDeleted(): boolean;

  isRecentlyCreated(): boolean;

  isRecentlyUpdated(): boolean;

  toJSON(): Record<string, unknown>;
}

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

export type EntityId = Pick<IBaseEntity, 'id'>;
