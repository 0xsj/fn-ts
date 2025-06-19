import { ResponseBuilder, SuccessResponse } from './success-response';
import type { ErrorResponseType } from './types';

export const ok = <T>(data: T, correlationId?: string): SuccessResponse<T> => {
  return ResponseBuilder.ok(data, correlationId);
};

export const err = <E extends ErrorResponseType>(error: E): E => {
  return error;
};
