// src/infrastructure/queue/bull-board.ts
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { DIContainer } from '../../core/di/container';
import { TOKENS } from '../../core/di/tokens';
import { QueueManager } from './queue.manager';

export function setupBullBoard() {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  // Get QueueManager instance
  const queueManager = DIContainer.resolve<QueueManager>(TOKENS.QueueManager);

  // Get the actual queue instances from your queue manager
  const emailQueue = queueManager.getEmailQueue();
  const notificationQueue = queueManager.getNotificationQueue();

  // Create the Bull Board using the queue instances
  createBullBoard({
    queues: [
      new BullMQAdapter(emailQueue.getQueue()), // You'll need to add getQueue() method
      new BullMQAdapter(notificationQueue.getQueue()),
    ],
    serverAdapter,
  });

  return serverAdapter;
}
