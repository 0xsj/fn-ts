// src/domain/entities/schemas/file.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// File Schema
// ============================================
export const FileDBSchema = BaseEntityDBSchema.extend({
  // File identification
  filename: z.string(),
  original_name: z.string(),
  mime_type: z.string(),
  size: z.number().int().positive(), // in bytes

  // Storage information
  storage_provider: z.enum(['s3', 'minio', 'local']).default('local'),
  bucket: z.string().nullable(),
  key: z.string(), // S3 key or local path
  url: z.string().url(),
  cdn_url: z.string().url().nullable(),

  // Thumbnails/variants
  variants: z
    .object({
      thumbnail: z
        .object({
          url: z.string().url(),
          width: z.number().int(),
          height: z.number().int(),
          size: z.number().int(),
        })
        .nullable(),
      medium: z
        .object({
          url: z.string().url(),
          width: z.number().int(),
          height: z.number().int(),
          size: z.number().int(),
        })
        .nullable(),
      large: z
        .object({
          url: z.string().url(),
          width: z.number().int(),
          height: z.number().int(),
          size: z.number().int(),
        })
        .nullable(),
    })
    .default({
      thumbnail: null,
      medium: null,
      large: null,
    }),

  // Ownership
  uploaded_by: z.string().uuid(),
  organization_id: z.string().uuid().nullable(),

  // Access control
  access_control: z.enum(['public', 'private', 'restricted']).default('private'),
  allowed_users: z.array(z.string().uuid()).default([]), // For restricted access
  allowed_roles: z.array(z.string()).default([]), // For restricted access

  // Expiration
  expires_at: z.date().nullable(),
  temporary_url_expires_at: z.date().nullable(),

  // File metadata
  metadata: z
    .object({
      // Common metadata
      content_encoding: z.string().nullable(),
      content_language: z.string().nullable(),
      cache_control: z.string().nullable(),

      // Image/Video metadata
      width: z.number().int().nullable(),
      height: z.number().int().nullable(),
      duration: z.number().nullable(), // in seconds for video/audio

      // EXIF data (for images)
      exif: z
        .object({
          camera_make: z.string().nullable(),
          camera_model: z.string().nullable(),
          date_taken: z.date().nullable(),
          gps_latitude: z.number().nullable(),
          gps_longitude: z.number().nullable(),
        })
        .nullable(),

      // Document metadata
      page_count: z.number().int().nullable(),
      word_count: z.number().int().nullable(),

      // Security
      checksum: z.string(), // SHA-256 hash
      virus_scanned: z.boolean().default(false),
      virus_scan_result: z.string().nullable(),
      virus_scanned_at: z.date().nullable(),
    })
    .default({
      content_encoding: null,
      content_language: null,
      cache_control: null,
      width: null,
      height: null,
      duration: null,
      exif: null,
      page_count: null,
      word_count: null,
      checksum: '',
      virus_scanned: false,
      virus_scan_result: null,
      virus_scanned_at: null,
    }),

  // Usage tracking
  download_count: z.number().int().default(0),
  last_accessed_at: z.date().nullable(),

  // Soft delete
  deleted_at: z.date().nullable(),
  deleted_by: z.string().uuid().nullable(),
});

export const FileSchema = BaseEntitySchema.extend({
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().int().positive(),

  storageProvider: z.enum(['s3', 'minio', 'local']).default('local'),
  bucket: z.string().nullable(),
  key: z.string(),
  url: z.string().url(),
  cdnUrl: z.string().url().nullable(),

  variants: z
    .object({
      thumbnail: z
        .object({
          url: z.string().url(),
          width: z.number().int(),
          height: z.number().int(),
          size: z.number().int(),
        })
        .nullable(),
      medium: z
        .object({
          url: z.string().url(),
          width: z.number().int(),
          height: z.number().int(),
          size: z.number().int(),
        })
        .nullable(),
      large: z
        .object({
          url: z.string().url(),
          width: z.number().int(),
          height: z.number().int(),
          size: z.number().int(),
        })
        .nullable(),
    })
    .default({
      thumbnail: null,
      medium: null,
      large: null,
    }),

  uploadedBy: z.string().uuid(),
  organizationId: z.string().uuid().nullable(),

  accessControl: z.enum(['public', 'private', 'restricted']).default('private'),
  allowedUsers: z.array(z.string().uuid()).default([]),
  allowedRoles: z.array(z.string()).default([]),

  expiresAt: z.date().nullable(),
  temporaryUrlExpiresAt: z.date().nullable(),

  metadata: z
    .object({
      contentEncoding: z.string().nullable(),
      contentLanguage: z.string().nullable(),
      cacheControl: z.string().nullable(),

      width: z.number().int().nullable(),
      height: z.number().int().nullable(),
      duration: z.number().nullable(),

      exif: z
        .object({
          cameraMake: z.string().nullable(),
          cameraModel: z.string().nullable(),
          dateTaken: z.date().nullable(),
          gpsLatitude: z.number().nullable(),
          gpsLongitude: z.number().nullable(),
        })
        .nullable(),

      pageCount: z.number().int().nullable(),
      wordCount: z.number().int().nullable(),

      checksum: z.string(),
      virusScanned: z.boolean().default(false),
      virusScanResult: z.string().nullable(),
      virusScannedAt: z.date().nullable(),
    })
    .default({
      contentEncoding: null,
      contentLanguage: null,
      cacheControl: null,
      width: null,
      height: null,
      duration: null,
      exif: null,
      pageCount: null,
      wordCount: null,
      checksum: '',
      virusScanned: false,
      virusScanResult: null,
      virusScannedAt: null,
    }),

  downloadCount: z.number().int().default(0),
  lastAccessedAt: z.date().nullable(),

  deletedAt: z.date().nullable(),
  deletedBy: z.string().uuid().nullable(),
});

