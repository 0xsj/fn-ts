// src/infrastructure/queue/jobs/base.job.ts
export interface JobMetadata {
  jobId: string;
  queueName: string;
  attemptNumber: number;
  timestamp: Date;
}

export abstract class BaseJob<T = any> {
  abstract name: string;
  abstract data: T;

  constructor(public metadata: JobMetadata) {}

  abstract validate(): boolean;
  abstract serialize(): string;
}
