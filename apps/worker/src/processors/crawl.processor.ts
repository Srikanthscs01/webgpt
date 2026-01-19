import { Job, Queue } from 'bullmq';
import { PrismaClient, PageStatus, SiteStatus, CrawlRunStatus } from '@prisma/client';
import Redis from 'ioredis';
import OpenAI from 'openai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import robotsParser from 'robots-parser';
import Sitemapper from 'sitemapper';
import { 
  normalizeUrl, 
  hashContent, 
  isSameOrigin, 
  matchesPattern,
  getUrlDepth,
  chunkText,
  sleep,
} from '@webgpt/shared';
import { createLogger } from '../lib/logger';

const logger = createLogger('crawl-processor');

interface CrawlConfig {
  maxPages: number;
  maxDepth: number;
  includePatterns: string[];
  excludePatterns: string[];
  respectRobots: boolean;
  sitemapOnly: boolean;
  concurrency: number;
  delayMs: number;
}

interface CrawlJobData {
  runId: string;
  siteId: string;
  workspaceId: string;
  baseUrl: string;
  crawlConfig: CrawlConfig;
}

export class CrawlProcessor {
  private embeddingQueue: Queue;

  constructor(
    private prisma: PrismaClient,
    private redis: Redis,
    private openai: OpenAI,
  ) {
    this.embeddingQueue = new Queue('webgpt:embedding', {
      connection: redis,
    });
  }

