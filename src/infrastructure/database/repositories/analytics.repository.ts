import { Kysely, sql } from 'kysely';
import { Database } from '../types';
import { IAnalytics } from '../../../domain/interface/analytics.interface';
import {
  AuditLog,
  AuditQuery,
  Event,
  Metric,
  MetricQuery,
  ActivityLog,
  IncidentAnalytics,
  NotificationAnalytics,
  AuditLogDB,
} from '../../../domain/entities';
import { AsyncResult, DatabaseError, ResponseBuilder } from '../../../shared/response';
import { v4 as uuidv4 } from 'uuid';

export class AnalyticsRepository implements IAnalytics {
  constructor(private db: Kysely<Database>) {}
  async createAuditLog(
    log: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>,
    correlationId?: string,
  ): AsyncResult<boolean> {
    try {
      const now = new Date();
      const auditId = uuidv4();

      await this.db
        .insertInto('audit_logs')
        .values({
          // Base fields
          id: auditId,
          created_at: now,
          updated_at: now,

          // Entity info
          entity_type: log.entityType,
          entity_id: log.entityId,
          action: log.action,

          // Actor info
          user_id: log.userId,
          user_email: log.userEmail,
          user_role: log.userRole,

          // Organization context
          organization_id: log.organizationId,

          // Request context
          ip_address: log.ipAddress,
          user_agent: log.userAgent,
          correlation_id: log.correlationId,

          // JSON fields with sql template literal
          changes: log.changes ? sql`${JSON.stringify(log.changes)}` : null,

          // Status and performance
          status: log.status,
          error_message: log.errorMessage,
          duration_ms: log.durationMs,

          // Risk/Security
          severity: log.severity || 'low',

          // Metadata with sql template literal
          metadata: log.metadata ? sql`${JSON.stringify(log.metadata)}` : null,
        })
        .execute();

      return ResponseBuilder.ok(true, correlationId);
    } catch (error) {
      return new DatabaseError('createAuditLog', error, correlationId);
    }
  }
  async findAuditLogs(
    query: AuditQuery,
    correlationId?: string,
  ): AsyncResult<{ logs: AuditLog[]; total: number; hasMore: boolean }> {
    try {
      // Build base query
      let dbQuery = this.db.selectFrom('audit_logs').selectAll();

      // Apply filters
      if (query.entityType) {
        dbQuery = dbQuery.where('entity_type', '=', query.entityType);
      }

      if (query.entityId) {
        dbQuery = dbQuery.where('entity_id', '=', query.entityId);
      }

      if (query.userId) {
        dbQuery = dbQuery.where('user_id', '=', query.userId);
      }

      if (query.action) {
        dbQuery = dbQuery.where('action', '=', query.action);
      }

      if (query.status) {
        dbQuery = dbQuery.where('status', '=', query.status);
      }

      // Date range filter
      dbQuery = dbQuery
        .where('created_at', '>=', query.startDate)
        .where('created_at', '<=', query.endDate);

      // Get total count for pagination
      let countQuery = this.db
        .selectFrom('audit_logs')
        .select((eb) => eb.fn.count<number>('id').as('count'))
        .where('created_at', '>=', query.startDate)
        .where('created_at', '<=', query.endDate);

      // Apply same filters to count query
      if (query.entityType) {
        countQuery = countQuery.where('entity_type', '=', query.entityType);
      }
      if (query.entityId) {
        countQuery = countQuery.where('entity_id', '=', query.entityId);
      }
      if (query.userId) {
        countQuery = countQuery.where('user_id', '=', query.userId);
      }
      if (query.action) {
        countQuery = countQuery.where('action', '=', query.action);
      }
      if (query.status) {
        countQuery = countQuery.where('status', '=', query.status);
      }

      const countResult = await countQuery.executeTakeFirst();
      const total = Number(countResult?.count || 0);

      // Apply pagination and ordering
      const rows = await dbQuery
        .orderBy('created_at', 'desc')
        .limit(query.limit)
        .offset(query.offset)
        .execute();

      // Map to entities
      const logs = rows.map((row) => this.mapToEntity(row));

      // Check if there are more results
      const hasMore = query.offset + logs.length < total;

      return ResponseBuilder.ok(
        {
          logs,
          total,
          hasMore,
        },
        correlationId,
      );
    } catch (error) {
      return new DatabaseError('findAuditLogs', error, correlationId);
    }
  }

