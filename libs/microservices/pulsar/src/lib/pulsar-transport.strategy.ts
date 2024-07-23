import { Server, CustomTransportStrategy } from '@nestjs/microservices';
import { Client, Consumer, Message } from 'pulsar-client';
import { Logger } from '@nestjs/common';

export class PulsarTransportStrategy
  extends Server
  implements CustomTransportStrategy
{
  private client: Client;
  private consumer!: Consumer;
  private handlers: Map<string, (data: any, context: any) => void> = new Map();

  constructor(private readonly pulsarOptions: any) {
    super();
    this.client = new Client({
      serviceUrl: pulsarOptions.serviceUrl,
    });
  }

  async listen(callback: () => void) {
    try {
      this.consumer = await this.client.subscribe({
        topic: this.pulsarOptions.topic,
        subscription: this.pulsarOptions.subscription,
        subscriptionType: this.pulsarOptions.subscriptionType,
      });
      this.start(callback);
    } catch (error) {
      Logger.error('Failed to subscribe to Pulsar topic', error);
    }
  }

  async close() {
    try {
      await this.consumer.close();
      await this.client.close();
    } catch (error) {
      Logger.error('Failed to close Pulsar client or consumer', error);
    }
  }

  async start(callback: () => void) {
    callback();
    Logger.log('Pulsar transport started');
    this.consumeMessages();
  }

  private async consumeMessages() {
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const message: Message = await this.consumer.receive();
        this.handleMessage(message);
      }
    } catch (error) {
      Logger.error('Error in message consumption', error);
    }
  }

  private handleMessage(message: Message) {
    const messageHandler = this.handlers.get(message.getTopicName());
    if (!messageHandler) {
      Logger.log(`No handler for message pattern: ${message.getTopicName()}`);
      return;
    }

    const data = message.getData().toString();
    const context = {
      id: message.getMessageId().toString(),
      timestamp: message.getPublishTimestamp(),
    };

    try {
      messageHandler(data, context);
    } catch (error) {
      Logger.error('Error handling message', error);
    }
  }

  subscribeToResponseOf(
    pattern: string,
    handler: (data: any, context: any) => void
  ): void {
    this.handlers.set(pattern, handler);
    Logger.log(`Handler subscribed for pattern: ${pattern}`);
  }
}