  async process(job: Job<CrawlJobData>) {
    const { runId, siteId, workspaceId, baseUrl, crawlConfig } = job.data;

    logger.info({ runId, siteId, baseUrl }, 'Starting crawl');

    try {
      // Update run status
      await this.prisma.crawlRun.update({
        where: { id: runId },
        data: { status: CrawlRunStatus.RUNNING, startedAt: new Date() },
      });

      await this.prisma.site.update({
        where: { id: siteId },
        data: { status: SiteStatus.CRAWLING },
      });

      // Get robots.txt
      let robots: ReturnType<typeof robotsParser> | null = null;
      if (crawlConfig.respectRobots) {
        try {
          const robotsUrl = new URL('/robots.txt', baseUrl).toString();
          const response = await axios.get(robotsUrl, { timeout: 10000 });
          robots = robotsParser(robotsUrl, response.data);
        } catch (e) {
          logger.warn({ baseUrl }, 'Could not fetch robots.txt');
        }
      }

      // Get URLs from sitemap or start with base URL
      let urlsToProcess: string[] = [];

      if (crawlConfig.sitemapOnly) {
        urlsToProcess = await this.getSitemapUrls(baseUrl);
      } else {
        urlsToProcess = [baseUrl];

        // Try to get sitemap URLs as well
        try {
          const sitemapUrls = await this.getSitemapUrls(baseUrl);
          urlsToProcess.push(...sitemapUrls);
        } catch (e) {
          logger.warn({ baseUrl }, 'Could not fetch sitemap');
        }
      }

      // Deduplicate
      urlsToProcess = [...new Set(urlsToProcess.map((u) => normalizeUrl(u, baseUrl)))];

      // Filter by patterns
      if (crawlConfig.includePatterns.length > 0) {
        urlsToProcess = urlsToProcess.filter((url) =>
          matchesPattern(url, crawlConfig.includePatterns),
        );
      }

      if (crawlConfig.excludePatterns.length > 0) {
        urlsToProcess = urlsToProcess.filter(
          (url) => !matchesPattern(url, crawlConfig.excludePatterns),
        );
      }

      const visited = new Set<string>();
      const discovered = new Set<string>(urlsToProcess);
      let pagesFetched = 0;
      let pagesEmbedded = 0;
      let pagesErrored = 0;

      // Update discovered count
      await this.prisma.crawlRun.update({
        where: { id: runId },
        data: { pagesDiscovered: discovered.size },
      });

      // Process URLs
      while (urlsToProcess.length > 0 && visited.size < crawlConfig.maxPages) {
        // Check if cancelled
        const run = await this.prisma.crawlRun.findUnique({ where: { id: runId } });
        if (run?.status === CrawlRunStatus.CANCELLED) {
          logger.info({ runId }, 'Crawl cancelled');
          break;
        }

        const url = urlsToProcess.shift()!;

        if (visited.has(url)) continue;
        visited.add(url);

        // Check robots
        if (robots && !robots.isAllowed(url)) {
          logger.debug({ url }, 'Blocked by robots.txt');
          continue;
        }

        // Check depth
        const depth = getUrlDepth(url);
        if (depth > crawlConfig.maxDepth) {
          logger.debug({ url, depth }, 'Exceeded max depth');
          continue;
        }

        try {
          // Fetch page
          const result = await this.fetchPage(url, baseUrl);

          if (!result) {
            pagesErrored++;
            continue;
          }

          const { content, title, links, mimeType, httpStatus } = result;

          // Check if content changed
          const contentHash = hashContent(content);

          const existingPage = await this.prisma.page.findFirst({
            where: { siteId, url },
          });

          if (existingPage?.contentHash === contentHash) {
            logger.debug({ url }, 'Content unchanged, skipping');
            continue;
          }

          // Store or update page
          const page = await this.prisma.page.upsert({
            where: { siteId_url: { siteId, url } },
            create: {
              workspaceId,
              siteId,
              url,
              title,
              rawContent: content,
              contentHash,
              status: PageStatus.FETCHED,
              httpStatus,
              mimeType,
              lastCrawledAt: new Date(),
            },
            update: {
              title,
              rawContent: content,
              contentHash,
              status: PageStatus.FETCHED,
              httpStatus,
              mimeType,
              lastCrawledAt: new Date(),
              error: null,
            },
          });

          pagesFetched++;

          // Delete old chunks
          await this.prisma.chunk.deleteMany({
            where: { pageId: page.id },
          });

          // Create chunks
          const chunks = chunkText(content, {
            targetSize: 800,
            minSize: 200,
            maxSize: 1000,
            overlap: 100,
          });

          for (const chunk of chunks) {
            await this.prisma.chunk.create({
              data: {
                workspaceId,
                siteId,
                pageId: page.id,
                url,
                title,
                content: chunk.content,
                tokenCount: chunk.tokenCount,
                headingPath: chunk.headingPath,
              },
            });
          }

          // Queue embedding
          await this.embeddingQueue.add('embed-page', {
            pageId: page.id,
            workspaceId,
            siteId,
          });

          pagesEmbedded++;

          // Add discovered links to queue
          if (!crawlConfig.sitemapOnly) {
            for (const link of links) {
              const normalizedLink = normalizeUrl(link, baseUrl);
              
              if (
                isSameOrigin(normalizedLink, baseUrl) &&
                !visited.has(normalizedLink) &&
                !discovered.has(normalizedLink)
              ) {
                discovered.add(normalizedLink);
                urlsToProcess.push(normalizedLink);
              }
            }
          }

          // Update progress
          await this.prisma.crawlRun.update({
            where: { id: runId },
            data: {
              pagesDiscovered: discovered.size,
              pagesFetched,
              pagesEmbedded,
              pagesErrored,
            },
          });

          // Rate limiting
          await sleep(crawlConfig.delayMs);
        } catch (error) {
          pagesErrored++;
          logger.error({ url, error: (error as Error).message }, 'Error processing page');

          await this.prisma.page.upsert({
            where: { siteId_url: { siteId, url } },
            create: {
              workspaceId,
              siteId,
              url,
              status: PageStatus.ERROR,
              error: (error as Error).message,
            },
            update: {
              status: PageStatus.ERROR,
              error: (error as Error).message,
            },
          });
        }
      }

      // Complete crawl
      await this.prisma.crawlRun.update({
        where: { id: runId },
        data: {
          status: CrawlRunStatus.SUCCEEDED,
          finishedAt: new Date(),
          pagesDiscovered: discovered.size,
          pagesFetched,
          pagesEmbedded,
          pagesErrored,
        },
      });

      await this.prisma.site.update({
        where: { id: siteId },
        data: {
          status: SiteStatus.READY,
          lastCrawledAt: new Date(),
        },
      });

      logger.info({ runId, pagesFetched, pagesEmbedded, pagesErrored }, 'Crawl completed');
    } catch (error) {
      logger.error({ runId, error: (error as Error).message }, 'Crawl failed');

      await this.prisma.crawlRun.update({
        where: { id: runId },
        data: {
          status: CrawlRunStatus.FAILED,
          finishedAt: new Date(),
          errorSummary: (error as Error).message,
        },
      });

      await this.prisma.site.update({
        where: { id: siteId },
        data: { status: SiteStatus.ERROR },
      });

      throw error;
    }
  }

