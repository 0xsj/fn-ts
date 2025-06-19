import type { Response } from 'express';

export abstract class ApiResponse<T = unknown> {
  public abstract readonly success: boolean;
  public abstract readonly statusCode: number;

  public abstract body(): T;

  public send(res: Response): void {
    res.status(this.statusCode).json(this.body());
  }
}

export abstract class ApiJsonResponse<T = unknown> extends ApiResponse<T> {
  public abstract readonly correlationId?: string;
  public abstract readonly timestamp: string;

  constructor() {
    super();
  }
}
