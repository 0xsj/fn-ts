// src/domain/entities/schemas/user.schema.ts
import { z } from 'zod';
import { BaseEntityDBSchema, BaseEntitySchema } from './entity.schema';

// Database schema (snake_case) - extends base
export const UserDBSchema = BaseEntityDBSchema.extend({
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  password_hash: z.string(),
});

// Application schema (camelCase) - extends base
export const UserSchema = BaseEntitySchema.extend({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  passwordHash: z.string(),
});

// Create and Update schemas remain the same
export const CreateUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
});

export const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).optional(),
  password: z.string().min(8).optional(),
});

// Type exports
export type UserDB = z.infer<typeof UserDBSchema>;
export type User = z.infer<typeof UserSchema>;
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;