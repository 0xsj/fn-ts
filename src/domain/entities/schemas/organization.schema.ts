// src/domain/entities/schemas/organization.schema.ts
import { z } from 'zod';
import { BaseEntitySchema, BaseEntityDBSchema } from './entity.schema';

// ============================================
// Organization Schema
// ============================================
export const OrganizationDBSchema = BaseEntityDBSchema.extend({
  // Basic information
  name: z.string(),
  slug: z.string(), // URL-friendly unique identifier
  display_name: z.string(),
  description: z.string().nullable(),

  // Type and status
  type: z.enum(['free', 'pro', 'enterprise', 'government', 'non_profit']).default('free'),
  status: z.enum(['active', 'suspended', 'cancelled', 'trial']).default('active'),

  // Contact information
  primary_contact_id: z.string().uuid().nullable(),
  billing_contact_id: z.string().uuid().nullable(),
  technical_contact_id: z.string().uuid().nullable(),

  email: z.string().email(),
  phone: z.string().nullable(),
  website: z.string().url().nullable(),

  // Address
  address: z
    .object({
      street_address: z.string().nullable(),
      street_address_2: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      postal_code: z.string().nullable(),
      country: z.string().nullable(),
      country_code: z.string().nullable(), // ISO 3166-1 alpha-2
    })
    .default({
      street_address: null,
      street_address_2: null,
      city: null,
      state: null,
      postal_code: null,
      country: null,
      country_code: null,
    }),

  // Billing information
  billing: z
    .object({
      plan: z.enum(['free', 'starter', 'professional', 'enterprise', 'custom']).default('free'),
      billing_cycle: z.enum(['monthly', 'yearly', 'custom']).nullable(),
      billing_email: z.string().email().nullable(),
      payment_method_id: z.string().nullable(), // Stripe payment method
      customer_id: z.string().nullable(), // Stripe customer ID
      subscription_id: z.string().nullable(), // Stripe subscription ID

      // Billing dates
      trial_ends_at: z.date().nullable(),
      current_period_start: z.date().nullable(),
      current_period_end: z.date().nullable(),
      cancelled_at: z.date().nullable(),

      // Usage limits
      limits: z
        .object({
          users: z.number().int().default(5),
          incidents_per_month: z.number().int().default(100),
          notifications_per_month: z.number().int().default(1000),
          storage_gb: z.number().default(10),
          api_calls_per_hour: z.number().int().default(1000),
          webhooks: z.number().int().default(5),
          custom_domains: z.number().int().default(0),
        })
        .default({
          users: 5,
          incidents_per_month: 100,
          notifications_per_month: 1000,
          storage_gb: 10,
          api_calls_per_hour: 1000,
          webhooks: 5,
          custom_domains: 0,
        }),

      // Current usage
      usage: z
        .object({
          users: z.number().int().default(0),
          incidents_this_month: z.number().int().default(0),
          notifications_this_month: z.number().int().default(0),
          storage_used_gb: z.number().default(0),
          api_calls_this_hour: z.number().int().default(0),
        })
        .default({
          users: 0,
          incidents_this_month: 0,
          notifications_this_month: 0,
          storage_used_gb: 0,
          api_calls_this_hour: 0,
        }),
    })
    .default({
      plan: 'free',
      billing_cycle: null,
      billing_email: null,
      payment_method_id: null,
      customer_id: null,
      subscription_id: null,
      trial_ends_at: null,
      current_period_start: null,
      current_period_end: null,
      cancelled_at: null,
      limits: {
        users: 5,
        incidents_per_month: 100,
        notifications_per_month: 1000,
        storage_gb: 10,
        api_calls_per_hour: 1000,
        webhooks: 5,
        custom_domains: 0,
      },
      usage: {
        users: 0,
        incidents_this_month: 0,
        notifications_this_month: 0,
        storage_used_gb: 0,
        api_calls_this_hour: 0,
      },
    }),

  // Settings
  settings: z
    .object({
      // General
      timezone: z.string().default('UTC'),
      locale: z.string().default('en'),
      date_format: z.string().default('YYYY-MM-DD'),
      time_format: z.string().default('24h'),

      // Notifications
      notification_settings: z
        .object({
          default_from_email: z.string().email().nullable(),
          default_from_name: z.string().nullable(),
          reply_to_email: z.string().email().nullable(),

          // Branding
          logo_url: z.string().url().nullable(),
          primary_color: z.string().nullable(),
          email_footer: z.string().nullable(),
        })
        .default({
          default_from_email: null,
          default_from_name: null,
          reply_to_email: null,
          logo_url: null,
          primary_color: null,
          email_footer: null,
        }),

      // Security
      security_settings: z
        .object({
          require_2fa: z.boolean().default(false),
          allowed_domains: z.array(z.string()).default([]), // Email domains for auto-join
          ip_whitelist: z.array(z.string()).default([]),
          session_timeout_minutes: z.number().int().default(1440), // 24 hours
          password_policy: z
            .object({
              min_length: z.number().int().default(8),
              require_uppercase: z.boolean().default(true),
              require_lowercase: z.boolean().default(true),
              require_numbers: z.boolean().default(true),
              require_symbols: z.boolean().default(false),
              expiry_days: z.number().int().nullable(),
            })
            .default({
              min_length: 8,
              require_uppercase: true,
              require_lowercase: true,
              require_numbers: true,
              require_symbols: false,
              expiry_days: null,
            }),
        })
        .default({
          require_2fa: false,
          allowed_domains: [],
          ip_whitelist: [],
          session_timeout_minutes: 1440,
          password_policy: {
            min_length: 8,
            require_uppercase: true,
            require_lowercase: true,
            require_numbers: true,
            require_symbols: false,
            expiry_days: null,
          },
        }),

      // Features
      features: z
        .object({
          incidents_enabled: z.boolean().default(true),
          chat_enabled: z.boolean().default(true),
          file_uploads_enabled: z.boolean().default(true),
          api_access_enabled: z.boolean().default(true),
          webhooks_enabled: z.boolean().default(true),
          custom_fields_enabled: z.boolean().default(false),
          sso_enabled: z.boolean().default(false),
          audit_log_enabled: z.boolean().default(true),
        })
        .default({
          incidents_enabled: true,
          chat_enabled: true,
          file_uploads_enabled: true,
          api_access_enabled: true,
          webhooks_enabled: true,
          custom_fields_enabled: false,
          sso_enabled: false,
          audit_log_enabled: true,
        }),

      // Integrations
      integrations: z
        .object({
          slack_workspace_id: z.string().nullable(),
          microsoft_teams_tenant_id: z.string().nullable(),
          google_workspace_domain: z.string().nullable(),
          saml_metadata_url: z.string().url().nullable(),
          oidc_discovery_url: z.string().url().nullable(),
        })
        .default({
          slack_workspace_id: null,
          microsoft_teams_tenant_id: null,
          google_workspace_domain: null,
          saml_metadata_url: null,
          oidc_discovery_url: null,
        }),
    })
    .default({
      timezone: 'UTC',
      locale: 'en',
      date_format: 'YYYY-MM-DD',
      time_format: '24h',
      notification_settings: {
        default_from_email: null,
        default_from_name: null,
        reply_to_email: null,
        logo_url: null,
        primary_color: null,
        email_footer: null,
      },
      security_settings: {
        require_2fa: false,
        allowed_domains: [],
        ip_whitelist: [],
        session_timeout_minutes: 1440,
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: false,
          expiry_days: null,
        },
      },
      features: {
        incidents_enabled: true,
        chat_enabled: true,
        file_uploads_enabled: true,
        api_access_enabled: true,
        webhooks_enabled: true,
        custom_fields_enabled: false,
        sso_enabled: false,
        audit_log_enabled: true,
      },
      integrations: {
        slack_workspace_id: null,
        microsoft_teams_tenant_id: null,
        google_workspace_domain: null,
        saml_metadata_url: null,
        oidc_discovery_url: null,
      },
    }),

  // Ownership and audit
  owner_id: z.string().uuid(), // Primary owner user ID
  created_by: z.string().uuid(),

  // Deletion
  deleted_at: z.date().nullable(),
  deleted_by: z.string().uuid().nullable(),
  deletion_scheduled_at: z.date().nullable(), // Soft delete grace period

  // Stats
  stats: z
    .object({
      total_users: z.number().int().default(0),
      active_users_30d: z.number().int().default(0),
      total_incidents: z.number().int().default(0),
      total_notifications_sent: z.number().int().default(0),
      storage_used_bytes: z.number().int().default(0),
    })
    .default({
      total_users: 0,
      active_users_30d: 0,
      total_incidents: 0,
      total_notifications_sent: 0,
      storage_used_bytes: 0,
    }),
});

