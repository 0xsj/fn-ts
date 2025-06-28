// src/shared/utils/mapper/mapper.ts
import { z } from 'zod';
import { NamingConvention, MappingConfig, FieldMapping } from '../types/mapper.types';

export class GenericMapper {
  private profiles = new Map<string, MappingProfile>();

  /**
   * Map a single object from source to target schema
   */
  map<TSource, TTarget>(
    source: TSource,
    _sourceSchema: z.ZodSchema<TSource>,
    targetSchema: z.ZodSchema<TTarget>,
    config?: MappingConfig<TSource, TTarget>,
  ): TTarget {
    // Apply beforeMap hook if provided
    const processedSource = config?.beforeMap ? config.beforeMap(source) : source;

    // Convert the source object
    let mapped = this.convertObject(
      processedSource,
      config?.sourceNaming || NamingConvention.SNAKE_CASE,
      config?.targetNaming || NamingConvention.CAMEL_CASE,
      config,
    );

    // Apply custom field mappings
    if (config?.customMappings) {
      mapped = this.applyCustomMappings(mapped, config.customMappings);
    }

    // IMPORTANT: Use safeParse to get the parsed result with defaults applied
    const parseResult = targetSchema.safeParse(mapped);

    if (!parseResult.success) {
      // If parsing fails, try to parse just the converted object
      // This allows the schema to apply its defaults
      const partialMapped = this.removeUndefinedFields(mapped);
      const retryResult = targetSchema.safeParse(partialMapped);

      if (!retryResult.success) {
        throw new Error(`Mapping validation failed: ${JSON.stringify(retryResult.error.errors)}`);
      }

      mapped = retryResult.data;
    } else {
      mapped = parseResult.data;
    }

    // Apply afterMap hook if provided
    return config?.afterMap ? config.afterMap(mapped) : mapped;
  }

  /**
   * Map an array of objects
   */
  mapArray<TSource, TTarget>(
    sources: TSource[],
    sourceSchema: z.ZodSchema<TSource>,
    targetSchema: z.ZodSchema<TTarget>,
    config?: MappingConfig<TSource, TTarget>,
  ): TTarget[] {
    return sources.map((source) => this.map(source, sourceSchema, targetSchema, config));
  }

  /**
   * Convert object with field name transformation
   */
  private convertObject(
    obj: any,
    sourceNaming: NamingConvention,
    targetNaming: NamingConvention,
    config?: MappingConfig,
  ): any {
    if (!this.isObject(obj)) {
      return obj;
    }

    const result: any = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip excluded fields
      if (config?.excludeFields?.includes(key)) {
        continue;
      }

      // Skip if includeFields is defined and key is not included
      if (config?.includeFields && !config.includeFields.includes(key)) {
        continue;
      }

      // Convert the field name
      const convertedKey = this.convertFieldName(key, sourceNaming, targetNaming);

      // Recursively convert nested objects and arrays
      if (Array.isArray(value)) {
        result[convertedKey] = value.map((item) =>
          this.convertObject(item, sourceNaming, targetNaming, config),
        );
      } else if (this.isObject(value) && !(value instanceof Date)) {
        result[convertedKey] = this.convertObject(value, sourceNaming, targetNaming, config);
      } else {
        result[convertedKey] = value;
      }
    }

    return result;
  }

  /**
   * Apply custom field mappings
   */
  private applyCustomMappings(obj: any, mappings: FieldMapping[]): any {
    const result = { ...obj };

    for (const mapping of mappings) {
      // Get value from source field
      const sourceValue = this.getNestedValue(obj, mapping.from);

      // Apply transformation if provided
      const value = mapping.transform ? mapping.transform(sourceValue) : sourceValue;

      // Set value to target field
      this.setNestedValue(result, mapping.to, value);

      // Remove source field if it's different from target
      if (mapping.from !== mapping.to) {
        this.deleteNestedValue(result, mapping.from);
      }
    }

    return result;
  }

  /**
   * Convert field name between naming conventions
   */
  private convertFieldName(
    fieldName: string,
    sourceNaming: NamingConvention,
    targetNaming: NamingConvention,
  ): string {
    // If same naming convention, return as is
    if (sourceNaming === targetNaming) {
      return fieldName;
    }

    // First, convert to a common format (array of words)
    const words = this.toWords(fieldName, sourceNaming);

    // Then convert to target naming convention
    return this.fromWords(words, targetNaming);
  }

  /**
   * Convert field name to array of words
   */
  private toWords(fieldName: string, naming: NamingConvention): string[] {
    switch (naming) {
      case NamingConvention.CAMEL_CASE:
        return fieldName.split(/(?=[A-Z])/).map((w) => w.toLowerCase());

      case NamingConvention.SNAKE_CASE:
        return fieldName.split('_');

      case NamingConvention.PASCAL_CASE:
        return fieldName.split(/(?=[A-Z])/).map((w) => w.toLowerCase());

      case NamingConvention.KEBAB_CASE:
        return fieldName.split('-');

      default:
        return [fieldName];
    }
  }

  /**
   * Convert array of words to naming convention
   */
  private fromWords(words: string[], naming: NamingConvention): string {
    switch (naming) {
      case NamingConvention.CAMEL_CASE:
        return words
          .map((word, index) => (index === 0 ? word.toLowerCase() : this.capitalize(word)))
          .join('');

      case NamingConvention.SNAKE_CASE:
        return words.map((w) => w.toLowerCase()).join('_');

      case NamingConvention.PASCAL_CASE:
        return words.map((word) => this.capitalize(word)).join('');

      case NamingConvention.KEBAB_CASE:
        return words.map((w) => w.toLowerCase()).join('-');

      default:
        return words.join('');
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    const target = keys.reduce((current, key) => {
      if (!current[key]) {
        current[key] = {};
      }
      return current[key];
    }, obj);

    target[lastKey] = value;
  }

  /**
   * Delete nested value from object using dot notation
   */
  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;

    const target = keys.reduce((current, key) => current?.[key], obj);

    if (target && lastKey in target) {
      delete target[lastKey];
    }
  }

  /**
   * Remove undefined fields to allow schema defaults to apply
   */
  private removeUndefinedFields(obj: any): any {
    if (!this.isObject(obj)) {
      return obj;
    }

    const cleaned: any = {};

    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        continue;
      }

      if (Array.isArray(value)) {
        cleaned[key] = value.map((item) => this.removeUndefinedFields(item));
      } else if (this.isObject(value) && !(value instanceof Date)) {
        const cleanedNested = this.removeUndefinedFields(value);
        // Only include the nested object if it has keys
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }

    return cleaned;
  }

  /**
   * Utility functions
   */
  private capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }

  private isObject(value: any): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Create a reusable mapping profile
   */
  createProfile<TSource, TTarget>(
    name: string,
    sourceSchema: z.ZodSchema<TSource>,
    targetSchema: z.ZodSchema<TTarget>,
    config: MappingConfig<TSource, TTarget>,
  ): void {
    this.profiles.set(name, { sourceSchema, targetSchema, config });
  }

  /**
   * Use a predefined mapping profile
   */
  useProfile<TSource, TTarget>(name: string, source: TSource): TTarget {
    const profile = this.profiles.get(name);
    if (!profile) {
      throw new Error(`Mapping profile '${name}' not found`);
    }

    return this.map(source, profile.sourceSchema, profile.targetSchema, profile.config);
  }
}

interface MappingProfile {
  sourceSchema: z.ZodSchema<any>;
  targetSchema: z.ZodSchema<any>;
  config: MappingConfig<any, any>;
}

// Export singleton instance
export const mapper = new GenericMapper();
