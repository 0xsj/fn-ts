// src/shared/middleware/context.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import { RequestContext } from '../context/request-context';

declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

export function contextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.context = new RequestContext(req);
  req.context.setMetadata('originalPath', req.originalUrl || req.url);
  next();
}
