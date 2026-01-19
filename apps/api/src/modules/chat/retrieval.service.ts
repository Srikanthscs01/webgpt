import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAIService } from '../../common/openai/openai.service';
import { ChunkWithScore, Citation } from '@webgpt/shared';
import { truncate } from '@webgpt/shared';

interface RetrievalOptions {
  topK?: number;
  threshold?: number;
  vectorWeight?: number;
  ftsWeight?: number;
}

interface RetrievalResult {
  chunks: ChunkWithScore[];
  citations: Citation[];
  context: string;
}

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(
    private prisma: PrismaService,
    private openai: OpenAIService,
    private configService: ConfigService,
  ) {}

  async retrieve(siteId: string, query: string, options?: RetrievalOptions): Promise<RetrievalResult> {
    const topK = options?.topK || this.configService.get<number>('RETRIEVAL_TOP_K', 12);
    const threshold = options?.threshold || this.configService.get<number>('RETRIEVAL_MIN_SCORE', 0.3);
    const vectorWeight = options?.vectorWeight || this.configService.get<number>('RETRIEVAL_VECTOR_WEIGHT', 0.7);
    const ftsWeight = options?.ftsWeight || this.configService.get<number>('RETRIEVAL_FTS_WEIGHT', 0.3);

    this.logger.log(`Retrieving for siteId=${siteId}, query="${query}", threshold=${threshold}`);

    // Generate query embedding
    const { embedding } = await this.openai.createEmbedding(query);
    this.logger.log(`Generated embedding with ${embedding.length} dimensions`);

    // Perform parallel searches
    const [vectorResults, ftsResults] = await Promise.all([
      this.prisma.vectorSearch(siteId, embedding, topK, threshold),
      this.prisma.ftsSearch(siteId, query, topK),
    ]);

    this.logger.log(`Vector search returned ${vectorResults.length} results`);
    this.logger.log(`FTS search returned ${ftsResults.length} results`);

    // Merge and deduplicate results
    const mergedChunks = this.mergeResults(
      vectorResults,
      ftsResults,
      vectorWeight,
      ftsWeight,
      topK,
    );

    this.logger.log(`Merged results: ${mergedChunks.length} chunks`);

    // Filter by threshold
    const filteredChunks = mergedChunks.filter((c) => c.score >= threshold);
    this.logger.log(`After threshold filter: ${filteredChunks.length} chunks`);

    // Build citations
    const citations: Citation[] = filteredChunks.map((chunk) => ({
      chunkId: chunk.id,
      url: chunk.url,
      title: chunk.title,
      snippet: truncate(chunk.content, 200),
      score: chunk.score,
    }));

    // Build context string for LLM
    const context = this.buildContext(filteredChunks);

    return {
      chunks: filteredChunks as ChunkWithScore[],
      citations,
      context,
    };
  }

  private mergeResults(
    vectorResults: Array<{ id: string; pageId: string; url: string; title: string | null; content: string; tokenCount: number; headingPath: string | null; score: number }>,
    ftsResults: Array<{ id: string; pageId: string; url: string; title: string | null; content: string; tokenCount: number; headingPath: string | null; score: number }>,
    vectorWeight: number,
    ftsWeight: number,
    topK: number,
  ): Array<{ id: string; pageId: string; url: string; title: string | null; content: string; tokenCount: number; headingPath: string | null; score: number; scoreType: string }> {
    const resultMap = new Map<string, { chunk: unknown; vectorScore: number; ftsScore: number }>();

    // Normalize vector scores (already 0-1 for cosine similarity)
    const maxVectorScore = Math.max(...vectorResults.map((r) => r.score), 1);

    for (const result of vectorResults) {
      resultMap.set(result.id, {
        chunk: result,
        vectorScore: result.score / maxVectorScore,
        ftsScore: 0,
      });
    }

    // Normalize FTS scores
    const maxFtsScore = Math.max(...ftsResults.map((r) => r.score), 1);

    for (const result of ftsResults) {
      const existing = resultMap.get(result.id);
      if (existing) {
        existing.ftsScore = result.score / maxFtsScore;
      } else {
        resultMap.set(result.id, {
          chunk: result,
          vectorScore: 0,
          ftsScore: result.score / maxFtsScore,
        });
      }
    }

    // Calculate combined scores
    const combined = Array.from(resultMap.entries()).map(([id, data]) => {
      const combinedScore = data.vectorScore * vectorWeight + data.ftsScore * ftsWeight;
      const scoreType = data.vectorScore > 0 && data.ftsScore > 0 ? 'hybrid' :
                        data.vectorScore > 0 ? 'vector' : 'fts';
      
      const chunk = data.chunk as { id: string; pageId: string; url: string; title: string | null; content: string; tokenCount: number; headingPath: string | null; score: number };

      return {
        ...chunk,
        id,
        score: combinedScore,
        scoreType,
      };
    });

    // Sort by combined score and limit
    return combined
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private buildContext(chunks: Array<{ content: string; url: string; title: string | null }>): string {
    if (chunks.length === 0) {
      return '';
    }

    return chunks
      .map((chunk, index) => {
        const header = chunk.title ? `[Source ${index + 1}: ${chunk.title}]` : `[Source ${index + 1}]`;
        return `${header}\nURL: ${chunk.url}\n${chunk.content}`;
      })
      .join('\n\n---\n\n');
  }
}



