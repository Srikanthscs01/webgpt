import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

export const CRAWL_QUEUE = 'CRAWL_QUEUE';
export const EMBEDDING_QUEUE = 'EMBEDDING_QUEUE';

export const QUEUE_NAMES = {
  CRAWL: 'webgpt-crawl',
  EMBEDDING: 'webgpt-embedding',
  CLEANUP: 'webgpt-cleanup',
};

@Global()
@Module({
  providers: [
    {
      provide: CRAWL_QUEUE,
      useFactory: (configService: ConfigService) => {
        const connection = new Redis(
          configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
          { maxRetriesPerRequest: null },
        );

        return new Queue(QUEUE_NAMES.CRAWL, {
          connection: connection as any,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        });
      },
      inject: [ConfigService],
    },
    {
      provide: EMBEDDING_QUEUE,
      useFactory: (configService: ConfigService) => {
        const connection = new Redis(
          configService.get<string>('REDIS_URL', 'redis://localhost:6379'),
          { maxRetriesPerRequest: null },
        );

        return new Queue(QUEUE_NAMES.EMBEDDING, {
          connection: connection as any,
          defaultJobOptions: {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [CRAWL_QUEUE, EMBEDDING_QUEUE],
})
export class QueueModule {}



