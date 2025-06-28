// src/domain/repositories/file.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  File,
  FileUploadRequest,
  FileUploadResponse,
  FileAccessRequest,
  FileAccessResponse,
  FileSearch,
  FileCategory,
  FileValidation,
} from '../entities';

export interface IFile {
  // ============================================
  // FILE OPERATIONS
  // ============================================
  uploadFile(
    input: FileUploadRequest & { uploadedBy: string; organizationId?: string },
  ): AsyncResult<FileUploadResponse>;
  findFileById(id: string): AsyncResult<File | null>;
  findFilesByIds(ids: string[]): AsyncResult<File[]>;
  updateFile(id: string, updates: Partial<File>): AsyncResult<File | null>;
  deleteFile(id: string, deletedBy: string, hard?: boolean): AsyncResult<boolean>;
  restoreFile(id: string): AsyncResult<boolean>;

  // ============================================
  // FILE ACCESS
  // ============================================
  generateTemporaryUrl(input: FileAccessRequest): AsyncResult<FileAccessResponse>;
  validateFileAccess(fileId: string, userId: string): AsyncResult<boolean>;
  updateFileAccess(
    fileId: string,
    access: {
      accessControl?: 'public' | 'private' | 'restricted';
      allowedUsers?: string[];
      allowedRoles?: string[];
    },
  ): AsyncResult<boolean>;

  // ============================================
  // FILE SEARCH & LISTING
  // ============================================
  searchFiles(search: FileSearch): AsyncResult<{ files: File[]; total: number }>;
  findFilesByUser(
    userId: string,
    options?: {
      includeDeleted?: boolean;
      limit?: number;
      offset?: number;
    },
  ): AsyncResult<File[]>;
  findFilesByOrganization(
    organizationId: string,
    options?: {
      category?: FileCategory;
      includeDeleted?: boolean;
    },
  ): AsyncResult<File[]>;
  findExpiredFiles(beforeDate: Date): AsyncResult<File[]>;

  // ============================================
  // FILE VARIANTS
  // ============================================
  createFileVariant(
    fileId: string,
    variant: 'thumbnail' | 'medium' | 'large',
    data: {
      url: string;
      width: number;
      height: number;
      size: number;
    },
  ): AsyncResult<boolean>;
  getFileVariants(fileId: string): AsyncResult<File['variants']>;

  // ============================================
  // FILE METADATA
  // ============================================
  updateFileMetadata(fileId: string, metadata: Partial<File['metadata']>): AsyncResult<boolean>;
  setVirusScanResult(
    fileId: string,
    result: {
      scanned: boolean;
      result: string | null;
      scannedAt: Date;
    },
  ): AsyncResult<boolean>;
  extractImageMetadata(fileId: string): AsyncResult<Partial<File['metadata']>>;

  // ============================================
  // FILE USAGE
  // ============================================
  incrementDownloadCount(fileId: string): AsyncResult<boolean>;
  updateLastAccessed(fileId: string): AsyncResult<boolean>;
  getFileUsageStats(fileId: string): AsyncResult<{
    downloadCount: number;
    lastAccessedAt: Date | null;
    totalBandwidth: number;
  }>;

  // ============================================
  // BULK OPERATIONS
  // ============================================
  bulkUpdateFiles(updates: Array<{ id: string; updates: Partial<File> }>): AsyncResult<number>;
  bulkDeleteFiles(fileIds: string[], deletedBy: string): AsyncResult<number>;
  moveFilesToOrganization(fileIds: string[], organizationId: string): AsyncResult<number>;

  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================
  cleanupExpiredFiles(): AsyncResult<number>;
  cleanupOrphanedFiles(): AsyncResult<number>;
  purgeDeletedFiles(beforeDate: Date): AsyncResult<number>;
  getStorageUsage(organizationId?: string): AsyncResult<{
    totalSize: number;
    fileCount: number;
    byCategory: Record<FileCategory, { size: number; count: number }>;
  }>;

  // ============================================
  // VALIDATION
  // ============================================
  validateFile(
    file: { size: number; mimeType: string },
    rules: FileValidation,
  ): AsyncResult<boolean>;
  checkDuplicateFile(checksum: string, organizationId?: string): AsyncResult<File | null>;
}
