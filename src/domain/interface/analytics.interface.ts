// src/domain/repositories/analytics.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  AuditLog,
  Event,
  Metric,
  ActivityLog,
  MetricQuery,
  AuditQuery,
  IncidentAnalytics,
  NotificationAnalytics,
} from '../entities';

export interface IAnalyticsRepository {
  // ============================================
  // AUDIT LOGS
  // ============================================
  createAuditLog(log: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<boolean>;
  findAuditLogs(query: AuditQuery): AsyncResult<{
    logs: AuditLog[];
    total: number;
    hasMore: boolean;
  }>;
  findAuditLogById(id: string): AsyncResult<AuditLog | null>;
  findAuditLogsByEntity(
    entityType: string,
    entityId: string,
    limit?: number,
  ): AsyncResult<AuditLog[]>;
  findAuditLogsByUser(userId: string, limit?: number): AsyncResult<AuditLog[]>;
  deleteOldAuditLogs(beforeDate: Date): AsyncResult<number>; // returns count deleted

  // ============================================
  // EVENTS (Event Sourcing)
  // ============================================
  recordEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<Event>;
  recordBatchEvents(
    events: Array<Omit<Event, 'id' | 'createdAt' | 'updatedAt'>>,
  ): AsyncResult<Event[]>;
  findEventById(id: string): AsyncResult<Event | null>;
  findEventsByAggregate(aggregateType: string, aggregateId: string): AsyncResult<Event[]>;
  findEventsByType(eventType: string, from?: Date, to?: Date): AsyncResult<Event[]>;
  findUnprocessedEvents(limit?: number): AsyncResult<Event[]>;
  markEventProcessed(id: string): AsyncResult<boolean>;
  markEventFailed(id: string, error?: string): AsyncResult<boolean>;
  getEventStream(from: Date, to?: Date, types?: string[]): AsyncResult<Event[]>;
  getAggregateHistory(aggregateType: string, aggregateId: string): AsyncResult<Event[]>;

  // ============================================
  // METRICS
  // ============================================
  recordMetric(metric: Omit<Metric, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<boolean>;
  recordBatchMetrics(
    metrics: Array<Omit<Metric, 'id' | 'createdAt' | 'updatedAt'>>,
  ): AsyncResult<boolean>;
  queryMetrics(query: MetricQuery): AsyncResult<Metric[]>;
  getMetricValue(name: string, tags?: Record<string, string>): AsyncResult<number | null>;
  getMetricSummary(
    name: string,
    from: Date,
    to: Date,
  ): AsyncResult<{
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50?: number;
    p95?: number;
    p99?: number;
  }>;
  incrementCounter(
    name: string,
    value?: number,
    tags?: Record<string, string>,
  ): AsyncResult<boolean>;
  setGauge(name: string, value: number, tags?: Record<string, string>): AsyncResult<boolean>;
  recordHistogram(name: string, value: number, tags?: Record<string, string>): AsyncResult<boolean>;
  deleteOldMetrics(beforeDate: Date): AsyncResult<number>;

  // ============================================
  // ACTIVITY LOGS
  // ============================================
  logActivity(activity: Omit<ActivityLog, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<boolean>;
  findUserActivities(
    userId: string,
    from?: Date,
    to?: Date,
    limit?: number,
  ): AsyncResult<ActivityLog[]>;
  findResourceActivities(
    resourceType: string,
    resourceId: string,
    limit?: number,
  ): AsyncResult<ActivityLog[]>;
  findActivitiesByType(activityType: string, from?: Date, to?: Date): AsyncResult<ActivityLog[]>;
  findActivitiesBySession(sessionId: string): AsyncResult<ActivityLog[]>;
  getActivityStats(
    userId: string,
    from: Date,
    to: Date,
  ): AsyncResult<{
    totalActivities: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    avgDuration: number;
  }>;

  // ============================================
  // ANALYTICS REPORTS
  // ============================================
  getIncidentAnalytics(
    from: Date,
    to: Date,
    organizationId?: string,
  ): AsyncResult<IncidentAnalytics>;
  getNotificationAnalytics(
    from: Date,
    to: Date,
    organizationId?: string,
  ): AsyncResult<NotificationAnalytics>;
  getUserAnalytics(
    userId: string,
    from: Date,
    to: Date,
  ): AsyncResult<{
    loginCount: number;
    activeHours: number[];
    actionsPerformed: Record<string, number>;
    lastActive: Date | null;
  }>;
  getSystemAnalytics(
    from: Date,
    to: Date,
  ): AsyncResult<{
    totalUsers: number;
    activeUsers: number;
    apiCallsCount: number;
    avgResponseTime: number;
    errorRate: number;
    topEndpoints: Array<{ endpoint: string; count: number; avgDuration: number }>;
  }>;
  getOrganizationAnalytics(
    organizationId: string,
    from: Date,
    to: Date,
  ): AsyncResult<{
    userActivity: Record<string, number>;
    resourceUsage: {
      storage: number;
      apiCalls: number;
      notifications: number;
    };
    topUsers: Array<{ userId: string; activityCount: number }>;
  }>;

  // ============================================
  // REAL-TIME ANALYTICS
  // ============================================
  getCurrentActiveUsers(): AsyncResult<number>;
  getCurrentSystemLoad(): AsyncResult<{
    cpu: number;
    memory: number;
    activeConnections: number;
    queueSize: number;
  }>;
  getLiveMetrics(names: string[]): AsyncResult<Record<string, number>>;

  // ============================================
  // DATA AGGREGATION
  // ============================================
  aggregateMetrics(
    name: string,
    from: Date,
    to: Date,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    groupBy?: string[],
  ): AsyncResult<
    Array<{
      timestamp: Date;
      value: number;
      tags?: Record<string, string>;
    }>
  >;

  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================
  archiveOldData(beforeDate: Date): AsyncResult<{
    auditLogs: number;
    events: number;
    metrics: number;
    activityLogs: number;
  }>;
  optimizeStorage(): AsyncResult<boolean>;
}
