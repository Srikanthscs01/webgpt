import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Page, Chunk, PageStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { EMBEDDING_QUEUE } from '../../common/queue/queue.module';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    @Inject(EMBEDDING_QUEUE) private embeddingQueue: Queue,
  ) {}

  async getPages(
    workspaceId: string,
    siteId: string,
    options?: {
      status?: PageStatus;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ pages: Page[]; total: number }> {
    const where = {
      workspaceId,
      siteId,
      ...(options?.status ? { status: options.status } : {}),
    };

    const [pages, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.page.count({ where }),
    ]);

    return { pages, total };
  }

  async getPage(id: string, workspaceId: string): Promise<Page & { chunks: Chunk[] }> {
    const page = await this.prisma.page.findFirst({
      where: { id, workspaceId },
      include: {
        chunks: {
          select: {
            id: true,
            content: true,
            tokenCount: true,
            headingPath: true,
            createdAt: true,
          },
        },
      },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    return page as Page & { chunks: Chunk[] };
  }

  async getChunks(
    workspaceId: string,
    siteId: string,
    options?: {
      pageId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ chunks: Partial<Chunk>[]; total: number }> {
    const where = {
      workspaceId,
      siteId,
      ...(options?.pageId ? { pageId: options.pageId } : {}),
    };

    const [chunks, total] = await Promise.all([
      this.prisma.chunk.findMany({
        where,
        select: {
          id: true,
          pageId: true,
          url: true,
          title: true,
          content: true,
          tokenCount: true,
          headingPath: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.chunk.count({ where }),
    ]);

    return { chunks, total };
  }

  async reembedPage(id: string, workspaceId: string): Promise<void> {
    const page = await this.prisma.page.findFirst({
      where: { id, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Queue re-embedding
    await this.embeddingQueue.add('embed-page', {
      pageId: id,
      workspaceId,
      siteId: page.siteId,
    });
  }

  async reembedSite(siteId: string, workspaceId: string): Promise<void> {
    const pages = await this.prisma.page.findMany({
      where: { siteId, workspaceId, status: PageStatus.FETCHED },
      select: { id: true },
    });

    // Queue re-embedding for all pages
    for (const page of pages) {
      await this.embeddingQueue.add('embed-page', {
        pageId: page.id,
        workspaceId,
        siteId,
      });
    }
  }

  async deletePage(id: string, workspaceId: string): Promise<void> {
    const page = await this.prisma.page.findFirst({
      where: { id, workspaceId },
    });

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.prisma.page.delete({
      where: { id },
    });
  }
}



