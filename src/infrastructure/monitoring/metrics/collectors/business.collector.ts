// src/infrastructure/monitoring/metrics/collectors/business.collector.ts
import { PrometheusRegistry } from '../prometheus/prometheus-registry';
import { UserService } from '../../../../domain/services/user.service';
import { OrganizationService } from '../../../../domain/services/organization.service';
import { Injectable, Inject } from '../../../../core/di/decorators';

@Injectable()
export class BusinessCollector {
  private collectionInterval?: NodeJS.Timeout;

  constructor(
    private registry: PrometheusRegistry,
    // Inject services you need metrics from
    private userService: UserService,
    private organizationService: OrganizationService,
  ) {}

  public startCollection(intervalMs: number = 60000): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }

    // Collect immediately
    this.collect();

    // Then collect on interval
    this.collectionInterval = setInterval(() => {
      this.collect();
    }, intervalMs);
  }

  public stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = undefined;
    }
  }

  private async collect(): Promise<void> {
    try {
      // Collect active user counts
      // This is pseudocode - adapt to your actual service methods
      // const activeUsers = await this.userService.getActiveUserCount();
      // this.registry.activeUsers.set({ organization: 'all' }, activeUsers);
      // You might also collect per-organization metrics
      // const orgs = await this.organizationService.getAllOrganizations();
      // for (const org of orgs) {
      //   const orgUsers = await this.userService.getActiveUserCountByOrg(org.id);
      //   this.registry.activeUsers.set({ organization: org.slug }, orgUsers);
      // }
    } catch (error) {
      console.error('Failed to collect business metrics:', error);
    }
  }

  // Methods called directly from services

  public recordUserRegistration(type: string, organizationId?: string): void {
    this.registry.userRegistrations.inc({
      type,
      organization: organizationId || 'none',
    });
  }

  public recordLoginAttempt(success: boolean, provider: string = 'local'): void {
    this.registry.loginAttempts.inc({
      status: success ? 'success' : 'failed',
      provider,
    });
  }

  public recordApiKeyUsage(keyId: string, endpoint: string): void {
    this.registry.apiKeyUsage.inc({
      key_id: keyId,
      endpoint,
    });
  }

  public updateActiveUsers(count: number, organization: string = 'all'): void {
    this.registry.activeUsers.set({ organization }, count);
  }
}
