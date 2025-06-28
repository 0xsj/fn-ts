// src/domain/repositories/notification.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  Notification,
  NotificationChannel,
  NotificationStatus,
  NotificationPriority,
  Template,
  Subscription,
  SendNotificationInput,
  BatchNotificationInput,
  UpdateSubscriptionInput,
} from '../entities';

export interface INotification {
  // ============================================
  // NOTIFICATION OPERATIONS
  // ============================================
  sendNotification(
    input: SendNotificationInput & { organizationId?: string },
  ): AsyncResult<Notification>;
  sendBatchNotifications(
    input: BatchNotificationInput & { organizationId?: string },
  ): AsyncResult<Notification[]>;
  findNotificationById(id: string): AsyncResult<Notification | null>;
  findNotificationsByUser(
    userId: string,
    options?: {
      channel?: NotificationChannel;
      status?: NotificationStatus;
      limit?: number;
      offset?: number;
    },
  ): AsyncResult<Notification[]>;
  updateNotificationStatus(
    id: string,
    status: NotificationStatus,
    metadata?: {
      deliveredAt?: Date;
      failedAt?: Date;
      failureReason?: string;
      providerResponse?: Record<string, unknown>;
    },
  ): AsyncResult<boolean>;
  cancelNotification(id: string): AsyncResult<boolean>;
  retryFailedNotification(id: string): AsyncResult<boolean>;

  // ============================================
  // NOTIFICATION SEARCH & FILTERING
  // ============================================
  searchNotifications(filters: {
    recipientId?: string;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    priority?: NotificationPriority;
    incidentId?: string;
    threadId?: string;
    tags?: string[];
    from?: Date;
    to?: Date;
    limit?: number;
    offset?: number;
  }): AsyncResult<{ notifications: Notification[]; total: number }>;
  findScheduledNotifications(beforeDate: Date): AsyncResult<Notification[]>;
  findExpiredNotifications(): AsyncResult<Notification[]>;
  findNotificationsByBatch(batchId: string): AsyncResult<Notification[]>;
  findNotificationsByGroup(groupKey: string): AsyncResult<Notification[]>;

  // ============================================
  // TEMPLATE OPERATIONS
  // ============================================
  createTemplate(template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<Template>;
  findTemplateById(id: string): AsyncResult<Template | null>;
  findTemplateBySlug(slug: string, locale?: string): AsyncResult<Template | null>;
  findTemplatesByChannel(channel: NotificationChannel): AsyncResult<Template[]>;
  updateTemplate(id: string, updates: Partial<Template>): AsyncResult<Template | null>;
  publishTemplate(id: string): AsyncResult<boolean>;
  archiveTemplate(id: string): AsyncResult<boolean>;
  createTemplateVersion(templateId: string, content: Partial<Template>): AsyncResult<Template>;
  getTemplateVersions(templateId: string): AsyncResult<Template[]>;

  // ============================================
  // SUBSCRIPTION OPERATIONS
  // ============================================
  createSubscription(userId: string): AsyncResult<Subscription>;
  findSubscriptionByUser(userId: string): AsyncResult<Subscription | null>;
  updateSubscription(
    userId: string,
    updates: UpdateSubscriptionInput,
  ): AsyncResult<Subscription | null>;
  unsubscribeUser(userId: string, token: string, categories?: string[]): AsyncResult<boolean>;
  resubscribeUser(userId: string): AsyncResult<boolean>;

  // ============================================
  // DELIVERY TRACKING
  // ============================================
  markNotificationOpened(id: string): AsyncResult<boolean>;
  markNotificationClicked(id: string): AsyncResult<boolean>;
  trackNotificationBounce(id: string, bounceType: string): AsyncResult<boolean>;
  trackNotificationComplaint(id: string, complaintType: string): AsyncResult<boolean>;
  getDeliveryStats(filters?: {
    channel?: NotificationChannel;
    from?: Date;
    to?: Date;
    organizationId?: string;
  }): AsyncResult<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    failed: number;
  }>;

  // ============================================
  // PROVIDER OPERATIONS
  // ============================================
  updateProviderInfo(
    id: string,
    provider: {
      name: string;
      messageId: string;
      response?: Record<string, unknown>;
      cost?: number;
    },
  ): AsyncResult<boolean>;
  getProviderCosts(
    from: Date,
    to: Date,
    groupBy?: 'provider' | 'channel' | 'day',
  ): AsyncResult<Array<{ group: string; cost: number; count: number }>>;

  // ============================================
  // RETRY & QUEUE MANAGEMENT
  // ============================================
  queueNotification(
    notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>,
  ): AsyncResult<Notification>;
  dequeueNotifications(channel: NotificationChannel, limit: number): AsyncResult<Notification[]>;
  updateRetryInfo(id: string, retryCount: number, nextRetryAt?: Date): AsyncResult<boolean>;
  findNotificationsToRetry(): AsyncResult<Notification[]>;

  // ============================================
  // BATCH OPERATIONS
  // ============================================
  bulkUpdateStatus(
    updates: Array<{
      id: string;
      status: NotificationStatus;
      metadata?: Record<string, unknown>;
    }>,
  ): AsyncResult<number>;
  bulkCancelNotifications(ids: string[]): AsyncResult<number>;
  archiveOldNotifications(beforeDate: Date): AsyncResult<number>;

  // ============================================
  // ANALYTICS & REPORTING
  // ============================================
  getNotificationMetrics(
    userId?: string,
    from?: Date,
    to?: Date,
  ): AsyncResult<{
    byChannel: Record<NotificationChannel, number>;
    byStatus: Record<NotificationStatus, number>;
    byPriority: Record<NotificationPriority, number>;
    avgDeliveryTime: number;
    totalCost: number;
  }>;
  getTemplateUsageStats(templateId: string): AsyncResult<{
    usageCount: number;
    lastUsedAt: Date | null;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  }>;
  getUserEngagement(userId: string): AsyncResult<{
    totalReceived: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
    preferredChannel: NotificationChannel | null;
  }>;

  // ============================================
  // COMPLIANCE & CLEANUP
  // ============================================
  checkUserConsent(userId: string, category: string): AsyncResult<boolean>;
  recordUserConsent(userId: string, category: string, given: boolean): AsyncResult<boolean>;
  purgeUserNotifications(userId: string): AsyncResult<number>;
  cleanupExpiredNotifications(): AsyncResult<number>;

  // ============================================
  // QUIET HOURS & FREQUENCY
  // ============================================
  checkQuietHours(userId: string, priority: NotificationPriority): AsyncResult<boolean>;
  checkFrequencyLimits(
    userId: string,
    channel: NotificationChannel,
  ): AsyncResult<{
    allowed: boolean;
    resetAt?: Date;
    remaining?: number;
  }>;
  incrementUserFrequency(userId: string, channel: NotificationChannel): AsyncResult<boolean>;
}
