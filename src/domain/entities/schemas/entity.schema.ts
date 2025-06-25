import { z } from 'zod';

/**
 * base schema that all entites extend from, common fields
 */

export const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.unknown()).optional(),
});

export const SoftDeletableSchema = BaseEntitySchema.extend({
  deletedAt: z.date().nullable().optional(),
  deletedBy: z.string().uuid().nullable().optional(),
});

export const TenantScopedSchema = BaseEntitySchema.extend({
  tenantId: z.string().uuid(),
});

export type BaseEntity = z.infer<typeof BaseEntitySchema>;
export type SoftDeletableEntity = z.infer<typeof SoftDeletableSchema>;
export type TenantScopedEntity = z.infer<typeof TenantScopedSchema>;
