import type { SuccessResponse } from './success-response';
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  InternalServerError,
  ServiceUnavailableError,
} from './http-error';
import {
  ValidationError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
} from './common-error';

export type ErrorResponseType =
  | BadRequestError
  | UnauthorizedError
  | ForbiddenError
  | NotFoundError
  | ConflictError
  | InternalServerError
  | ServiceUnavailableError
  | ValidationError
  | RateLimitError
  | DatabaseError
  | ExternalServiceError;

export type ApiResponseType = SuccessResponse<unknown> | ErrorResponseType;

export function isSuccessResponse(response: ApiResponseType): response is SuccessResponse<unknown> {
  return response.success === true && response.kind === 'success';
}
export function isErrorResponse(response: ApiResponseType): response is ErrorResponseType {
  return response.success === false;
}
export function isBadRequestError(error: ApiResponseType): error is BadRequestError {
  return error.success === false && error.kind === 'bad-request';
}
export function isNotFoundError(error: ApiResponseType): error is NotFoundError {
  return error.success === false && error.kind === 'not-found';
}
export function isValidationError(error: ApiResponseType): error is ValidationError {
  return error.success === false && error.kind === 'validation-error';
}
export function isDatabaseError(error: ApiResponseType): error is DatabaseError {
  return error.success === false && error.kind === 'database-error';
}

export function assertNever(x: never): never {
  throw new Error('Unexpected object: ' + x);
}

export type Result<T, E extends ErrorResponseType = ErrorResponseType> = SuccessResponse<T> | E;
export type AsyncResult<T, E extends ErrorResponseType = ErrorResponseType> = Promise<Result<T, E>>;
