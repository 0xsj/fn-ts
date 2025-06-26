// src/domain/entities/schemas/entity.schema.ts
import { z } from 'zod';

/**
 * Base schema for database entities (snake_case)
 */
export const BaseEntityDBSchema = z.object({
  id: z.string().uuid(),
  created_at: z.date(),
  updated_at: z.date(),
});

/**
 * Base schema for application entities (camelCase)
 */
export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * For entities that support soft delete
 */
export const SoftDeletableDBSchema = BaseEntityDBSchema.extend({
  deleted_at: z.date().nullable().optional(),
  deleted_by: z.string().uuid().nullable().optional(),
});

export const SoftDeletableSchema = BaseEntitySchema.extend({
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().uuid().nullable().optional(),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
export type BaseEntityDB = z.infer<typeof BaseEntityDBSchema>;
export type SoftDeletableEntity = z.infer<typeof SoftDeletableSchema>;
export type SoftDeletableEntityDB = z.infer<typeof SoftDeletableDBSchema>;
