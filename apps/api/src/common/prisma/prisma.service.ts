import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');

    // Log slow queries in development
    if (this.configService.get('NODE_ENV') !== 'production') {
      (this as any).$on('query', (e: Prisma.QueryEvent) => {
        if (e.duration > 100) {
          this.logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
        }
      });
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Perform vector similarity search on chunks
   */
  async vectorSearch(
    siteId: string,
    embedding: number[],
    topK: number = 12,
    threshold: number = 0.3,
  ) {
    const embeddingStr = `[${embedding.join(',')}]`;
    
    return this.$queryRaw<Array<{
      id: string;
      pageId: string;
      url: string;
      title: string | null;
      content: string;
      tokenCount: number;
      headingPath: string | null;
      score: number;
    }>>`
      SELECT 
        id,
        "pageId",
        url,
        title,
        content,
        "tokenCount",
        "headingPath",
        1 - (embedding <=> ${embeddingStr}::vector) as score
      FROM chunks
      WHERE "siteId" = ${siteId}
        AND embedding IS NOT NULL
        AND 1 - (embedding <=> ${embeddingStr}::vector) > ${threshold}::float8
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}::int
    `;
  }

  /**
   * Perform full-text search on chunks
   */
  async ftsSearch(
    siteId: string,
    query: string,
    topK: number = 12,
  ) {
    const tsQuery = query.split(/\s+/).join(' & ');
    
    return this.$queryRaw<Array<{
      id: string;
      pageId: string;
      url: string;
      title: string | null;
      content: string;
      tokenCount: number;
      headingPath: string | null;
      score: number;
    }>>`
      SELECT 
        id,
        "pageId",
        url,
        title,
        content,
        "tokenCount",
        "headingPath",
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${query})) as score
      FROM chunks
      WHERE "siteId" = ${siteId}
        AND to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
      ORDER BY score DESC
      LIMIT ${topK}::int
    `;
  }

  /**
   * Store embedding for a chunk
   */
  async storeEmbedding(chunkId: string, embedding: number[]) {
    const embeddingStr = `[${embedding.join(',')}]`;
    
    await this.$executeRaw`
      UPDATE chunks
      SET embedding = ${embeddingStr}::vector
      WHERE id = ${chunkId}
    `;
  }

  /**
   * Batch store embeddings for chunks
   */
  async batchStoreEmbeddings(updates: Array<{ chunkId: string; embedding: number[] }>) {
    await this.$transaction(
      updates.map(({ chunkId, embedding }) => {
        const embeddingStr = `[${embedding.join(',')}]`;
        return this.$executeRaw`
          UPDATE chunks
          SET embedding = ${embeddingStr}::vector
          WHERE id = ${chunkId}
        `;
      }),
    );
  }
}



