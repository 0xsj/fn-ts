import {
  Repository,
  FindOptionsWhere,
  FindManyOptions,
  FindOneOptions,
  EntityManager,
  DeepPartial,
} from 'typeorm';
import { Result, AsyncResult } from 'src/common/types/result.types';
import { success, failure } from 'src/common/utils/result.util';
import { BaseEntity } from '../entities/base.entity';
import {
  CreateEntityData,
  UpdateEntityData,
} from 'src/common/interfaces/base-entity.interface';
import {
  NotFoundError,
  ConflictError,
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

  async findById(
    id: string,
    options?: FindOneOptions<T>,
    correlationId?: string,
  ): AsyncResult<T, EntityNotFoundError | DatabaseError> {
    try {
      const entity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
        ...options,
      });
      if (!entity) {
        return failure(
          new EntityNotFoundError(this.entityName, id, 'id', correlationId),
        );
      }

      return success(entity);
    } catch (error) {
      return failure(new DatabaseError('findbyId', error, correlationId));
    }
  }

  async findMany(
    options?: QueryOptions<T>,
    correlationId?: string,
  ): AsyncResult<T[], DatabaseError> {
    try {
      const { pagination, ...findOptions } = options || {};

      if (pagination) {
        const { page = 1, limit = 10 } = pagination;
        const skip = (page - 1) * limit;

        const entities = await this.repository.find({
          ...findOptions,
          skip,
          take: limit,
        });

        return success(entities);
      }

      const entities = await this.repository.find(findOptions);
      return success(entities);
    } catch (error) {
      return failure(new DatabaseError('findMany', error, correlationId));
    }
  }

  async findWithpagination(
    options?: QueryOptions<T>,
    correlationId?: string,
  ): AsyncResult<PaginatedResponse<T>, DatabaseError> {
    try {
      const { pagination, ...findOptions } = options;
      const { page = 1, limit = 10 } = pagination;

      const skip = (page - 1) * limit;

      const [entities, total] = await this.repository.findAndCount({
        ...findOptions,
        skip,
        take: limit,
      });

      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrevious = page > 1;

      const paginatedResponse: PaginatedResponse<T> = {
        data: entities,
        total,
        page,
        limit,
        totalPages,
        hasNext,
        hasPrevious,
      };
      return success(paginatedResponse);
    } catch (error) {
      return failure(
        new DatabaseError('findWithPagination', error, correlationId),
      );
    }
  }

  async findOne(
    where: FindOptionsWhere<T>,
    options?: FindOneOptions<T>,
    correlationId?: string,
  ): AsyncResult<T, EntityNotFoundError | DatabaseError> {
    try {
      const entity = await this.repository.findOne({
        where,
        ...options,
      });

      if (!entity) {
        const searchKey = Object.keys(where)[0] || 'unknown';
        const searchValue = Object.values(where)[0] || 'unknown';
        return failure(
          new EntityNotFoundError(
            this.entityName,
            String(searchValue),
            searchKey,
            correlationId,
          ),
        );
      }
      return success(entity);
    } catch (error) {
      return failure(new DatabaseError('findOne', error, correlationId));
    }
  }

  async create(
    data: CreateEntityData<T>,
    correlationId?: string,
  ): AsyncResult<T, EntityConflictError | DatabaseError> {
    try {
      const entity = this.repository.create(data as DeepPartial<T>);
      const savedEntity = await this.repository.save(entity);
      return success(savedEntity);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const conflictInfo = this.extractConflictInfo(error);
        return failure(
          new EntityConflictError(
            this.entityName,
            conflictInfo.value,
            conflictInfo.field,
            correlationId,
          ),
        );
      }
      return failure(new DatabaseError('create', error, correlationId));
    }
  }

  async update(
    id: string,
    data: UpdateEntityData<T>,
    correlationId?: string,
  ): AsyncResult<T, EntityNotFoundError | EntityConflictError | DatabaseError> {
    try {
      const existingEntity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
      });

      if (!existingEntity) {
        return failure(
          new EntityNotFoundError(this.entityName, id, 'id', correlationId),
        );
      }

      await this.repository.update(id, data as any);

      const updatedEntity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
      });

      return success(updatedEntity!);
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        const conflictInfo = this.extractConflictInfo(error);
        return failure(
          new EntityConflictError(
            this.entityName,
            conflictInfo.value,
            conflictInfo.field,
            correlationId,
          ),
        );
      }

      return failure(new DatabaseError('update', error, correlationId));
    }
  }

  async delete(
    id: string,
    correlationId?: string,
  ): AsyncResult<void, EntityNotFoundError | DatabaseError> {
    try {
      const result = await this.repository.softDelete(id);

      if (result.affected === 0) {
        return failure(
          new EntityNotFoundError(this.entityName, id, 'id', correlationId),
        );
      }

      return success(undefined);
    } catch (error) {
      return failure(new DatabaseError('delete', error, correlationId));
    }
  }

  async hardDelete(
    id: string,
    correlationId?: string,
  ): AsyncResult<void, EntityNotFoundError | DatabaseError> {
    try {
      const result = await this.repository.delete(id);

      if (result.affected === 0) {
        return failure(
          new EntityNotFoundError(this.entityName, id, 'id', correlationId),
        );
      }

      return success(undefined);
    } catch (error) {
      return failure(new DatabaseError('hardDelete', error, correlationId));
    }
  }

  async restore(
    id: string,
    correlationId?: string,
  ): AsyncResult<T, EntityNotFoundError | DatabaseError> {
    try {
      const result = await this.repository.restore(id);

      if (result.affected === 0) {
        return failure(
          new EntityNotFoundError(this.entityName, id, 'id', correlationId),
        );
      }

      const restoredEntity = await this.repository.findOne({
        where: { id } as FindOptionsWhere<T>,
      });

      return success(restoredEntity!);
    } catch (error) {
      return failure(new DatabaseError('restore', error, correlationId));
    }
  }

  async count(
    where?: FindOptionsWhere<T>,
    correlationId?: string,
  ): AsyncResult<number, DatabaseError> {
    try {
      const count = await this.repository.count({ where });
      return success(count);
    } catch (error) {
      return failure(new DatabaseError('count', error, correlationId));
    }
  }

  async exists(
    where: FindOptionsWhere<T>,
    correlationId?: string,
  ): AsyncResult<boolean, DatabaseError> {
    try {
      const count = await this.repository.count({ where });
      return success(count > 0);
    } catch (error) {
      return failure(new DatabaseError('exists', error, correlationId));
    }
  }

  async withTransaction<R>(
    operation: (repository: BaseRepository<T>) => Promise<Result<R, any>>,
    correlationId?: string,
  ): AsyncResult<R, DatabaseError> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const transactionRepository = new (this.constructor as any)(
        queryRunner.manager.getRepository<T>(this.repository.target),
        queryRunner.manager,
      );

      const result = await operation(transactionRepository);

      if (result.kind === 'failure') {
        await queryRunner.rollbackTransaction();
        return result;
      }

      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return failure(new DatabaseError('transaction', error, correlationId));
    } finally {
      await queryRunner.release();
    }
  }

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