  async findAuditLogById(id: string, correlationId?: string): AsyncResult<AuditLog | null> {
    try {
      const row = await this.db
        .selectFrom('audit_logs')
        .selectAll()
        .where('id', '=', id)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationId);
    } catch (error) {
      return new DatabaseError('findAuditLogById', error, correlationId);
    }
  }
  async findAuditLogsByEntity(
    entityType: string,
    entityId: string,
    limit?: number,
    correlationId?: string,
  ): AsyncResult<AuditLog[]> {
    try {
      let query = this.db
        .selectFrom('audit_logs')
        .selectAll()
        .where('entity_type', '=', entityType)
        .where('entity_id', '=', entityId)
        .orderBy('created_at', 'desc');

      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }

      const rows = await query.execute();

      const logs = rows.map((row) => this.mapToEntity(row));

      return ResponseBuilder.ok(logs, correlationId);
    } catch (error) {
      return new DatabaseError('findAuditLogsByEntity', error, correlationId);
    }
  }
  async findAuditLogsByUser(
    userId: string,
    limit?: number,
    correlationId?: string,
  ): AsyncResult<AuditLog[]> {
    try {
      let query = this.db
        .selectFrom('audit_logs')
        .selectAll()
        .where('user_id', '=', userId)
        .orderBy('created_at', 'desc');

      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }

      const rows = await query.execute();

      const logs = rows.map((row) => this.mapToEntity(row));

      return ResponseBuilder.ok(logs, correlationId);
    } catch (error) {
      return new DatabaseError('findAuditLogsByUser', error, correlationId);
    }
  }
  deleteOldAuditLogs(beforeDate: Date): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  recordEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<Event> {
    throw new Error('Method not implemented.');
  }
  recordBatchEvents(
    events: Array<Omit<Event, 'id' | 'createdAt' | 'updatedAt'>>,
  ): AsyncResult<Event[]> {
    throw new Error('Method not implemented.');
  }
  findEventById(id: string): AsyncResult<Event | null> {
    throw new Error('Method not implemented.');
  }
  findEventsByAggregate(aggregateType: string, aggregateId: string): AsyncResult<Event[]> {
    throw new Error('Method not implemented.');
  }
  findEventsByType(eventType: string, from?: Date, to?: Date): AsyncResult<Event[]> {
    throw new Error('Method not implemented.');
  }
  findUnprocessedEvents(limit?: number): AsyncResult<Event[]> {
    throw new Error('Method not implemented.');
  }
  markEventProcessed(id: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  markEventFailed(id: string, error?: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  getEventStream(from: Date, to?: Date, types?: string[]): AsyncResult<Event[]> {
    throw new Error('Method not implemented.');
  }
  getAggregateHistory(aggregateType: string, aggregateId: string): AsyncResult<Event[]> {
    throw new Error('Method not implemented.');
  }
  recordMetric(metric: Omit<Metric, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  recordBatchMetrics(
    metrics: Array<Omit<Metric, 'id' | 'createdAt' | 'updatedAt'>>,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  queryMetrics(query: MetricQuery): AsyncResult<Metric[]> {
    throw new Error('Method not implemented.');
  }
  getMetricValue(name: string, tags?: Record<string, string>): AsyncResult<number | null> {
    throw new Error('Method not implemented.');
  }
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
  }> {
    throw new Error('Method not implemented.');
  }
  incrementCounter(
    name: string,
    value?: number,
    tags?: Record<string, string>,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  setGauge(name: string, value: number, tags?: Record<string, string>): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  recordHistogram(
    name: string,
    value: number,
    tags?: Record<string, string>,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  deleteOldMetrics(beforeDate: Date): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  logActivity(activity: Omit<ActivityLog, 'id' | 'createdAt' | 'updatedAt'>): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  findUserActivities(
    userId: string,
    from?: Date,
    to?: Date,
    limit?: number,
  ): AsyncResult<ActivityLog[]> {
    throw new Error('Method not implemented.');
  }
  findResourceActivities(
    resourceType: string,
    resourceId: string,
    limit?: number,
  ): AsyncResult<ActivityLog[]> {
    throw new Error('Method not implemented.');
  }
  findActivitiesByType(activityType: string, from?: Date, to?: Date): AsyncResult<ActivityLog[]> {
    throw new Error('Method not implemented.');
  }
  findActivitiesBySession(sessionId: string): AsyncResult<ActivityLog[]> {
    throw new Error('Method not implemented.');
  }
  getActivityStats(
    userId: string,
    from: Date,
    to: Date,
  ): AsyncResult<{
    totalActivities: number;
    byCategory: Record<string, number>;
    byType: Record<string, number>;
    avgDuration: number;
  }> {
    throw new Error('Method not implemented.');
  }
  getIncidentAnalytics(
    from: Date,
    to: Date,
    organizationId?: string,
  ): AsyncResult<IncidentAnalytics> {
    throw new Error('Method not implemented.');
  }
  getNotificationAnalytics(
    from: Date,
    to: Date,
    organizationId?: string,
  ): AsyncResult<NotificationAnalytics> {
    throw new Error('Method not implemented.');
  }
  getUserAnalytics(
    userId: string,
    from: Date,
    to: Date,
  ): AsyncResult<{
    loginCount: number;
    activeHours: number[];
    actionsPerformed: Record<string, number>;
    lastActive: Date | null;
  }> {
    throw new Error('Method not implemented.');
  }
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
  }> {
    throw new Error('Method not implemented.');
  }
  getOrganizationAnalytics(
    organizationId: string,
    from: Date,
    to: Date,
  ): AsyncResult<{
    userActivity: Record<string, number>;
    resourceUsage: { storage: number; apiCalls: number; notifications: number };
    topUsers: Array<{ userId: string; activityCount: number }>;
  }> {
    throw new Error('Method not implemented.');
  }
  getCurrentActiveUsers(): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  getCurrentSystemLoad(): AsyncResult<{
    cpu: number;
    memory: number;
    activeConnections: number;
    queueSize: number;
  }> {
    throw new Error('Method not implemented.');
  }
  getLiveMetrics(names: string[]): AsyncResult<Record<string, number>> {
    throw new Error('Method not implemented.');
  }
  aggregateMetrics(
    name: string,
    from: Date,
    to: Date,
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count',
    groupBy?: string[],
  ): AsyncResult<Array<{ timestamp: Date; value: number; tags?: Record<string, string> }>> {
    throw new Error('Method not implemented.');
  }
  archiveOldData(
    beforeDate: Date,
  ): AsyncResult<{ auditLogs: number; events: number; metrics: number; activityLogs: number }> {
    throw new Error('Method not implemented.');
  }
  optimizeStorage(): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }

  // In AuditRepository class, add these private methods:

  private mapToEntity(row: any): AuditLog {
    return {
      // Base entity fields
      id: row.id,
      createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),

      // Entity info
      entityType: row.entity_type,
      entityId: row.entity_id,
      action: row.action,

      // Actor info
      userId: row.user_id,
      userEmail: row.user_email,
      userRole: row.user_role,

      // Organization context
      organizationId: row.organization_id,

      // Request context
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      correlationId: row.correlation_id,

      // Change tracking - parse JSON
      changes: row.changes
        ? typeof row.changes === 'string'
          ? JSON.parse(row.changes)
          : row.changes
        : null,

      // Status and performance
      status: row.status,
      errorMessage: row.error_message,
      durationMs: row.duration_ms,

      // Risk/Security
      severity: row.severity,

      // Metadata - parse JSON
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : null,
    };
  }

  private mapToDatabase(
    log: Omit<AuditLog, 'id' | 'createdAt' | 'updatedAt'>,
  ): Record<string, any> {
    return {
      // Entity info
      entity_type: log.entityType,
      entity_id: log.entityId,
      action: log.action,

      // Actor info
      user_id: log.userId,
      user_email: log.userEmail,
      user_role: log.userRole,

      // Organization context
      organization_id: log.organizationId,

      // Request context
      ip_address: log.ipAddress,
      user_agent: log.userAgent,
      correlation_id: log.correlationId,

      // JSON fields with sql template literal
      changes: log.changes ? sql`${JSON.stringify(log.changes)}` : null,

      // Status and performance
      status: log.status,
      error_message: log.errorMessage,
      duration_ms: log.durationMs,

      // Risk/Security
      severity: log.severity || 'low',

      // Metadata with sql template literal
      metadata: log.metadata ? sql`${JSON.stringify(log.metadata)}` : null,
    };
  }
}
