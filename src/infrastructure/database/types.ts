import {
  UserDB,
  UserPasswordDB,
  UserAuthProviderDB,
  UserSecurityDB,
  PermissionDB,
  RoleDB,
  RolePermissionDB,
  UserRoleDB,
  AuditLogDB,
  EventDB,
  MetricDB,
  ActivityLogDB,
  AuthProviderDB,
  SessionDB,
  EmailVerificationTokenDB,
  PasswordResetTokenDB,
  ApiKeyDB,
  TwoFactorSecretDB,
  ThreadDB,
  ThreadParticipantDB,
  MessageDB,
  MessageReadReceiptDB,
  PresenceDB,
  FileDB,
  LocationDB,
  LocationHistoryDB,
  GeofenceDB,
  NotificationDB,
  TemplateDB,
  SubscriptionDB,
  TaskDB,
  WebhookDB,
  FeatureFlagDB,
  OrganizationDB,
  WebhookDeliveryDB,
  OrganizationMemberDB,
} from '../../domain/entities';

export interface Database {
  // User & Auth
  users: UserDB;
  user_passwords: UserPasswordDB;
  user_auth_providers: UserAuthProviderDB;
  user_security: UserSecurityDB;

  // Access Control
  permissions: PermissionDB;
  roles: RoleDB;
  role_permissions: RolePermissionDB;
  user_roles: UserRoleDB;

  // Organization
  organizations: OrganizationDB;
  organization_members: OrganizationMemberDB;

  // Auth
  auth_providers: AuthProviderDB;
  sessions: SessionDB;
  email_verification_tokens: EmailVerificationTokenDB;
  password_reset_tokens: PasswordResetTokenDB;
  api_keys: ApiKeyDB;
  two_factor_secrets: TwoFactorSecretDB;

  // Location
  locations: LocationDB;
  location_history: LocationHistoryDB;
  geofences: GeofenceDB;

  // Files
  files: FileDB;

  // Notifications
  notifications: NotificationDB;
  notification_templates: TemplateDB;
  notification_subscriptions: SubscriptionDB;

  // Communication
  threads: ThreadDB;
  thread_participants: ThreadParticipantDB;
  messages: MessageDB;
  message_read_receipts: MessageReadReceiptDB;
  presence: PresenceDB;

  // Operations
  tasks: TaskDB;
  webhooks: WebhookDB;
  feature_flags: FeatureFlagDB;
  webhook_deliveries: WebhookDeliveryDB;

  // Analytics
  audit_logs: AuditLogDB;
  events: EventDB;
  metrics: MetricDB;
  activity_logs: ActivityLogDB;

  // System
  kysely_migration: {
    name: string;
    timestamp: string;
  };
  kysely_migration_lock: {
    id: string;
    is_locked: number;
  };
}

export interface MongoCollections {
  audit_logs: AuditLogDB;
  events: EventDB;
  metrics: MetricDB;
  activity_logs: ActivityLogDB;
  analytics_snapshots: any;
}
