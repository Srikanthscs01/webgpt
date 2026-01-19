import { Job } from 'bullmq';
import { PrismaClient, PageStatus } from '@prisma/client';
import OpenAI from 'openai';
import { createLogger } from '../lib/logger';

const logger = createLogger('embedding-processor');

interface EmbeddingJobData {
  pageId: string;
  workspaceId: string;
  siteId: string;
}

export class EmbeddingProcessor {
  private embeddingModel: string;

  constructor(
    private prisma: PrismaClient,
    private openai: OpenAI,
  ) {
    this.embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
  }

  async process(job: Job<EmbeddingJobData>) {
    const { pageId, workspaceId, siteId } = job.data;

    logger.info({ pageId }, 'Processing embeddings');

    try {
      // Get chunks for the page
      const chunks = await this.prisma.chunk.findMany({
        where: { pageId },
        select: {
          id: true,
          content: true,
        },
      });

      if (chunks.length === 0) {
        logger.warn({ pageId }, 'No chunks found for page');
        return;
      }

      // Batch embeddings (OpenAI supports up to 2048 inputs)
      const batchSize = 100;
      let totalTokens = 0;

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const texts = batch.map((c) => c.content);

        const response = await this.openai.embeddings.create({
          model: this.embeddingModel,
          input: texts,
          encoding_format: 'float',
        });

        totalTokens += response.usage?.total_tokens || 0;

        // Store embeddings
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embedding = response.data[j]?.embedding;

          if (chunk && embedding) {
            const embeddingStr = `[${embedding.join(',')}]`;

            await this.prisma.$executeRaw`
              UPDATE chunks
              SET embedding = ${embeddingStr}::vector
              WHERE id = ${chunk.id}
            `;
          }
        }
      }

      // Update page status
      await this.prisma.page.update({
        where: { id: pageId },
        data: { status: PageStatus.EMBEDDED },
      });

      // Update usage tracking
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.usageRecord.upsert({
        where: {
          workspaceId_siteId_date: {
            workspaceId,
            siteId,
            date: today,
          },
        },
        create: {
          workspaceId,
          siteId,
          date: today,
          embeddingTokens: totalTokens,
          crawlPages: 1,
        },
        update: {
          embeddingTokens: { increment: totalTokens },
          crawlPages: { increment: 1 },
        },
      });

      logger.info({ pageId, chunks: chunks.length, tokens: totalTokens }, 'Embeddings completed');
    } catch (error) {
      logger.error({ pageId, error: (error as Error).message }, 'Embedding failed');

      await this.prisma.page.update({
        where: { id: pageId },
        data: {
          status: PageStatus.ERROR,
          error: (error as Error).message,
        },
      });

      throw error;
    }
  }
}



