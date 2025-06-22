// src/core/config/storage.config.ts
import { z } from 'zod';
import { URLSchema } from './config.schema';

const StorageConfigSchema = z.object({
  // Storage provider
  provider: z.enum(['s3', 'minio', 'local']).default('local'),
  
  // Common settings
  defaultBucket: z.string().default('fn-uploads'),
  publicBucket: z.string().default('fn-public'),
  
  // URL settings
  publicUrl: URLSchema.optional(), // CDN or public URL
  signedUrlExpiry: z.number().default(3600), // 1 hour
  
  // S3/MinIO configuration
  s3: z.object({
    endpoint: URLSchema.optional(), // For MinIO
    region: z.string().default('us-east-1'),
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    forcePathStyle: z.boolean().default(true), // For MinIO
  }),
  
  // Local storage configuration
  local: z.object({
    basePath: z.string().default('./uploads'),
    serveStatic: z.boolean().default(true),
    maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
  }),
  
  // Upload settings
  upload: z.object({
    maxFileSize: z.number().default(10 * 1024 * 1024), // 10MB
    allowedMimeTypes: z.array(z.string()).default([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/zip',
      'text/csv',
    ]),
    
    // Image processing
    image: z.object({
      maxWidth: z.number().default(2048),
      maxHeight: z.number().default(2048),
      quality: z.number().min(1).max(100).default(85),
      generateThumbnail: z.boolean().default(true),
      thumbnailSize: z.number().default(200),
    }),
  }),
  
  // Storage organization
  paths: z.object({
    incidents: z.string().default('incidents/{year}/{month}/{id}'),
    users: z.string().default('users/{id}/'),
    temp: z.string().default('temp/'),
    exports: z.string().default('exports/{year}/{month}/'),
  }),
  
  // Cleanup settings
  cleanup: z.object({
    enabled: z.boolean().default(true),
    tempFileExpiry: z.number().default(24 * 60 * 60 * 1000), // 24 hours
    schedule: z.string().default('0 3 * * *'), // 3 AM daily
  }),
});

type StorageConfig = z.infer<typeof StorageConfigSchema>;

export const storageConfig: StorageConfig = StorageConfigSchema.parse({
  provider: process.env.STORAGE_PROVIDER,
  defaultBucket: process.env.STORAGE_DEFAULT_BUCKET,
  publicBucket: process.env.STORAGE_PUBLIC_BUCKET,
  publicUrl: process.env.STORAGE_PUBLIC_URL,
  signedUrlExpiry: process.env.STORAGE_SIGNED_URL_EXPIRY,
  
  s3: {
    endpoint: process.env.S3_ENDPOINT, // For MinIO: http://localhost:9000
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  },
  
  local: {
    basePath: process.env.LOCAL_STORAGE_PATH,
    maxFileSize: process.env.LOCAL_MAX_FILE_SIZE,
  },
  
  upload: {
    maxFileSize: process.env.UPLOAD_MAX_FILE_SIZE,
    allowedMimeTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(','),
    image: {
      maxWidth: process.env.IMAGE_MAX_WIDTH,
      maxHeight: process.env.IMAGE_MAX_HEIGHT,
      quality: process.env.IMAGE_QUALITY,
      generateThumbnail: process.env.IMAGE_GENERATE_THUMBNAIL !== 'false',
    },
  },
  
  cleanup: {
    enabled: process.env.STORAGE_CLEANUP_ENABLED !== 'false',
    tempFileExpiry: process.env.STORAGE_TEMP_EXPIRY,
    schedule: process.env.STORAGE_CLEANUP_SCHEDULE,
  },
});

// Validate storage provider configuration
if (storageConfig.provider === 's3' && !storageConfig.s3.accessKeyId) {
  throw new Error('AWS credentials required for S3 storage provider');
}

if (storageConfig.provider === 'minio' && !storageConfig.s3.endpoint) {
  throw new Error('S3_ENDPOINT required for MinIO storage provider');
}