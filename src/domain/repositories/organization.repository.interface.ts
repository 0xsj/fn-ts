// import {
//   CreateOrganizationInput,
//   Organization,
//   UpdateOrganizationInput,
//   OrganizationMember,
// } from '../entities';
// import { AsyncResult } from '../../shared/response';

// type OrganizationLimits = Organization['billing']['limits'];
// type OrganizationUsage = Organization['billing']['usage'];

// // src/domain/repositories/organization.repository.interface.ts
// export interface IOrganizationRepository {
//   create(input: CreateOrganizationInput): AsyncResult<Organization>;
//   findById(id: string): AsyncResult<Organization | null>;
//   findBySlug(slug: string): AsyncResult<Organization | null>;
//   update(id: string, updates: UpdateOrganizationInput): AsyncResult<Organization | null>;
//   delete(id: string): AsyncResult<boolean>;

//   // Member management
//   addMember(orgId: string, userId: string, role: string): AsyncResult<boolean>;
//   removeMember(orgId: string, userId: string): AsyncResult<boolean>;
//   updateMemberRole(orgId: string, userId: string, role: string): AsyncResult<boolean>;
//   findMembers(orgId: string): AsyncResult<OrganizationMember[]>;

//   // Usage tracking
//   updateUsage(orgId: string, usage: Partial<OrganizationUsage>): AsyncResult<boolean>;
//   checkLimit(
//     orgId: string,
//     limitType: keyof OrganizationLimits,
//   ): AsyncResult<{
//     current: number;
//     limit: number;
//     exceeded: boolean;
//   }>;
// }


// src/domain/repositories/organization.repository.interface.ts
import { AsyncResult } from '../../shared/response';
import {
  Organization,
  OrganizationMember,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UpdateOrganizationSettingsInput,
  InviteOrganizationMemberInput
} from '../entities';

export interface IOrganizationRepository {
  // ============================================
  // ORGANIZATION OPERATIONS
  // ============================================
  createOrganization(input: CreateOrganizationInput & { ownerId: string; createdBy: string }): AsyncResult<Organization>;
  findOrganizationById(id: string): AsyncResult<Organization | null>;
  findOrganizationBySlug(slug: string): AsyncResult<Organization | null>;
  findOrganizationsByOwner(ownerId: string): AsyncResult<Organization[]>;
  updateOrganization(id: string, updates: UpdateOrganizationInput): AsyncResult<Organization | null>;
  deleteOrganization(id: string, deletedBy: string, immediate?: boolean): AsyncResult<boolean>;
  restoreOrganization(id: string): AsyncResult<boolean>;
  
  // ============================================
  // ORGANIZATION SEARCH & LISTING
  // ============================================
  searchOrganizations(filters: {
    query?: string;
    type?: Organization['type'];
    status?: Organization['status'];
    plan?: Organization['billing']['plan'];
    limit?: number;
    offset?: number;
  }): AsyncResult<{ organizations: Organization[]; total: number }>;
  findActiveOrganizations(limit?: number): AsyncResult<Organization[]>;
  findOrganizationsByDomain(emailDomain: string): AsyncResult<Organization[]>;
  
  // ============================================
  // SETTINGS MANAGEMENT
  // ============================================
  updateOrganizationSettings(id: string, settings: UpdateOrganizationSettingsInput): AsyncResult<boolean>;
  updateSecuritySettings(id: string, settings: Organization['settings']['securitySettings']): AsyncResult<boolean>;
  updateNotificationSettings(id: string, settings: Organization['settings']['notificationSettings']): AsyncResult<boolean>;
  updateFeatureFlags(id: string, features: Partial<Organization['settings']['features']>): AsyncResult<boolean>;
  
  // ============================================
  // BILLING & SUBSCRIPTION
  // ============================================
  updateBillingInfo(id: string, billing: Partial<Organization['billing']>): AsyncResult<boolean>;
  updateSubscription(id: string, subscription: {
    plan: Organization['billing']['plan'];
    billingCycle?: Organization['billing']['billingCycle'];
    subscriptionId?: string;
  }): AsyncResult<boolean>;
  updateUsage(id: string, usage: Partial<Organization['billing']['usage']>): AsyncResult<boolean>;
  incrementUsage(id: string, metric: keyof Organization['billing']['usage'], amount?: number): AsyncResult<boolean>;
  checkUsageLimits(id: string): AsyncResult<{
    withinLimits: boolean;
    exceeded: Array<{ metric: string; used: number; limit: number }>;
  }>;
  resetMonthlyUsage(beforeDate: Date): AsyncResult<number>;
  