export const OrganizationSchema = BaseEntitySchema.extend({
  name: z.string(),
  slug: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),

  type: z.enum(['free', 'pro', 'enterprise', 'government', 'non_profit']).default('free'),
  status: z.enum(['active', 'suspended', 'cancelled', 'trial']).default('active'),

  primaryContactId: z.string().uuid().nullable(),
  billingContactId: z.string().uuid().nullable(),
  technicalContactId: z.string().uuid().nullable(),

  email: z.string().email(),
  phone: z.string().nullable(),
  website: z.string().url().nullable(),

  address: z
    .object({
      streetAddress: z.string().nullable(),
      streetAddress2: z.string().nullable(),
      city: z.string().nullable(),
      state: z.string().nullable(),
      postalCode: z.string().nullable(),
      country: z.string().nullable(),
      countryCode: z.string().nullable(),
    })
    .default({
      streetAddress: null,
      streetAddress2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
      countryCode: null,
    }),

  billing: z
    .object({
      plan: z.enum(['free', 'starter', 'professional', 'enterprise', 'custom']).default('free'),
      billingCycle: z.enum(['monthly', 'yearly', 'custom']).nullable(),
      billingEmail: z.string().email().nullable(),
      paymentMethodId: z.string().nullable(),
      customerId: z.string().nullable(),
      subscriptionId: z.string().nullable(),

      trialEndsAt: z.date().nullable(),
      currentPeriodStart: z.date().nullable(),
      currentPeriodEnd: z.date().nullable(),
      cancelledAt: z.date().nullable(),

      limits: z
        .object({
          users: z.number().int().default(5),
          incidentsPerMonth: z.number().int().default(100),
          notificationsPerMonth: z.number().int().default(1000),
          storageGb: z.number().default(10),
          apiCallsPerHour: z.number().int().default(1000),
          webhooks: z.number().int().default(5),
          customDomains: z.number().int().default(0),
        })
        .default({
          users: 5,
          incidentsPerMonth: 100,
          notificationsPerMonth: 1000,
          storageGb: 10,
          apiCallsPerHour: 1000,
          webhooks: 5,
          customDomains: 0,
        }),

      usage: z
        .object({
          users: z.number().int().default(0),
          incidentsThisMonth: z.number().int().default(0),
          notificationsThisMonth: z.number().int().default(0),
          storageUsedGb: z.number().default(0),
          apiCallsThisHour: z.number().int().default(0),
        })
        .default({
          users: 0,
          incidentsThisMonth: 0,
          notificationsThisMonth: 0,
          storageUsedGb: 0,
          apiCallsThisHour: 0,
        }),
    })
    .default({
      plan: 'free',
      billingCycle: null,
      billingEmail: null,
      paymentMethodId: null,
      customerId: null,
      subscriptionId: null,
      trialEndsAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelledAt: null,
      limits: {
        users: 5,
        incidentsPerMonth: 100,
        notificationsPerMonth: 1000,
        storageGb: 10,
        apiCallsPerHour: 1000,
        webhooks: 5,
        customDomains: 0,
      },
      usage: {
        users: 0,
        incidentsThisMonth: 0,
        notificationsThisMonth: 0,
        storageUsedGb: 0,
        apiCallsThisHour: 0,
      },
    }),

  settings: z
    .object({
      timezone: z.string().default('UTC'),
      locale: z.string().default('en'),
      dateFormat: z.string().default('YYYY-MM-DD'),
      timeFormat: z.string().default('24h'),

      notificationSettings: z
        .object({
          defaultFromEmail: z.string().email().nullable(),
          defaultFromName: z.string().nullable(),
          replyToEmail: z.string().email().nullable(),
          logoUrl: z.string().url().nullable(),
          primaryColor: z.string().nullable(),
          emailFooter: z.string().nullable(),
        })
        .default({
          defaultFromEmail: null,
          defaultFromName: null,
          replyToEmail: null,
          logoUrl: null,
          primaryColor: null,
          emailFooter: null,
        }),

      securitySettings: z
        .object({
          require2fa: z.boolean().default(false),
          allowedDomains: z.array(z.string()).default([]),
          ipWhitelist: z.array(z.string()).default([]),
          sessionTimeoutMinutes: z.number().int().default(1440),
          passwordPolicy: z
            .object({
              minLength: z.number().int().default(8),
              requireUppercase: z.boolean().default(true),
              requireLowercase: z.boolean().default(true),
              requireNumbers: z.boolean().default(true),
              requireSymbols: z.boolean().default(false),
              expiryDays: z.number().int().nullable(),
            })
            .default({
              minLength: 8,
              requireUppercase: true,
              requireLowercase: true,
              requireNumbers: true,
              requireSymbols: false,
              expiryDays: null,
            }),
        })
        .default({
          require2fa: false,
          allowedDomains: [],
          ipWhitelist: [],
          sessionTimeoutMinutes: 1440,
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSymbols: false,
            expiryDays: null,
          },
        }),

      features: z
        .object({
          incidentsEnabled: z.boolean().default(true),
          chatEnabled: z.boolean().default(true),
          fileUploadsEnabled: z.boolean().default(true),
          apiAccessEnabled: z.boolean().default(true),
          webhooksEnabled: z.boolean().default(true),
          customFieldsEnabled: z.boolean().default(false),
          ssoEnabled: z.boolean().default(false),
          auditLogEnabled: z.boolean().default(true),
        })
        .default({
          incidentsEnabled: true,
          chatEnabled: true,
          fileUploadsEnabled: true,
          apiAccessEnabled: true,
          webhooksEnabled: true,
          customFieldsEnabled: false,
          ssoEnabled: false,
          auditLogEnabled: true,
        }),

      integrations: z
        .object({
          slackWorkspaceId: z.string().nullable(),
          microsoftTeamsTenantId: z.string().nullable(),
          googleWorkspaceDomain: z.string().nullable(),
          samlMetadataUrl: z.string().url().nullable(),
          oidcDiscoveryUrl: z.string().url().nullable(),
        })
        .default({
          slackWorkspaceId: null,
          microsoftTeamsTenantId: null,
          googleWorkspaceDomain: null,
          samlMetadataUrl: null,
          oidcDiscoveryUrl: null,
        }),
    })
    .default({
      timezone: 'UTC',
      locale: 'en',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
      notificationSettings: {
        defaultFromEmail: null,
        defaultFromName: null,
        replyToEmail: null,
        logoUrl: null,
        primaryColor: null,
        emailFooter: null,
      },
      securitySettings: {
        require2fa: false,
        allowedDomains: [],
        ipWhitelist: [],
        sessionTimeoutMinutes: 1440,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false,
          expiryDays: null,
        },
      },
      features: {
        incidentsEnabled: true,
        chatEnabled: true,
        fileUploadsEnabled: true,
        apiAccessEnabled: true,
        webhooksEnabled: true,
        customFieldsEnabled: false,
        ssoEnabled: false,
        auditLogEnabled: true,
      },
      integrations: {
        slackWorkspaceId: null,
        microsoftTeamsTenantId: null,
        googleWorkspaceDomain: null,
        samlMetadataUrl: null,
        oidcDiscoveryUrl: null,
      },
    }),

  ownerId: z.string().uuid(),
  createdBy: z.string().uuid(),

  deletedAt: z.date().nullable(),
  deletedBy: z.string().uuid().nullable(),
  deletionScheduledAt: z.date().nullable(),

  stats: z
    .object({
      totalUsers: z.number().int().default(0),
      activeUsers30d: z.number().int().default(0),
      totalIncidents: z.number().int().default(0),
      totalNotificationsSent: z.number().int().default(0),
      storageUsedBytes: z.number().int().default(0),
    })
    .default({
      totalUsers: 0,
      activeUsers30d: 0,
      totalIncidents: 0,
      totalNotificationsSent: 0,
      storageUsedBytes: 0,
    }),
});

