export interface CacheStrategy {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  deletePattern(pattern: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  expire(key: string, ttl: number): Promise<boolean>;
  ttl(key: string): Promise<number>;
}

export interface CacheOptions {
  ttl?: number;
  prefix?: number;
  compress?: boolean;
  tags?: string[];
}

export interface CacheKeyGenerator {
  generate(params: Record<string, any>): string;
}
