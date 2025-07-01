// src/domain/services/organization.service.ts
import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import type { IOrganization } from '../interface/organization.interface';
import type { CreateOrganizationInput, UpdateOrganizationInput, Organization } from '../entities';
import type { AsyncResult } from '../../shared/response';
import {
  ConflictError,
  NotFoundError,
  ResponseBuilder,
  isSuccessResponse,
} from '../../shared/response';
import { EventBus } from '../../infrastructure/events/event-bus';

@injectable()
export class OrganizationService {
  constructor(
    @inject(TOKENS.OrganizationRepository) private orgRepo: IOrganization,
    @inject(TOKENS.EventBus) private eventBus: EventBus,
  ) {}

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
}
