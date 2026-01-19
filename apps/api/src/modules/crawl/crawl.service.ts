import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CrawlRun, CrawlRunStatus } from '@prisma/client';
import { CrawlProgress } from '@webgpt/shared';

@Injectable()
export class CrawlService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string, siteId?: string): Promise<CrawlRun[]> {
    return this.prisma.crawlRun.findMany({
      where: {
        workspaceId,
        ...(siteId ? { siteId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findById(id: string, workspaceId: string): Promise<CrawlRun | null> {
    return this.prisma.crawlRun.findFirst({
      where: { id, workspaceId },
    });
  }

  async findByIdOrThrow(id: string, workspaceId: string): Promise<CrawlRun> {
    const run = await this.findById(id, workspaceId);
    if (!run) {
      throw new NotFoundException('Crawl run not found');
    }
    return run;
  }

  async getProgress(id: string, workspaceId: string): Promise<CrawlProgress> {
    const run = await this.findByIdOrThrow(id, workspaceId);

    let percentComplete = 0;
    if (run.status === CrawlRunStatus.SUCCEEDED) {
      percentComplete = 100;
    } else if (run.pagesDiscovered > 0) {
      const processed = run.pagesFetched + run.pagesEmbedded + run.pagesErrored;
      percentComplete = Math.round((processed / run.pagesDiscovered) * 100);
    }

    return {
      runId: run.id,
      status: run.status as CrawlRunStatus,
      pagesDiscovered: run.pagesDiscovered,
      pagesFetched: run.pagesFetched,
      pagesEmbedded: run.pagesEmbedded,
      pagesErrored: run.pagesErrored,
      percentComplete,
    };
  }

  async updateProgress(
    id: string,
    data: {
      status?: CrawlRunStatus;
      pagesDiscovered?: number;
      pagesFetched?: number;
      pagesEmbedded?: number;
      pagesErrored?: number;
      errorSummary?: string;
      finishedAt?: Date;
    },
  ): Promise<CrawlRun> {
    return this.prisma.crawlRun.update({
      where: { id },
      data,
    });
  }
}