// ============================================
// Organization Member Schema
// ============================================
export const OrganizationMemberDBSchema = z.object({
  organization_id: z.string().uuid(),
  user_id: z.string().uuid(),

  // Role in organization
  role: z.enum(['owner', 'admin', 'member', 'viewer', 'guest']).default('member'),

  // Status
  status: z.enum(['active', 'invited', 'suspended']).default('invited'),

  // Invitation
  invited_at: z.date(),
  invited_by: z.string().uuid(),
  invitation_token: z.string().nullable(),
  invitation_expires_at: z.date().nullable(),

  // Acceptance
  joined_at: z.date().nullable(),

  // Permissions (override defaults)
  custom_permissions: z.array(z.string()).default([]),

  // Activity
  last_active_at: z.date().nullable(),

  created_at: z.date(),
  updated_at: z.date(),
});

// ============================================
// Input Schemas
// ============================================
export const CreateOrganizationSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .min(3)
    .max(50),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['free', 'pro', 'enterprise', 'government', 'non_profit']).optional(),
});

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  displayName: z.string().optional(),
  description: z.string().max(500).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  address: z
    .object({
      streetAddress: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
});

export const UpdateOrganizationSettingsSchema = z.object({
  timezone: z.string().optional(),
  locale: z.string().optional(),
  dateFormat: z.string().optional(),
  timeFormat: z.enum(['12h', '24h']).optional(),
  notificationSettings: z
    .object({
      defaultFromEmail: z.string().email().optional(),
      defaultFromName: z.string().optional(),
      logoUrl: z.string().url().optional(),
    })
    .optional(),
  securitySettings: z
    .object({
      require2fa: z.boolean().optional(),
      allowedDomains: z.array(z.string()).optional(),
      sessionTimeoutMinutes: z.number().int().min(5).max(10080).optional(),
    })
    .optional(),
});

export const InviteOrganizationMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
  sendInvitationEmail: z.boolean().default(true),
  customMessage: z.string().max(500).optional(),
});

// ============================================
// Type Exports
// ============================================
export type Organization = z.infer<typeof OrganizationSchema>;
export type OrganizationDB = z.infer<typeof OrganizationDBSchema>;
export type OrganizationMemberDB = z.infer<typeof OrganizationMemberDBSchema>;
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;
export type UpdateOrganizationSettingsInput = z.infer<typeof UpdateOrganizationSettingsSchema>;
export type InviteOrganizationMemberInput = z.infer<typeof InviteOrganizationMemberSchema>;
