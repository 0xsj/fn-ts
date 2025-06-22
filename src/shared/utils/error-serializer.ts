// src/shared/utils/error-serializer.ts
export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  statusCode?: number;
  kind?: string;
  cause?: SerializedError | unknown;
  [key: string]: unknown;
}

export function serializeError(error: unknown): SerializedError | unknown {
  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if ('code' in error) serialized.code = String(error.code);
    if ('statusCode' in error) serialized.statusCode = Number(error.statusCode);
    if ('kind' in error) serialized.kind = String(error.kind);
    if ('cause' in error && error.cause) {
      serialized.cause = serializeError(error.cause);
    }

    return serialized;
  }

  return error;
}

export function errorToLogContext(
  error: unknown,
  correlationId?: string,
  meta?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    error: serializeError(error),
    correlationId,
    ...meta,
  };
}
