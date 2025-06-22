import { z } from 'zod';

export const EnvironmentSchema = z.enum(['development', 'test', 'staging', 'production']);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const PortSchema = z.coerce.number().min(1).max(65535);
export const URLSchema = z.string().url();
export const DurationSchema = z.string().regex(/^\d+[smhd]$/); // e.g., "30s", "5m", "1h", "7d"

export const parseDuration = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);

  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const [, value, unit] = match;

  return parseInt(value) * multipliers[unit as keyof typeof multipliers];
};
