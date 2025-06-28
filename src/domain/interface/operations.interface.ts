// src/domain/repositories/operations.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  Task,
  TaskStatus,
  TaskPriority,
  Webhook,
  WebhookEvent,
  FeatureFlag,
  CreateTaskInput,
  UpdateTaskProgressInput,
  CreateWebhookInput,
  CreateFeatureFlagInput,
  EvaluateFeatureFlagInput,
} from '../entities';

export interface IOperations {
  // ============================================
  // TASK OPERATIONS
  // ============================================
  createTask(
    input: CreateTaskInput & { createdBy?: string; organizationId?: string },
  ): AsyncResult<Task>;
  findTaskById(id: string): AsyncResult<Task | null>;
  findTasksByStatus(status: TaskStatus, limit?: number): AsyncResult<Task[]>;
  updateTaskStatus(
    id: string,
    status: TaskStatus,
    metadata?: {
      startedAt?: Date;
      completedAt?: Date;
      failedAt?: Date;
      error?: Task['error'];
      result?: Record<string, unknown>;
    },
  ): AsyncResult<boolean>;
  updateTaskProgress(id: string, progress: UpdateTaskProgressInput): AsyncResult<boolean>;
  cancelTask(id: string): AsyncResult<boolean>;
  retryTask(id: string): AsyncResult<boolean>;

  // ============================================
  // TASK QUEUE MANAGEMENT
  // ============================================
  enqueueTask(task: Task): AsyncResult<boolean>;
  dequeueTask(queueName: string, workerId: string): AsyncResult<Task | null>;
  dequeueBatchTasks(queueName: string, workerId: string, limit: number): AsyncResult<Task[]>;
  releaseTask(id: string): AsyncResult<boolean>;
  markTaskStalled(id: string): AsyncResult<boolean>;
  findStalledTasks(stallTimeoutMs: number): AsyncResult<Task[]>;

