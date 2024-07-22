import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client, Consumer, ConsumerConfig, Message } from 'pulsar-client';
import { nextTick } from 'process';
export abstract class PulsarConsumer<T>
  implements OnModuleInit, OnModuleDestroy
{
  private consumer!: Consumer;
  protected running = true;

  constructor(
    private readonly pulsarClient: Client,
    private readonly config: ConsumerConfig
  ) {}

  async onModuleDestroy() {
    this.running = false;
    Logger.log('PULSAR CONSUMER DESTROY');
    await this.consumer.close();
  }

  async onModuleInit() {
    Logger.log('PULSAR CONSUMER INIT');
    await this.connect();
  }

  protected async connect() {
    this.consumer = await this.pulsarClient.subscribe(this.config);
    nextTick(this.consume.bind(this));
  }

  private async consume() {
    while (this.running) {
      try {
        const messages = await this.consumer.batchReceive();
        await Promise.allSettled(
          messages.map((message) => this.receive(message))
        );
      } catch (error) {
        Logger.error('Error receiving batch', error);
      }
    }
  }

  private async receive(message: Message) {
    try {
      const data: T = JSON.parse(message.getData().toString());
      console.log(data, message.getMessageId().toString());
      this.handleMessage(data);
    } catch (error) {
      Logger.error('error consuming', error);
    }

    try {
      await this.consumer.acknowledge(message);
    } catch (error) {
      Logger.error("Can't be acknolwedged", error);
    }
  }

  protected abstract handleMessage(data: T): void;
}