  private async getSitemapUrls(baseUrl: string): Promise<string[]> {
    const sitemap = new Sitemapper({
      url: new URL('/sitemap.xml', baseUrl).toString(),
      timeout: 30000,
    });

    try {
      const { sites } = await sitemap.fetch();
      return sites;
    } catch {
      return [];
    }
  }

  private async fetchPage(
    url: string,
    baseUrl: string,
  ): Promise<{
    content: string;
    title: string | null;
    links: string[];
    mimeType: string;
    httpStatus: number;
  } | null> {
    const response = await axios.get(url, {
      timeout: 30000,
      maxRedirects: 5,
      validateStatus: (status) => status < 400,
      headers: {
        'User-Agent': process.env.CRAWLER_USER_AGENT || 'WebGPT Bot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const contentType = response.headers['content-type'] || '';
    const httpStatus = response.status;

    if (contentType.includes('text/html')) {
      return this.parseHtml(response.data, url, contentType, httpStatus);
    } else if (contentType.includes('application/pdf')) {
      return this.parsePdf(response.data, url, httpStatus);
    } else if (contentType.includes('text/plain') || contentType.includes('text/markdown')) {
      return {
        content: response.data,
        title: null,
        links: [],
        mimeType: contentType,
        httpStatus,
      };
    }

    // Skip other content types
    logger.debug({ url, contentType }, 'Skipping unsupported content type');
    return null;
  }

  private parseHtml(
    html: string,
    url: string,
    mimeType: string,
    httpStatus: number,
  ): { content: string; title: string | null; links: string[]; mimeType: string; httpStatus: number } {
    // Use Readability to extract main content
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    // Also use cheerio to extract links
    const $ = cheerio.load(html);
    const links: string[] = [];

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        try {
          const absoluteUrl = new URL(href, url).toString();
          links.push(absoluteUrl);
        } catch {
          // Invalid URL, skip
        }
      }
    });

    const title = article?.title || $('title').text() || null;
    const content = article?.textContent || $('body').text() || '';

    return {
      content: content.trim(),
      title,
      links,
      mimeType,
      httpStatus,
    };
  }

  private async parsePdf(
    data: Buffer,
    url: string,
    httpStatus: number,
  ): Promise<{ content: string; title: string | null; links: string[]; mimeType: string; httpStatus: number }> {
    try {
      // Dynamic import for pdf-parse
      const pdfParse = (await import('pdf-parse')).default;
      const pdf = await pdfParse(data);

      return {
        content: pdf.text,
        title: pdf.info?.Title || null,
        links: [],
        mimeType: 'application/pdf',
        httpStatus,
      };
    } catch (error) {
      logger.warn({ url, error: (error as Error).message }, 'Failed to parse PDF');
      return {
        content: '',
        title: null,
        links: [],
        mimeType: 'application/pdf',
        httpStatus,
      };
    }
  }
}



