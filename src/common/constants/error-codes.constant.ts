export const ERROR_CODES = {
  UNAUTHORIZED: -401,
  FORBIDDEN: -403,
  NOT_FOUND: -404,
  CONFLICT: -409,
  RATE_LIMITED: -429,

  VALIDATION_ERROR: -400,

  EXTERNAL_SERVICE_ERROR: -500,
  DATABASE_ERROR: -501,
  CACHE_ERROR: -502,
  QUEUE_ERROR: -503,
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export function isValidErrorCode(code: number): code is ErrorCode {
  return Object.values(ERROR_CODES).includes(code as ErrorCode);
}

export function getErrorCodeName(code: ErrorCode): string {
  const entry = Object.entries(ERROR_CODES).find(([, value]) => value === code);
  return entry ? entry[0] : 'UNKNOWN_ERROR';
}
