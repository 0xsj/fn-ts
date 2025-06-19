// src/shared/utils/response-helpers.ts
import type { Request, Response } from 'express';
import { ResponseBuilder } from '../response';
import type { ErrorResponseType } from '../response/types';

export function sendOk<T>(
  req: Request,
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
): void {
  const response = ResponseBuilder.ok(data, req.context.correlationId, meta);
  req.context.setResponse(response);
  response.send(res);
}

export function sendCreated<T>(
  req: Request,
  res: Response,
  data: T,
  meta?: Record<string, unknown>,
): void {
  const response = ResponseBuilder.created(data, req.context.correlationId, meta);
  req.context.setResponse(response);
  response.send(res);
}

export function sendError(req: Request, res: Response, error: ErrorResponseType): void {
  req.context.setResponse(error);
  error.send(res);
}
