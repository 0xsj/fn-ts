import { Injectable, Inject } from '../../../core/di/decorators';
import { TOKENS } from '../../../core/di/tokens';
import { IAccessControl } from '../../../domain/interface/access-control.interface';
import { IUser } from '../../../domain/interface/user.interface';
import { logger } from '../../../shared/utils';
import { CacheService } from '../../cache/cache.service';

export interface PermissionCheck {
  resource: string;
  action: string;
  scope?: 'own' | 'team' | 'organization' | 'global';
  resourceId?: string;
  organizationId?: string;
}

@Injectable()
export class PermissionService {}