  // ============================================
  // TASK SEARCH & FILTERING
  // ============================================
  searchTasks(filters: {
    type?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    createdBy?: string;
    organizationId?: string;
    tags?: string[];
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): AsyncResult<{ tasks: Task[]; total: number }>;
  findScheduledTasks(beforeDate: Date): AsyncResult<Task[]>;
  findTasksToRetry(): AsyncResult<Task[]>;
  findDependentTasks(taskId: string): AsyncResult<Task[]>;

  // ============================================
  // TASK DEPENDENCIES
  // ============================================
  checkTaskDependencies(taskId: string): AsyncResult<{ ready: boolean; pending: string[] }>;
  createTaskHierarchy(
    parentTask: CreateTaskInput,
    childTasks: CreateTaskInput[],
  ): AsyncResult<Task[]>;
  getTaskHierarchy(taskId: string): AsyncResult<{
    parent: Task | null;
    children: Task[];
    siblings: Task[];
  }>;

  // ============================================
  // WEBHOOK OPERATIONS
  // ============================================
  createWebhook(
    input: CreateWebhookInput & { createdBy: string; organizationId?: string },
  ): AsyncResult<Webhook>;
  findWebhookById(id: string): AsyncResult<Webhook | null>;
  findWebhooksByEvent(event: WebhookEvent, organizationId?: string): AsyncResult<Webhook[]>;
  findActiveWebhooks(organizationId?: string): AsyncResult<Webhook[]>;
  updateWebhook(id: string, updates: Partial<Webhook>): AsyncResult<Webhook | null>;
  deleteWebhook(id: string): AsyncResult<boolean>;
  verifyWebhook(id: string): AsyncResult<boolean>;

  // ============================================
  // WEBHOOK DELIVERY
  // ============================================
  triggerWebhooks(event: WebhookEvent, payload: Record<string, unknown>): AsyncResult<number>;
  recordWebhookDelivery(delivery: {
    webhookId: string;
    eventType: string;
    eventId: string;
    request: Record<string, unknown>;
    response?: Record<string, unknown>;
    status: 'pending' | 'success' | 'failed' | 'timeout';
    attemptNumber: number;
    durationMs?: number;
  }): AsyncResult<boolean>;
  getWebhookDeliveryHistory(
    webhookId: string,
    limit?: number,
  ): AsyncResult<
    Array<{
      eventType: string;
      status: string;
      deliveredAt: Date | null;
      responseCode: number | null;
    }>
  >;
  retryWebhookDelivery(webhookId: string, eventId: string): AsyncResult<boolean>;

  // ============================================
  // WEBHOOK MANAGEMENT
  // ============================================
  updateWebhookStatus(
    id: string,
    updates: {
      consecutiveFailures?: number;
      lastFailureAt?: Date;
      lastFailureReason?: string;
      lastSuccessAt?: Date;
      totalDeliveries?: number;
      totalFailures?: number;
    },
  ): AsyncResult<boolean>;
  disableFailingWebhooks(failureThreshold: number): AsyncResult<number>;
  checkWebhookRateLimit(id: string): AsyncResult<{ allowed: boolean; resetAt?: Date }>;

  // ============================================
  // FEATURE FLAG OPERATIONS
  // ============================================
  createFeatureFlag(
    input: CreateFeatureFlagInput & { createdBy: string; organizationId?: string },
  ): AsyncResult<FeatureFlag>;
  findFeatureFlagById(id: string): AsyncResult<FeatureFlag | null>;
  findFeatureFlagByKey(key: string, organizationId?: string): AsyncResult<FeatureFlag | null>;
  findActiveFeatureFlags(organizationId?: string): AsyncResult<FeatureFlag[]>;
  updateFeatureFlag(id: string, updates: Partial<FeatureFlag>): AsyncResult<FeatureFlag | null>;
  deleteFeatureFlag(id: string): AsyncResult<boolean>;

  // ============================================
  // FEATURE FLAG EVALUATION
  // ============================================
  evaluateFeatureFlag(
    key: string,
    input: EvaluateFeatureFlagInput,
  ): AsyncResult<{
    enabled: boolean;
    variant?: string;
    payload?: Record<string, unknown>;
  }>;
  evaluateAllFlags(input: EvaluateFeatureFlagInput): AsyncResult<
    Record<
      string,
      {
        enabled: boolean;
        variant?: string;
        payload?: Record<string, unknown>;
      }
    >
  >;
  recordFlagEvaluation(flagId: string): AsyncResult<boolean>;

  // ============================================
  // FEATURE FLAG RULES
  // ============================================
  addFeatureFlagRule(flagId: string, rule: FeatureFlag['rules'][0]): AsyncResult<boolean>;
  updateFeatureFlagRule(
    flagId: string,
    ruleId: string,
    updates: Partial<FeatureFlag['rules'][0]>,
  ): AsyncResult<boolean>;
  removeFeatureFlagRule(flagId: string, ruleId: string): AsyncResult<boolean>;
  reorderFeatureFlagRules(flagId: string, ruleIds: string[]): AsyncResult<boolean>;

  // ============================================
  // ANALYTICS & MONITORING
  // ============================================
  getTaskMetrics(filters?: {
    type?: string;
    from?: Date;
    to?: Date;
    organizationId?: string;
  }): AsyncResult<{
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
    avgDuration: number;
    successRate: number;
  }>;
  getWebhookMetrics(webhookId?: string): AsyncResult<{
    deliveryRate: number;
    avgResponseTime: number;
    errorRate: number;
    byEvent: Record<string, number>;
  }>;
  getFeatureFlagUsage(flagId: string): AsyncResult<{
    evaluationCount: number;
    enabledCount: number;
    byVariant?: Record<string, number>;
    uniqueUsers: number;
  }>;

  // ============================================
  // BULK & CLEANUP OPERATIONS
  // ============================================
  bulkCancelTasks(taskIds: string[]): AsyncResult<number>;
  cleanupCompletedTasks(beforeDate: Date): AsyncResult<number>;
  cleanupWebhookDeliveryLogs(beforeDate: Date): AsyncResult<number>;
  archiveInactiveFeatureFlags(inactiveDays: number): AsyncResult<number>;
}
