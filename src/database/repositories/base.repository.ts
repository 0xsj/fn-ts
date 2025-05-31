import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  EntityManager,
  QueryRunner,
  DeepPartial,
  UpdateResult,
  DeleteResult,
  ObjectLiteral,
} from 'typeorm';
import { Result, AsyncResult } from 'src/common/types/result.types';
import { success, failure } from 'src/common/utils/result.util';
import { BaseEntity } from '../entities/base.entity';
import {
  IBaseEntity,
  CreateEntityData,
  UpdateEntityData,
} from 'src/common/interfaces/base-entity.interface';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  ExternalServiceError,
} from 'src/common/errors';

export class DatabaseError extends ExternalServiceError {
  constructor(operation: string, cause?: unknown, correlationId?: string) {
    super('Database', operation, undefined, cause, { cause }, correlationId);
  }
}
export class EntityNotFoundError extends NotFoundError {
  constructor(
    entityName: string,
    identifier: string | number,
    searchContext: string = 'id',
    correlationId: string,
  ) {
    super(entityName, identifier, searchContext, undefined, correlationId);
  }
}

export class EntityConflictError extends ConflictError {
  constructor(
    entityName: string,
    conflictingValue: string | number,
    conflictingField: string,
    correlationId?: string,
  ) {
    super(
      entityName,
      conflictingValue,
      conflictingField,
      'duplicate',
      undefined,
      correlationId,
    );
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface QueryOptions<T>
  extends Omit<FindManyOptions<T>, 'skip' | 'take'> {
  pagination?: PaginationOptions;
}

export abstract class BaseRepository<T extends BaseEntity> {
  protected readonly entityName: string;

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityManager?: EntityManager,
  ) {
    this.entityName = repository.metadata.name;
  }

  async findById() {}
  async findMany() {}
  async findWithpagination() {}
  async findOne() {}
  async create() {}
  async update() {}
  async delete() {}
  async hardDelete() {}
  async restore() {}
  async count() {}
  async exists() {}
  async withTransaction() {}

  protected isUniqueConstraintError(error: any): boolean {
    if (error.code === '23505') return true;
    if (error.code === 'ER_DUP_ENTRY') return true;
    if (error.code === 'SQLITE_CONSTRAINT') return true;

    return false;
  }

  protected extractConflictInfo(error: any): { field: string; value: string } {
    const message = error.message || '';
    const match = message.match(
      /duplicate key value violates unique constraint "([^"]+)"/i,
    );
    if (match) {
      return { field: match[1], value: 'unknown' };
    }

    return { field: 'unknown', value: 'unknown' };
  }
}
