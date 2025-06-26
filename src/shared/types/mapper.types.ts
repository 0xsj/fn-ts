// src/shared/utils/mapper/mapper.types.ts
import { z } from 'zod';

/**
 * Represents a mapping strategy between different naming conventions
 */
export enum NamingConvention {
  CAMEL_CASE = 'camelCase',
  SNAKE_CASE = 'snake_case',
  PASCAL_CASE = 'PascalCase',
  KEBAB_CASE = 'kebab-case',
}

/**
 * Mapping configuration for a single field
 */
export interface FieldMapping {
  from: string;
  to: string;
  transform?: (value: any) => any;
}

/**
 * Configuration for mapping between two schemas
 */
export interface MappingConfig<TSource = any, TTarget = any> {
  sourceNaming?: NamingConvention;
  targetNaming?: NamingConvention;
  customMappings?: FieldMapping[];
  excludeFields?: string[];
  includeFields?: string[];
  beforeMap?: (source: TSource) => TSource;
  afterMap?: (target: TTarget) => TTarget;
}

/**
 * Generic mapper interface
 */
export interface IMapper {
  /**
   * Map a single object from source schema to target schema
   */
  map<TSource, TTarget>(
    source: TSource,
    sourceSchema: z.ZodSchema<TSource>,
    targetSchema: z.ZodSchema<TTarget>,
    config?: MappingConfig<TSource, TTarget>
  ): TTarget;

  /**
   * Map an array of objects
   */
  mapArray<TSource, TTarget>(
    sources: TSource[],
    sourceSchema: z.ZodSchema<TSource>,
    targetSchema: z.ZodSchema<TTarget>,
    config?: MappingConfig<TSource, TTarget>
  ): TTarget[];

  /**
   * Create a reusable mapping profile
   */
  createProfile<TSource, TTarget>(
    name: string,
    sourceSchema: z.ZodSchema<TSource>,
    targetSchema: z.ZodSchema<TTarget>,
    config: MappingConfig<TSource, TTarget>
  ): void;

  /**
   * Use a predefined mapping profile
   */
  useProfile<TSource, TTarget>(name: string, source: TSource): TTarget;
}

/**
 * Type guard to check if a value is an object
 */
export function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type for extracting shape from Zod schema
 */
export type SchemaShape<T extends z.ZodSchema> = T extends z.ZodObject<infer Shape>
  ? Shape
  : never;