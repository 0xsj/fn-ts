import { Kysely, sql } from 'kysely';
import { Database } from '../types';
import { IOrganization } from '../../../domain/interface/organization.interface';
import {
  CreateOrganizationInput,
  Organization,
  UpdateOrganizationInput,
  UpdateOrganizationSettingsInput,
  InviteOrganizationMemberInput,
  OrganizationMember,
  OrganizationDB,
} from '../../../domain/entities';
import {
  AsyncResult,
  ConflictError,
  DatabaseError,
  NotFoundError,
  ResponseBuilder,
} from '../../../shared/response';
import { v4 as uuidv4 } from 'uuid';

export class OrganizationRepository implements IOrganization {
  constructor(private db: Kysely<Database>) {}
  async createOrganization(
    input: CreateOrganizationInput & { ownerId: string; createdBy: string },
    correlationId?: string,
  ): AsyncResult<Organization> {
    try {
      const now = new Date();

      // Check if slug is already taken
      const existingOrg = await this.db
        .selectFrom('organizations')
        .select('id')
        .where('slug', '=', input.slug)
        .executeTakeFirst();

      if (existingOrg) {
        return new ConflictError('Organization slug already exists', correlationId, {
          slug: input.slug,
        });
      }

      // Create organization ID
      const organizationId = uuidv4();

      // Insert into database with JSON fields as objects
      await this.db
        .insertInto('organizations')
        .values({
          // Base fields
          id: organizationId,
          created_at: now,
          updated_at: now,

          // Basic info
          name: input.name,
          slug: input.slug,
          display_name: input.name,
          description: input.description ?? null,

          // Type and status
          type: input.type ?? 'free',
          status: 'active',

          // Contact IDs
          primary_contact_id: null,
          billing_contact_id: null,
          technical_contact_id: null,

          // Contact info
          email: input.email,
          phone: input.phone ?? null,
          website: input.website ?? null,

          // JSON columns - use sql.raw to ensure proper JSON handling
          address: sql`${JSON.stringify({
            street_address: null,
            street_address_2: null,
            city: null,
            state: null,
            postal_code: null,
            country: null,
            country_code: null,
          })}`,

          billing: sql`${JSON.stringify({
            plan: 'free',
            billing_cycle: null,
            billing_email: input.email,
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
          })}`,

          settings: sql`${JSON.stringify({
            timezone: 'UTC',
            locale: 'en',
            date_format: 'YYYY-MM-DD',
            time_format: '24h',
            notification_settings: {
              default_from_email: input.email,
              default_from_name: input.name,
              reply_to_email: input.email,
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
          })}`,

          // Ownership
          owner_id: input.ownerId,
          created_by: input.createdBy,

          // Deletion
          deleted_at: null,
          deleted_by: null,
          deletion_scheduled_at: null,

          // Stats
          stats: sql`${JSON.stringify({
            total_users: 0,
            active_users_30d: 0,
            total_incidents: 0,
            total_notifications_sent: 0,
            storage_used_bytes: 0,
          })}`,
        })
        .execute();

      // Fetch the created organization
      const result = await this.findOrganizationById(organizationId, correlationId);

      // Handle the result
      if (!result.success) {
        return result;
      }

      const organization = result.body().data;
      if (!organization) {
        return new DatabaseError(
          'createOrganization',
          new Error('Failed to retrieve created organization'),
          correlationId,
        );
      }

      return ResponseBuilder.ok(organization, correlationId);
    } catch (error) {
      return new DatabaseError('createOrganization', error, correlationId);
    }
  }
  async findOrganizationById(id: string, correlationId?: string): AsyncResult<Organization | null> {
    try {
      const row = await this.db
        .selectFrom('organizations')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationId);
    } catch (error) {
      return new DatabaseError('findOrganizationById', error, correlationId);
    }
  }
  async findOrganizationBySlug(
    slug: string,
    correlationId?: string,
  ): AsyncResult<Organization | null> {
    try {
      const row = await this.db
        .selectFrom('organizations')
        .selectAll()
        .where('slug', '=', slug)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();
      return ResponseBuilder.ok(row ? this.mapToEntity(row) : null, correlationId);
    } catch (error) {
      return new DatabaseError('findOrganizationBySlug', error, correlationId);
    }
  }
  findOrganizationsByOwner(ownerId: string): AsyncResult<Organization[]> {
    throw new Error('Method not implemented.');
  }
  /**
   *
   * @param id
   * @param updates
   * @param correlationId
   * @returns
   *
   * TODO: organizations in general, should have a pointer to address / location. refactor out JSON later.
   */
  async updateOrganization(
    id: string,
    updates: UpdateOrganizationInput,
    correlationId?: string,
  ): AsyncResult<Organization | null> {
    try {
      // First, check if organization exists and is not deleted
      const existing = await this.db
        .selectFrom('organizations')
        .selectAll()
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .executeTakeFirst();

      if (!existing) {
        return new NotFoundError('Organization not found', correlationId);
      }

      // Build update object with only provided fields
      const updateData: Record<string, any> = {
        updated_at: new Date(),
      };

      // Basic organization fields
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.displayName !== undefined) updateData.display_name = updates.displayName;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.email !== undefined) updateData.email = updates.email;
      if (updates.phone !== undefined) updateData.phone = updates.phone;
      if (updates.website !== undefined) updateData.website = updates.website;

      // Handle address updates - merge with existing
      if (updates.address) {
        const currentAddress = existing.address || {};
        const updatedAddress = {
          street_address: updates.address.streetAddress ?? currentAddress.street_address ?? null,
          city: updates.address.city ?? currentAddress.city ?? null,
          state: updates.address.state ?? currentAddress.state ?? null,
          postal_code: updates.address.postalCode ?? currentAddress.postal_code ?? null,
          country: updates.address.country ?? currentAddress.country ?? null,
        };
        updateData.address = sql`${JSON.stringify(updatedAddress)}`;
      }

      // Perform the update
      const updatedRow = await this.db
        .updateTable('organizations')
        .set(updateData)
        .where('id', '=', id)
        .where('deleted_at', 'is', null)
        .returningAll()
        .executeTakeFirst();

      if (!updatedRow) {
        return new NotFoundError(
          'Organization not found or was deleted during update',
          correlationId,
        );
      }

      return ResponseBuilder.ok(this.mapToEntity(updatedRow), correlationId);
    } catch (error) {
      return new DatabaseError('updateOrganization', error, correlationId);
    }
  }

  deleteOrganization(id: string, deletedBy: string, immediate?: boolean): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  restoreOrganization(id: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  searchOrganizations(filters: {
    query?: string;
    type?: Organization['type'];
    status?: Organization['status'];
    plan?: Organization['billing']['plan'];
    limit?: number;
    offset?: number;
  }): AsyncResult<{ organizations: Organization[]; total: number }> {
    throw new Error('Method not implemented.');
  }
  findActiveOrganizations(limit?: number): AsyncResult<Organization[]> {
    throw new Error('Method not implemented.');
  }
  findOrganizationsByDomain(emailDomain: string): AsyncResult<Organization[]> {
    throw new Error('Method not implemented.');
  }
  updateOrganizationSettings(
    id: string,
    settings: UpdateOrganizationSettingsInput,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateSecuritySettings(
    id: string,
    settings: Organization['settings']['securitySettings'],
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateNotificationSettings(
    id: string,
    settings: Organization['settings']['notificationSettings'],
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateFeatureFlags(
    id: string,
    features: Partial<Organization['settings']['features']>,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateBillingInfo(id: string, billing: Partial<Organization['billing']>): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateSubscription(
    id: string,
    subscription: {
      plan: Organization['billing']['plan'];
      billingCycle?: Organization['billing']['billingCycle'];
      subscriptionId?: string;
    },
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateUsage(id: string, usage: Partial<Organization['billing']['usage']>): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  incrementUsage(
    id: string,
    metric: keyof Organization['billing']['usage'],
    amount?: number,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  checkUsageLimits(id: string): AsyncResult<{
    withinLimits: boolean;
    exceeded: Array<{ metric: string; used: number; limit: number }>;
  }> {
    throw new Error('Method not implemented.');
  }
  resetMonthlyUsage(beforeDate: Date): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  inviteMember(
    organizationId: string,
    input: InviteOrganizationMemberInput & { invitedBy: string },
  ): AsyncResult<OrganizationMember> {
    throw new Error('Method not implemented.');
  }
  findMemberById(organizationId: string, userId: string): AsyncResult<OrganizationMember | null> {
    throw new Error('Method not implemented.');
  }
  findOrganizationMembers(
    organizationId: string,
    filters?: { role?: OrganizationMember['role']; status?: OrganizationMember['status'] },
  ): AsyncResult<OrganizationMember[]> {
    throw new Error('Method not implemented.');
  }
  updateMemberRole(
    organizationId: string,
    userId: string,
    role: OrganizationMember['role'],
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateMemberStatus(
    organizationId: string,
    userId: string,
    status: OrganizationMember['status'],
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  acceptInvitation(token: string): AsyncResult<OrganizationMember | null> {
    throw new Error('Method not implemented.');
  }
  removeMember(organizationId: string, userId: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  findUserOrganizations(
    userId: string,
    includeInvited?: boolean,
  ): AsyncResult<Array<{ organization: Organization; membership: OrganizationMember }>> {
    throw new Error('Method not implemented.');
  }
  getUserPrimaryOrganization(userId: string): AsyncResult<Organization | null> {
    throw new Error('Method not implemented.');
  }
  isUserInOrganization(userId: string, organizationId: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  getUserRoleInOrganization(
    userId: string,
    organizationId: string,
  ): AsyncResult<OrganizationMember['role'] | null> {
    throw new Error('Method not implemented.');
  }
  getUserPermissions(userId: string, organizationId: string): AsyncResult<string[]> {
    throw new Error('Method not implemented.');
  }
  updateMemberPermissions(
    organizationId: string,
    userId: string,
    permissions: string[],
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  checkPermission(
    userId: string,
    organizationId: string,
    permission: string,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateContacts(
    id: string,
    contacts: { primaryContactId?: string; billingContactId?: string; technicalContactId?: string },
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  updateOrganizationStats(id: string, stats: Partial<Organization['stats']>): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  getOrganizationMetrics(
    id: string,
    from?: Date,
    to?: Date,
  ): AsyncResult<{
    userGrowth: Array<{ date: Date; count: number }>;
    incidentTrend: Array<{ date: Date; count: number }>;
    storageUsage: Array<{ date: Date; bytes: number }>;
    apiUsage: Array<{ date: Date; calls: number }>;
  }> {
    throw new Error('Method not implemented.');
  }
  getOrganizationActivity(
    id: string,
    days?: number,
  ): AsyncResult<{
    activeUsers: number;
    newIncidents: number;
    notificationsSent: number;
    apiCalls: number;
  }> {
    throw new Error('Method not implemented.');
  }
  bulkInviteMembers(
    organizationId: string,
    invites: Array<InviteOrganizationMemberInput & { invitedBy: string }>,
  ): AsyncResult<OrganizationMember[]> {
    throw new Error('Method not implemented.');
  }
  bulkUpdateMemberRoles(
    organizationId: string,
    updates: Array<{ userId: string; role: OrganizationMember['role'] }>,
  ): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  bulkRemoveMembers(organizationId: string, userIds: string[]): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  updateIntegrations(
    id: string,
    integrations: Partial<Organization['settings']['integrations']>,
  ): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  validateSlackIntegration(organizationId: string, workspaceId: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }
  validateSSOConfiguration(
    organizationId: string,
  ): AsyncResult<{ valid: boolean; errors?: string[] }> {
    throw new Error('Method not implemented.');
  }
  cleanupExpiredInvitations(): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  archiveInactiveOrganizations(inactiveDays: number): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  purgeDeletedOrganizations(beforeDate: Date): AsyncResult<number> {
    throw new Error('Method not implemented.');
  }
  updateMemberActivity(userId: string, organizationId: string): AsyncResult<boolean> {
    throw new Error('Method not implemented.');
  }

  private mapToEntity(row: any): Organization {
    return {
      // Base entity fields
      id: row.id,
      createdAt: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),

      // Basic info
      name: row.name,
      slug: row.slug,
      displayName: row.display_name,
      description: row.description,

      // Type and status
      type: row.type,
      status: row.status,

      // Contact IDs
      primaryContactId: row.primary_contact_id,
      billingContactId: row.billing_contact_id,
      technicalContactId: row.technical_contact_id,

      // Contact info
      email: row.email,
      phone: row.phone,
      website: row.website,

      // Address - transform snake_case to camelCase
      address: {
        streetAddress: row.address?.street_address ?? null,
        streetAddress2: row.address?.street_address_2 ?? null,
        city: row.address?.city ?? null,
        state: row.address?.state ?? null,
        postalCode: row.address?.postal_code ?? null,
        country: row.address?.country ?? null,
        countryCode: row.address?.country_code ?? null,
      },

      // Billing - complex nested transformation
      billing: {
        plan: row.billing?.plan ?? 'free',
        billingCycle: row.billing?.billing_cycle ?? null,
        billingEmail: row.billing?.billing_email ?? null,
        paymentMethodId: row.billing?.payment_method_id ?? null,
        customerId: row.billing?.customer_id ?? null,
        subscriptionId: row.billing?.subscription_id ?? null,

        trialEndsAt: row.billing?.trial_ends_at ? new Date(row.billing.trial_ends_at) : null,
        currentPeriodStart: row.billing?.current_period_start
          ? new Date(row.billing.current_period_start)
          : null,
        currentPeriodEnd: row.billing?.current_period_end
          ? new Date(row.billing.current_period_end)
          : null,
        cancelledAt: row.billing?.cancelled_at ? new Date(row.billing.cancelled_at) : null,

        limits: {
          users: row.billing?.limits?.users ?? 5,
          incidentsPerMonth: row.billing?.limits?.incidents_per_month ?? 100,
          notificationsPerMonth: row.billing?.limits?.notifications_per_month ?? 1000,
          storageGb: row.billing?.limits?.storage_gb ?? 10,
          apiCallsPerHour: row.billing?.limits?.api_calls_per_hour ?? 1000,
          webhooks: row.billing?.limits?.webhooks ?? 5,
          customDomains: row.billing?.limits?.custom_domains ?? 0,
        },

        usage: {
          users: row.billing?.usage?.users ?? 0,
          incidentsThisMonth: row.billing?.usage?.incidents_this_month ?? 0,
          notificationsThisMonth: row.billing?.usage?.notifications_this_month ?? 0,
          storageUsedGb: row.billing?.usage?.storage_used_gb ?? 0,
          apiCallsThisHour: row.billing?.usage?.api_calls_this_hour ?? 0,
        },
      },

      // Settings - another complex nested transformation
      settings: {
        timezone: row.settings?.timezone ?? 'UTC',
        locale: row.settings?.locale ?? 'en',
        dateFormat: row.settings?.date_format ?? 'YYYY-MM-DD',
        timeFormat: row.settings?.time_format ?? '24h',

        notificationSettings: {
          defaultFromEmail: row.settings?.notification_settings?.default_from_email ?? null,
          defaultFromName: row.settings?.notification_settings?.default_from_name ?? null,
          replyToEmail: row.settings?.notification_settings?.reply_to_email ?? null,
          logoUrl: row.settings?.notification_settings?.logo_url ?? null,
          primaryColor: row.settings?.notification_settings?.primary_color ?? null,
          emailFooter: row.settings?.notification_settings?.email_footer ?? null,
        },

        securitySettings: {
          require2fa: row.settings?.security_settings?.require_2fa ?? false,
          allowedDomains: row.settings?.security_settings?.allowed_domains ?? [],
          ipWhitelist: row.settings?.security_settings?.ip_whitelist ?? [],
          sessionTimeoutMinutes: row.settings?.security_settings?.session_timeout_minutes ?? 1440,
          passwordPolicy: {
            minLength: row.settings?.security_settings?.password_policy?.min_length ?? 8,
            requireUppercase:
              row.settings?.security_settings?.password_policy?.require_uppercase ?? true,
            requireLowercase:
              row.settings?.security_settings?.password_policy?.require_lowercase ?? true,
            requireNumbers:
              row.settings?.security_settings?.password_policy?.require_numbers ?? true,
            requireSymbols:
              row.settings?.security_settings?.password_policy?.require_symbols ?? false,
            expiryDays: row.settings?.security_settings?.password_policy?.expiry_days ?? null,
          },
        },

        features: {
          incidentsEnabled: row.settings?.features?.incidents_enabled ?? true,
          chatEnabled: row.settings?.features?.chat_enabled ?? true,
          fileUploadsEnabled: row.settings?.features?.file_uploads_enabled ?? true,
          apiAccessEnabled: row.settings?.features?.api_access_enabled ?? true,
          webhooksEnabled: row.settings?.features?.webhooks_enabled ?? true,
          customFieldsEnabled: row.settings?.features?.custom_fields_enabled ?? false,
          ssoEnabled: row.settings?.features?.sso_enabled ?? false,
          auditLogEnabled: row.settings?.features?.audit_log_enabled ?? true,
        },

        integrations: {
          slackWorkspaceId: row.settings?.integrations?.slack_workspace_id ?? null,
          microsoftTeamsTenantId: row.settings?.integrations?.microsoft_teams_tenant_id ?? null,
          googleWorkspaceDomain: row.settings?.integrations?.google_workspace_domain ?? null,
          samlMetadataUrl: row.settings?.integrations?.saml_metadata_url ?? null,
          oidcDiscoveryUrl: row.settings?.integrations?.oidc_discovery_url ?? null,
        },
      },

      // Ownership
      ownerId: row.owner_id,
      createdBy: row.created_by,

      // Deletion
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : null,
      deletedBy: row.deleted_by,
      deletionScheduledAt: row.deletion_scheduled_at ? new Date(row.deletion_scheduled_at) : null,

      // Stats
      stats: {
        totalUsers: row.stats?.total_users ?? 0,
        activeUsers30d: row.stats?.active_users_30d ?? 0,
        totalIncidents: row.stats?.total_incidents ?? 0,
        totalNotificationsSent: row.stats?.total_notifications_sent ?? 0,
        storageUsedBytes: row.stats?.storage_used_bytes ?? 0,
      },
    };
  }
}
