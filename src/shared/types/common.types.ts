// src/shared/types/common.types.ts
import { z } from 'zod';

/**
 * Generic ID type - can be extended by specific domains
 */
export const IdSchema = z.union([
  z.string().uuid(),
  z.string().cuid(),
  z.string().cuid2(),
  z.number().int().positive(),
]);
export type Id = z.infer<typeof IdSchema>;

/**
 * Generic status that many entities might use
 */
export const StatusSchema = z.enum(['active', 'inactive', 'pending', 'archived']);
export type Status = z.infer<typeof StatusSchema>;

/**
 * Generic priority levels
 */
export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent', 'critical']);
export type Priority = z.infer<typeof PrioritySchema>;

/**
 * Sort direction for queries
 */
export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Generic date range
 */
export const DateRangeSchema = z
  .object({
    start: z.date(),
    end: z.date(),
  })
  .refine((data) => data.end >= data.start, {
    message: 'End date must be after start date',
  });
export type DateRange = z.infer<typeof DateRangeSchema>;

/**
 * Generic key-value pair
 */
export const KeyValueSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});
export type KeyValue = z.infer<typeof KeyValueSchema>;

/**
 * Batch operation result
 */
export const BatchResultSchema = z.object({
  total: z.number().int().nonnegative(),
  successful: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative().default(0),
});
export type BatchResult = z.infer<typeof BatchResultSchema>;

/**
 * Change tracking record
 */
export const ChangeRecordSchema = z.object({
  field: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  changedAt: z.date(),
  changedBy: z.string(),
});
export type ChangeRecord = z.infer<typeof ChangeRecordSchema>;

/**
 * Percentage (0-100)
 */
export const PercentageSchema = z.number().min(0).max(100);
export type Percentage = z.infer<typeof PercentageSchema>;

/**
 * Semantic version
 */
export const SemVerSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/);
export type SemVer = z.infer<typeof SemVerSchema>;

/**
 * Time zone
 */
export const TimeZoneSchema = z.string(); // Could add IANA timezone validation
export type TimeZone = z.infer<typeof TimeZoneSchema>;

/**
 * Language code (ISO 639-1)
 */
export const LanguageCodeSchema = z.string().length(2);
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;

/**
 * Country code (ISO 3166-1 alpha-2)
 */
export const CountryCodeSchema = z.string().length(2);
export type CountryCode = z.infer<typeof CountryCodeSchema>;

/**
 * Currency code (ISO 4217)
 */
export const CurrencyCodeSchema = z.string().length(3);
export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;

/**
 * Environment
 */
export const EnvironmentSchema = z.enum(['development', 'staging', 'production', 'test']);
export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Log level
 */
export const LogLevelSchema = z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
export type LogLevel = z.infer<typeof LogLevelSchema>;

/**
 * HTTP method
 */
export const HttpMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/**
 * MIME type validation
 */
export const MimeTypeSchema = z
  .string()
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&^_+-]{0,126}\/[a-zA-Z0-9][a-zA-Z0-9!#$&^_+-]{0,126}$/);
export type MimeType = z.infer<typeof MimeTypeSchema>;

/**
 * Cron expression
 */
export const CronExpressionSchema = z.string(); // Could add cron validation
export type CronExpression = z.infer<typeof CronExpressionSchema>;

/**
 * Feature flag
 */
export const FeatureFlagSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  rolloutPercentage: PercentageSchema.optional(),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

/**
 * Empty object
 */
export const EmptyObjectSchema = z.object({}).strict();
export type EmptyObject = z.infer<typeof EmptyObjectSchema>;

/**
 * Non-empty string
 */
export const NonEmptyStringSchema = z.string().min(1);
export type NonEmptyString = z.infer<typeof NonEmptyStringSchema>;

/**
 * Positive integer
 */
export const PositiveIntSchema = z.number().int().positive();
export type PositiveInt = z.infer<typeof PositiveIntSchema>;

/**
 * Safe integer (within JavaScript's safe integer range)
 */
export const SafeIntSchema = z
  .number()
  .int()
  .min(Number.MIN_SAFE_INTEGER)
  .max(Number.MAX_SAFE_INTEGER);
export type SafeInt = z.infer<typeof SafeIntSchema>;
