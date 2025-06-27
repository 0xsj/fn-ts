import {
  CreateOrganizationInput,
  Organization,
  UpdateOrganizationInput,
  OrganizationMember,
} from '../entities';
import { AsyncResult } from '../../shared/response';

type OrganizationLimits = Organization['billing']['limits'];
type OrganizationUsage = Organization['billing']['usage'];

// src/domain/repositories/organization.repository.interface.ts
export interface IOrganizationRepository {
  create(input: CreateOrganizationInput): AsyncResult<Organization>;
  findById(id: string): AsyncResult<Organization | null>;
  findBySlug(slug: string): AsyncResult<Organization | null>;
  update(id: string, updates: UpdateOrganizationInput): AsyncResult<Organization | null>;
  delete(id: string): AsyncResult<boolean>;

  // Member management
  addMember(orgId: string, userId: string, role: string): AsyncResult<boolean>;
  removeMember(orgId: string, userId: string): AsyncResult<boolean>;
  updateMemberRole(orgId: string, userId: string, role: string): AsyncResult<boolean>;
  findMembers(orgId: string): AsyncResult<OrganizationMember[]>;

  // Usage tracking
  updateUsage(orgId: string, usage: Partial<OrganizationUsage>): AsyncResult<boolean>;
  checkLimit(
    orgId: string,
    limitType: keyof OrganizationLimits,
  ): AsyncResult<{
    current: number;
    limit: number;
    exceeded: boolean;
  }>;
}