// ============================================
// File Category Schema (for organization)
// ============================================
export const FileCategorySchema = z.enum([
  'document',
  'image',
  'video',
  'audio',
  'archive',
  'spreadsheet',
  'presentation',
  'other',
]);

// ============================================
// File Upload Schema
// ============================================
export const FileUploadRequestSchema = z.object({
  file: z.any(), // Will be validated at runtime
  category: FileCategorySchema.optional(),
  accessControl: z.enum(['public', 'private', 'restricted']).optional(),
  expiresAt: z.date().optional(),
  metadata: z.record(z.string()).optional(),
});

export const FileUploadResponseSchema = z.object({
  fileId: z.string().uuid(),
  filename: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  size: z.number(),
  mimeType: z.string(),
});

// ============================================
// File Access Schema
// ============================================
export const FileAccessRequestSchema = z.object({
  fileId: z.string().uuid(),
  expiresIn: z.number().min(60).max(86400).optional(), // 1 min to 24 hours
});

export const FileAccessResponseSchema = z.object({
  url: z.string().url(),
  expiresAt: z.date(),
});

// ============================================
// File Search Schema
// ============================================
export const FileSearchSchema = z.object({
  query: z.string().optional(),
  category: FileCategorySchema.optional(),
  mimeTypes: z.array(z.string()).optional(),
  uploadedBy: z.string().uuid().optional(),
  uploadedAfter: z.date().optional(),
  uploadedBefore: z.date().optional(),
  minSize: z.number().optional(),
  maxSize: z.number().optional(),
  accessControl: z.enum(['public', 'private', 'restricted']).optional(),
  includeDeleted: z.boolean().default(false),

  // Pagination
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  sortBy: z.enum(['createdAt', 'size', 'name', 'downloads']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================
// Supported File Types
// ============================================
export const SupportedImageTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
] as const;

export const SupportedVideoTypes = [
  'video/mp4',
  'video/mpeg',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
] as const;

export const SupportedDocumentTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
] as const;

export const SupportedAudioTypes = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
] as const;

// ============================================
// File Validation Schema
// ============================================
export const FileValidationSchema = z.object({
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB default
  allowedTypes: z.array(z.string()).default([...SupportedImageTypes, ...SupportedDocumentTypes]),
  virusScanRequired: z.boolean().default(true),

  // Image specific
  imageMaxWidth: z.number().optional(),
  imageMaxHeight: z.number().optional(),
  imageQuality: z.number().min(1).max(100).default(85),

  // Video specific
  videoMaxDuration: z.number().optional(), // in seconds
  videoMaxBitrate: z.number().optional(),
});

// ============================================
// Type Exports
// ============================================
export type File = z.infer<typeof FileSchema>;
export type FileDB = z.infer<typeof FileDBSchema>;
export type FileCategory = z.infer<typeof FileCategorySchema>;
export type FileUploadRequest = z.infer<typeof FileUploadRequestSchema>;
export type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>;
export type FileAccessRequest = z.infer<typeof FileAccessRequestSchema>;
export type FileAccessResponse = z.infer<typeof FileAccessResponseSchema>;
export type FileSearch = z.infer<typeof FileSearchSchema>;
export type FileValidation = z.infer<typeof FileValidationSchema>;
