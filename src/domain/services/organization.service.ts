// src/domain/services/organization.service.ts
import { Injectable } from '../../core/di/decorators/injectable.decorator';
import type { IOrganization } from '../interface/organization.interface';
import type { CreateOrganizationInput, UpdateOrganizationInput, Organization } from '../entities';
import type { AsyncResult } from '../../shared/response';
import { NotFoundError, ResponseBuilder, isSuccessResponse } from '../../shared/response';
import { EventBus } from '../../infrastructure/events/event-bus';
import { Inject } from '../../core/di/decorators';
import { ILogger } from '../../shared/utils';
import { TOKENS } from '../../core/di/tokens';

@Injectable()
export class OrganizationService {
  constructor(
    @Inject(TOKENS.OrganizationRepository) private orgRepo: IOrganization,
    @Inject() private eventBus: EventBus,
    @Inject(TOKENS.Logger) private logger: ILogger,
  ) {
    this.logger.info('OrganizationService Initialized');
  }

  /**
   * Create a new organization
   */
  async createOrganization(
    input: CreateOrganizationInput,
    createdBy: string,
    correlationId?: string,
  ): AsyncResult<Organization> {
    // For now, the owner is the creator.
    // You might want to handle this differently based on your business logic
    const result = await this.orgRepo.createOrganization(
      {
        ...input,
        ownerId: createdBy,
        createdBy: createdBy,
      },
      correlationId,
    );

    if (isSuccessResponse(result)) {
      const organization = result.body().data;

      // TODO: Emit OrganizationCreatedEvent
      // await this.eventBus.emit(
      //   new OrganizationCreatedEvent({
      //     organizationId: organization.id,
      //     name: organization.name,
      //     ownerId: organization.ownerId,
      //     createdBy: organization.createdBy
      //   }, correlationId)
      // );

      // TODO: Create initial organization member entry for the owner
      // await this.orgRepo.inviteMember(
      //   organization.id,
      //   {
      //     email: creatorEmail,
      //     role: 'owner',
      //     sendInvitationEmail: false
      //   },
      //   correlationId
      // );
    }

    return result;
  }

  /**
   * Get organization by ID
   */
  async getOrganizationById(id: string, correlationId?: string): AsyncResult<Organization> {
    const result = await this.orgRepo.findOrganizationById(id, correlationId);

    if (isSuccessResponse(result)) {
      const organization = result.body().data;
      if (!organization) {
        return new NotFoundError('Organization not found', correlationId);
      }
      return ResponseBuilder.ok(organization, correlationId);
    }

    return result;
  }

  async getOrganizationBySlug(slug: string, correlationId?: string): AsyncResult<Organization> {
    const result = await this.orgRepo.findOrganizationBySlug(slug, correlationId);

    if (isSuccessResponse(result)) {
      const organization = result.body().data;
      if (!organization) {
        return new NotFoundError('Organization not found', correlationId);
      }
      return ResponseBuilder.ok(organization, correlationId);
    }

    return result;
  }

  /**
   * Update an existing organization
   */
  async updateOrganization(
    id: string,
    updates: UpdateOrganizationInput,
    correlationId?: string,
  ): AsyncResult<Organization> {
    this.logger.info('Updating organization', {
      organizationId: id,
      fieldsBeingUpdated: Object.keys(updates),
      correlationId,
    });

    const result = await this.orgRepo.updateOrganization(id, updates, correlationId);

    if (isSuccessResponse(result)) {
      const organization = result.body().data;

      if (!organization) {
        return new NotFoundError('Organization not found', correlationId);
      }

      this.logger.info('Organization updated successfully', {
        organizationId: organization.id,
        correlationId,
      });

      return ResponseBuilder.ok(organization, correlationId);
    }

    this.logger.error('Failed to update organization', {
      organizationId: id,
      errorMessage: result.message,
      errorCode: result.code,
      errorKind: result.kind,
      correlationId,
    });

    return result;
  }

  // Helper method for audit decorator to get "before" state
  async findById(id: string, correlationId?: string): AsyncResult<Organization | null> {
    return this.getOrganizationById(id, correlationId);
  }
}
