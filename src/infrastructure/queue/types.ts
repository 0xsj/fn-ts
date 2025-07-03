// src/infrastructure/queue/types.ts
import { Job, JobsOptions, WorkerOptions, QueueEvents } from 'bullmq';
import { EmailAddress, EmailAttachment } from '../integrations/email/types';

export interface QueueJob<T = any> {
  id?: string;
  name: string;
  data: T;
  options?: JobsOptions;
}

export interface QueueWorker<T = any> {
  name: string;
  process(job: Job<T>): Promise<void>;
  onCompleted?(job: Job<T>, result: any): Promise<void>;
  onFailed?(job: Job<T>, error: Error): Promise<void>;
}

export interface QueueConfig {
  name: string;
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  defaultJobOptions?: JobsOptions;
  workerOptions?: WorkerOptions;
}

export interface EmailJobData {
  to: EmailAddress | EmailAddress[];
  from?: EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  cc?: EmailAddress | EmailAddress[]; // Fixed: allow single or array
  bcc?: EmailAddress | EmailAddress[]; // Fixed: allow single or array
  replyTo?: EmailAddress;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  template?: string; // Template name for rendering
  data?: Record<string, any>; // Template data
  metadata?: Record<string, unknown>;
  correlationId?: string;
}

export interface SMSJobData {
  to: string;
  message: string;
  correlationId?: string;
}

export interface NotificationJobData {
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in-app';
  title: string;
  message: string;
  data?: Record<string, any>;
  correlationId?: string;
}

export interface ProcessingJobData {
  type: string;
  payload: any;
  correlationId?: string;
}

// Queue names enum
export enum QueueName {
  EMAIL = 'email',
  SMS = 'sms',
  NOTIFICATION = 'notification',
  PROCESSING = 'processing',
  AUDIT = 'audit',
}

// Job status for tracking
export interface JobStatus {
  id: string;
  name: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
