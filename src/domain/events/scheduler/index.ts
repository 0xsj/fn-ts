import { DomainEvent } from '../base.event';
import { CronJobResult } from '../../../infrastructure/scheduler/types';

export class CronJobExecutedEvent extends DomainEvent {
  constructor(public readonly result: CronJobResult) {
    super('cron.job.executed', 'scheduler');
  }
}

export class CronJobFailEvent extends DomainEvent {
  constructor(public readonly result: CronJobResult) {
    super('cron.job.failed', 'scheduler');
  }
}
