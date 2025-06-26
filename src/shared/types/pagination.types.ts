// src/shared/types/pagination.types.ts
import { z } from 'zod';

/**
 * Sort direction
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof SortDirectionSchema>;

/**
 * Sort specification
 */
export const SortSpecSchema = z.object({
  field: z.string(),
  direction: SortDirectionSchema.default('asc'),
});
export type SortSpec = z.infer<typeof SortSpecSchema>;

/**
 * Pagination request parameters
 */
export const PaginationParamsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
  limit: z.number().int().positive().max(100).optional(),
});
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Cursor-based pagination
 */
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(20),
  direction: z.enum(['forward', 'backward']).default('forward'),
});
export type CursorPagination = z.infer<typeof CursorPaginationSchema>;

/**
 * Complete query parameters combining filters, sorting, and pagination
 */
export const QueryParamsSchema = z.object({
  // Pagination
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),

  // Sorting
  sortBy: z.string().optional(),
  sortDirection: SortDirectionSchema.optional(),
  sorts: z.array(SortSpecSchema).optional(),

  // Filtering
  search: z.string().optional(),
  filters: z.record(z.any()).optional(), // Generic filters object

  // Options
  includeDeleted: z.boolean().default(false),
  includeCount: z.boolean().default(true),
});
export type QueryParams = z.infer<typeof QueryParamsSchema>;

/**
 * Pagination metadata for responses
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  pageCount: z.number().int(),
  totalCount: z.number().int(),
  hasPrevious: z.boolean(),
  hasNext: z.boolean(),
});
export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Cursor pagination metadata
 */
export const CursorMetaSchema = z.object({
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
  previousCursor: z.string().nullable(),
  count: z.number().int(),
});
export type CursorMeta = z.infer<typeof CursorMetaSchema>;

/**
 * Paginated response wrapper
 */
export function PaginatedResponseSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: PaginationMetaSchema,
  });
}
export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

/**
 * Cursor-based response wrapper
 */
export function CursorResponseSchema<T>(itemSchema: z.ZodType<T>) {
  return z.object({
    data: z.array(itemSchema),
    meta: CursorMetaSchema,
  });
}
export type CursorResponse<T> = {
  data: T[];
  meta: CursorMeta;
};

/**
 * Helper to calculate pagination metadata
 */
export function calculatePaginationMeta(
  page: number,
  pageSize: number,
  totalCount: number,
): PaginationMeta {
  const pageCount = Math.ceil(totalCount / pageSize);

  return {
    page,
    pageSize,
    pageCount,
    totalCount,
    hasPrevious: page > 1,
    hasNext: page < pageCount,
  };
}

/**
 * Helper to convert offset/limit to page/pageSize
 */
export function offsetToPagination(offset: number, limit: number): PaginationParams {
  const page = Math.floor(offset / limit) + 1;
  return {
    page,
    pageSize: limit,
    offset,
    limit,
  };
}
