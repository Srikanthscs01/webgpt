import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Site, SiteStatus, Prisma } from '@prisma/client';
import { generateSiteKey, extractDomain } from '@webgpt/shared';
import { CrawlConfig } from '@webgpt/shared';

const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  maxPages: 1000,
  maxDepth: 10,
  includePatterns: [],
  excludePatterns: [],
  respectRobots: true,
  sitemapOnly: false,
  concurrency: 5,
  delayMs: 100,
};

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string): Promise<Site[]> {
    return this.prisma.site.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, workspaceId: string): Promise<Site | null> {
    return this.prisma.site.findFirst({
      where: { id, workspaceId },
    });
  }

  async findByIdOrThrow(id: string, workspaceId: string): Promise<Site> {
    const site = await this.findById(id, workspaceId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  async findBySiteKey(siteKey: string): Promise<Site | null> {
    return this.prisma.site.findUnique({
      where: { siteKey },
    });
  }

  async create(
    workspaceId: string,
    data: {
      name: string;
      baseUrl: string;
      crawlConfig?: Partial<CrawlConfig>;
    },
  ): Promise<Site> {
    const domain = extractDomain(data.baseUrl);
    if (!domain) {
      throw new ConflictException('Invalid URL');
    }

    // Check for existing site with same domain
    const existing = await this.prisma.site.findFirst({
      where: { workspaceId, domain },
    });

    if (existing) {
      throw new ConflictException('Site with this domain already exists');
    }

    const siteKey = generateSiteKey();
    const crawlConfig = { ...DEFAULT_CRAWL_CONFIG, ...data.crawlConfig };

    const site = await this.prisma.site.create({
      data: {
        workspaceId,
        name: data.name,
        domain,
        baseUrl: data.baseUrl,
        siteKey,
        crawlConfig: crawlConfig as any,
        status: SiteStatus.NEW,
      },
    });

    // Create default widget config
    await this.prisma.widgetConfig.create({
      data: {
        workspaceId,
        siteId: site.id,
      },
    });

    return site;
  }

  async update(
    id: string,
    workspaceId: string,
    data: {
      name?: string;
      crawlConfig?: Partial<CrawlConfig>;
    },
  ): Promise<Site> {
    const site = await this.findByIdOrThrow(id, workspaceId);

    const updateData: Prisma.SiteUpdateInput = {};

    if (data.name) {
      updateData.name = data.name;
    }

    if (data.crawlConfig) {
      const currentConfig = site.crawlConfig as unknown as CrawlConfig;
      updateData.crawlConfig = {
        ...currentConfig,
        ...data.crawlConfig,
      } as any;
    }

    return this.prisma.site.update({
      where: { id },
      data: updateData,
    });
  }

  async updateStatus(id: string, status: SiteStatus): Promise<Site> {
    return this.prisma.site.update({
      where: { id },
      data: {
        status,
        ...(status === SiteStatus.READY ? { lastCrawledAt: new Date() } : {}),
      },
    });
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.findByIdOrThrow(id, workspaceId);

    await this.prisma.site.delete({
      where: { id },
    });
  }

  async regenerateSiteKey(id: string, workspaceId: string): Promise<Site> {
    await this.findByIdOrThrow(id, workspaceId);

    return this.prisma.site.update({
      where: { id },
      data: { siteKey: generateSiteKey() },
    });
  }

  async getStats(
    id: string,
    workspaceId: string,
  ): Promise<{
    pages: number;
    chunks: number;
    conversations: number;
    lastCrawl: Date | null;
  }> {
    const site = await this.findByIdOrThrow(id, workspaceId);

    const [pages, chunks, conversations] = await Promise.all([
      this.prisma.page.count({ where: { siteId: id } }),
      this.prisma.chunk.count({ where: { siteId: id } }),
      this.prisma.conversation.count({ where: { siteId: id } }),
    ]);

    return {
      pages,
      chunks,
      conversations,
      lastCrawl: site.lastCrawledAt,
    };
  }
}



