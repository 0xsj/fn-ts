export interface CronJobConfig {
  name: string;
  cronExpression: string;
  handler: () => Promise<void>;
  timezone?: string;
  runOnInit?: boolean;
  disabled?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

export interface CronJobMetadata {
  name: string;
  cronExpression: string;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
  consecutiveFailures: number;
  totalRuns: number;
  totalFailures: number;
  averageRunTime?: number;
}

export interface CronJobResult {
  jobName: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  success: boolean;
  error?: string;
}
