import type { Result, Success, Failure } from '../types/result.types';

/**
 * Create a Success result
 * @param value The success value
 * @returns Success<T>
 */
export function success<T>(value: T): Success<T> {
  return {
    kind: 'success',
    value,
  };
}

/**
 * Create a Failure result
 * @param error The error (with context data)
 * @returns Failure<E>
 */
export function failure<E>(error: E): Failure<E> {
  return {
    kind: 'failure',
    error,
  };
}

/**
 * Type guard to check if Result is Success
 * @param result The Result to check
 * @returns true if Success, false if Failure
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
  return result.kind === 'success';
}

/**
 * Type guard to check if Result is Failure
 * @param result The Result to check
 * @returns true if Failure, false if Success
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
  return result.kind === 'failure';
}

/**
 * Transform the success value, leave error unchanged
 * @param result The Result to transform
 * @param fn Function to transform the success value
 * @returns New Result with transformed success value or original error
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (isSuccess(result)) {
    return success(fn(result.value));
  }
  return result;
}

/**
 * Transform the error, leave success value unchanged
 * @param result The Result to transform
 * @param fn Function to transform the error
 * @returns New Result with original success value or transformed error
 */
export function mapError<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  if (isFailure(result)) {
    return failure(fn(result.error));
  }
  return result;
}

/**
 * If success, apply function that returns another Result
 * If failure, return the failure
 * @param result The Result to chain
 * @param fn Function that takes success value and returns new Result
 * @returns Chained Result
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (isSuccess(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Pattern match on Result - execute different functions for Success/Failure
 * @param result The Result to match on
 * @param onSuccess Function to execute if Success
 * @param onFailure Function to execute if Failure
 * @returns Result of the executed function
 */
export function match<T, E, U>(
  result: Result<T, E>,
  onSuccess: (value: T) => U,
  onFailure: (error: E) => U,
): U {
  if (isSuccess(result)) {
    return onSuccess(result.value);
  }

  return onFailure(result.error);
}

/**
 * Fold Result into a single value - alias for match
 * @param result The Result to fold
 * @param onFailure Function to execute if Failure
 * @param onSuccess Function to execute if Success
 * @returns Result of the executed function
 */
export function fold<T, E, U>(
  result: Result<T, E>,
  onFailure: (error: E) => U,
  onSuccess: (value: T) => U,
): U {
  return match(result, onSuccess, onFailure);
}
