/**
 * Core Result Type
 */

export interface Success<T> {
  readonly kind: 'success';
  readonly value: T;
}

export interface Failure<E> {
  readonly kind: 'failure';
  readonly error: E;
}

export type Result<T, E> = Success<T> | Failure<E>;

export type AsyncResult<T, E> = Promise<Result<T, E>>;
