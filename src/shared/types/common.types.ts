// src/shared/types/common.types.ts
import { z } from 'zod';

/**
 * Generic ID type - can be string UUID or numeric
 */
export const IdSchema = z.union([z.string().uuid(), z.number().int().positive()]);
export type Id = z.infer<typeof IdSchema>;

/**
 * Timestamp type for consistent date handling
 */
export const TimestampSchema = z.union([z.date(), z.string().datetime()]);
export type Timestamp = z.infer<typeof TimestampSchema>;

/**
 * Generic metadata that can be attached to any entity
 */
export const MetadataSchema = z.record(z.string(), z.unknown());
export type Metadata = z.infer<typeof MetadataSchema>;

/**
 * Common fields for tracking changes
 */
export const AuditFieldsSchema = z.object({
  createdBy: z.string().uuid().nullable().optional(),
  updatedBy: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type AuditFields = z.infer<typeof AuditFieldsSchema>;

/**
 * Soft delete fields
 */
export const SoftDeleteSchema = z.object({
  isDeleted: z.boolean().default(false),
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().uuid().nullable().optional(),
});
export type SoftDelete = z.infer<typeof SoftDeleteSchema>;

/**
 * Generic status enum that can be extended
 */
export const StatusSchema = z.enum(['active', 'inactive', 'pending', 'archived']);
export type Status = z.infer<typeof StatusSchema>;

/**
 * Batch operation result
 */
export const BatchResultSchema = z.object({
  total: z.number().int().nonnegative(),
  successful: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      id: IdSchema.optional(),
      error: z.string(),
      details: z.unknown().optional(),
    })
  ).optional(),
});
export type BatchResult = z.infer<typeof BatchResultSchema>;

/**
 * Generic change tracking
 */
export const ChangeSetSchema = z.object({
  field: z.string(),
  oldValue: z.unknown(),
  newValue: z.unknown(),
  changedAt: z.date(),
  changedBy: z.string().uuid(),
});
export type ChangeSet = z.infer<typeof ChangeSetSchema>;

/**
 * Coordinate type for location-based features
 */
export const CoordinateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});
export type Coordinate = z.infer<typeof CoordinateSchema>;

/**
 * File reference type
 */
export const FileReferenceSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  uploadedAt: z.date(),
});
export type FileReference = z.infer<typeof FileReferenceSchema>;

/**
 * Generic key-value pair
 */
export const KeyValueSchema = z.object({
  key: z.string(),
  value: z.unknown(),
});
export type KeyValue = z.infer<typeof KeyValueSchema>;

/**
 * Time range type
 */
export const TimeRangeSchema = z.object({
  start: z.date(),
  end: z.date(),
}).refine(data => data.end >= data.start, {
  message: "End date must be after start date",
});
export type TimeRange = z.infer<typeof TimeRangeSchema>;

/**
 * Generic version tracking
 */
export const VersionSchema = z.object({
  version: z.number().int().positive(),
  versionedAt: z.date(),
  versionedBy: z.string().uuid(),
  changeNote: z.string().optional(),
});
export type Version = z.infer<typeof VersionSchema>;