  // ============================================
  // MEMBER OPERATIONS
  // ============================================
  inviteMember(
    organizationId: string,
    input: InviteOrganizationMemberInput & { invitedBy: string }
  ): AsyncResult<OrganizationMember>;
  findMemberById(organizationId: string, userId: string): AsyncResult<OrganizationMember | null>;
  findOrganizationMembers(
    organizationId: string,
    filters?: {
      role?: OrganizationMember['role'];
      status?: OrganizationMember['status'];
    }
  ): AsyncResult<OrganizationMember[]>;
  updateMemberRole(organizationId: string, userId: string, role: OrganizationMember['role']): AsyncResult<boolean>;
  updateMemberStatus(organizationId: string, userId: string, status: OrganizationMember['status']): AsyncResult<boolean>;
  acceptInvitation(token: string): AsyncResult<OrganizationMember | null>;
  removeMember(organizationId: string, userId: string): AsyncResult<boolean>;
  
  // ============================================
  // USER ORGANIZATIONS
  // ============================================
  findUserOrganizations(userId: string, includeInvited?: boolean): AsyncResult<Array<{
    organization: Organization;
    membership: OrganizationMember;
  }>>;
  getUserPrimaryOrganization(userId: string): AsyncResult<Organization | null>;
  isUserInOrganization(userId: string, organizationId: string): AsyncResult<boolean>;
  getUserRoleInOrganization(userId: string, organizationId: string): AsyncResult<OrganizationMember['role'] | null>;
  
  // ============================================
  // PERMISSIONS
  // ============================================
  getUserPermissions(userId: string, organizationId: string): AsyncResult<string[]>;
  updateMemberPermissions(organizationId: string, userId: string, permissions: string[]): AsyncResult<boolean>;
  checkPermission(userId: string, organizationId: string, permission: string): AsyncResult<boolean>;
  
  // ============================================
  // CONTACT MANAGEMENT
  // ============================================
  updateContacts(id: string, contacts: {
    primaryContactId?: string;
    billingContactId?: string;
    technicalContactId?: string;
  }): AsyncResult<boolean>;
  
  // ============================================
  // STATISTICS & ANALYTICS
  // ============================================
  updateOrganizationStats(id: string, stats: Partial<Organization['stats']>): AsyncResult<boolean>;
  getOrganizationMetrics(id: string, from?: Date, to?: Date): AsyncResult<{
    userGrowth: Array<{ date: Date; count: number }>;
    incidentTrend: Array<{ date: Date; count: number }>;
    storageUsage: Array<{ date: Date; bytes: number }>;
    apiUsage: Array<{ date: Date; calls: number }>;
  }>;
  getOrganizationActivity(id: string, days?: number): AsyncResult<{
    activeUsers: number;
    newIncidents: number;
    notificationsSent: number;
    apiCalls: number;
  }>;
  
  // ============================================
  // BULK OPERATIONS
  // ============================================
  bulkInviteMembers(
    organizationId: string,
    invites: Array<InviteOrganizationMemberInput & { invitedBy: string }>
  ): AsyncResult<OrganizationMember[]>;
  bulkUpdateMemberRoles(
    organizationId: string,
    updates: Array<{ userId: string; role: OrganizationMember['role'] }>
  ): AsyncResult<number>;
  bulkRemoveMembers(organizationId: string, userIds: string[]): AsyncResult<number>;
  
  // ============================================
  // INTEGRATIONS
  // ============================================
  updateIntegrations(id: string, integrations: Partial<Organization['settings']['integrations']>): AsyncResult<boolean>;
  validateSlackIntegration(organizationId: string, workspaceId: string): AsyncResult<boolean>;
  validateSSOConfiguration(organizationId: string): AsyncResult<{ valid: boolean; errors?: string[] }>;
  
  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================
  cleanupExpiredInvitations(): AsyncResult<number>;
  archiveInactiveOrganizations(inactiveDays: number): AsyncResult<number>;
  purgeDeletedOrganizations(beforeDate: Date): AsyncResult<number>;
  updateMemberActivity(userId: string, organizationId: string): AsyncResult<boolean>;
}