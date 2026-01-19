import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { Worker as BullWorker } from 'bullmq';
import OpenAI from 'openai';
import { createLogger } from './lib/logger';
import { CrawlProcessor } from './processors/crawl.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';

const logger = createLogger('main');

const QUEUE_NAMES = {
  CRAWL: 'webgpt:crawl',
  EMBEDDING: 'webgpt:embedding',
};

async function main() {
  logger.info('🚀 Starting WebGPT Worker...');

  // Initialize services
  const prisma = new PrismaClient();
  await prisma.$connect();
  logger.info('✅ Connected to database');

  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
  logger.info('✅ Connected to Redis');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 60000,
    maxRetries: 3,
  });
  logger.info('✅ OpenAI client initialized');

  // Create processors
  const crawlProcessor = new CrawlProcessor(prisma, redis, openai);
  const embeddingProcessor = new EmbeddingProcessor(prisma, openai);

  // Create workers
  const crawlWorker = new BullWorker(
    QUEUE_NAMES.CRAWL,
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing crawl job');
      await crawlProcessor.process(job);
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.CRAWLER_CONCURRENCY || '2', 10),
    },
  );

  crawlWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Crawl job completed');
  });

  crawlWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Crawl job failed');
  });

  const embeddingWorker = new BullWorker(
    QUEUE_NAMES.EMBEDDING,
    async (job) => {
      logger.info({ jobId: job.id, data: job.data }, 'Processing embedding job');
      await embeddingProcessor.process(job);
    },
    {
      connection: redis,
      concurrency: parseInt(process.env.EMBEDDING_CONCURRENCY || '5', 10),
    },
  );

  embeddingWorker.on('completed', (job) => {
    logger.info({ jobId: job.id }, 'Embedding job completed');
  });

  embeddingWorker.on('failed', (job, error) => {
    logger.error({ jobId: job?.id, error: error.message }, 'Embedding job failed');
  });

  logger.info('✅ Workers started');

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down workers...');
    await crawlWorker.close();
    await embeddingWorker.close();
    await prisma.$disconnect();
    await redis.quit();
    logger.info('Workers shut down gracefully');
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('🎉 WebGPT Worker running. Waiting for jobs...');
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start worker');
  process.exit(1);
});



