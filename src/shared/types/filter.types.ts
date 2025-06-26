// src/shared/types/filter.types.ts
import { z } from 'zod';

/**
 * Comparison operators for filtering
 */
export const FilterOperatorSchema = z.enum([
  'eq',      // equals
  'ne',      // not equals
  'gt',      // greater than
  'gte',     // greater than or equal
  'lt',      // less than
  'lte',     // less than or equal
  'in',      // in array
  'nin',     // not in array
  'like',    // SQL LIKE
  'ilike',   // case-insensitive LIKE
  'between', // between two values
  'isNull',  // is null
  'isNotNull', // is not null
]);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

/**
 * Single filter condition
 */
export const FilterConditionSchema = z.object({
  field: z.string(),
  operator: FilterOperatorSchema,
  value: z.any(), // Value type depends on field and operator
});
export type FilterCondition = z.infer<typeof FilterConditionSchema>;

/**
 * Logical operators for combining filters
 */
export const LogicalOperatorSchema = z.enum(['and', 'or', 'not']);
export type LogicalOperator = z.infer<typeof LogicalOperatorSchema>;

/**
 * Filter group for complex queries
 */
export const FilterGroupSchema: z.ZodType<FilterGroup> = z.lazy(() =>
  z.object({
    operator: LogicalOperatorSchema,
    conditions: z.array(z.union([FilterConditionSchema, FilterGroupSchema])),
  })
);
export interface FilterGroup {
  operator: LogicalOperator;
  conditions: (FilterCondition | FilterGroup)[];
}

/**
 * Date range filter
 */
export const DateRangeFilterSchema = z.object({
  field: z.string(),
  from: z.date().optional(),
  to: z.date().optional(),
});
export type DateRangeFilter = z.infer<typeof DateRangeFilterSchema>;

/**
 * Text search filter
 */
export const TextSearchFilterSchema = z.object({
  fields: z.array(z.string()),
  query: z.string(),
  caseSensitive: z.boolean().default(false),
  wholeWord: z.boolean().default(false),
});
export type TextSearchFilter = z.infer<typeof TextSearchFilterSchema>;

/**
 * Complete filter specification
 */
export const FilterSpecSchema = z.object({
  conditions: z.array(FilterConditionSchema).optional(),
  groups: z.array(FilterGroupSchema).optional(),
  dateRanges: z.array(DateRangeFilterSchema).optional(),
  textSearch: TextSearchFilterSchema.optional(),
});
export type FilterSpec = z.infer<typeof FilterSpecSchema>;

/**
 * Common pre-built filters
 */
export const CommonFiltersSchema = z.object({
  isActive: z.boolean().optional(),
  isDeleted: z.boolean().optional(),
  createdAfter: z.date().optional(),
  createdBefore: z.date().optional(),
  updatedAfter: z.date().optional(),
  updatedBefore: z.date().optional(),
  ids: z.array(z.string()).optional(),
  search: z.string().optional(),
});
export type CommonFilters = z.infer<typeof CommonFiltersSchema>;