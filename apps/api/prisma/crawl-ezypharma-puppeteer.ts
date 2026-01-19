import { PrismaClient, SiteStatus, PageStatus } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import puppeteer, { Browser, Page } from 'puppeteer';

dotenv.config();

const prisma = new PrismaClient();

const BASE_URL = 'https://ezypharma.vercel.app';
const SITE_NAME = 'EzyPharma POS';
const SITE_KEY = 'ezypharma-pos';

async function extractContent(page: Page): Promise<{ title: string; content: string; headings: string[] }> {
  return await page.evaluate(() => {
    // Get title
    const title = document.title || document.querySelector('h1')?.textContent || 'Untitled';

    // Get all headings
    const headings: string[] = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      const text = el.textContent?.trim();
      if (text) headings.push(text);
    });

    // Get main content (try common selectors)
    const mainSelectors = ['main', 'article', '#root', '#app', '.content', '.main', 'body'];
    let mainElement: Element | null = null;
    
    for (const selector of mainSelectors) {
      mainElement = document.querySelector(selector);
      if (mainElement && mainElement.textContent && mainElement.textContent.trim().length > 100) {
        break;
      }
    }

    if (!mainElement) {
      mainElement = document.body;
    }

    // Clone and clean the element
    const clone = mainElement.cloneNode(true) as Element;
    
    // Remove unwanted elements
    clone.querySelectorAll('script, style, noscript, nav, footer, header, aside, iframe, svg').forEach((el) => el.remove());

    // Get text content
    let content = clone.textContent || '';
    content = content
      .replace(/\s+/g, ' ')
      .trim();

    return { title: title.trim(), content, headings };
  });
}

function chunkText(text: string, maxTokens: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4);
    if (currentTokens + wordTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentTokens = 0;
    }
    currentChunk.push(word);
    currentTokens += wordTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks.filter((c) => c.length > 50);
}

async function crawlPage(
  browser: Browser,
  url: string,
): Promise<{ title: string; content: string; headings: string[] } | null> {
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('WebGPT Crawler/1.0 (compatible; Chrome)');
    await page.setViewport({ width: 1280, height: 800 });

    console.log(`   🌐 Loading page...`);
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // Wait for content to render
    await page.waitForSelector('body', { timeout: 5000 });
    await new Promise((r) => setTimeout(r, 2000)); // Extra wait for dynamic content

    const result = await extractContent(page);
    return result;
  } catch (error) {
    console.log(`   ❌ Error: ${(error as Error).message}`);
    return null;
  } finally {
    await page.close();
  }
}

async function discoverLinks(browser: Browser, baseUrl: string): Promise<string[]> {
  const page = await browser.newPage();
  const links = new Set<string>();

  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    const foundLinks = await page.evaluate((base) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      return anchors
        .map((a) => a.getAttribute('href'))
        .filter((href): href is string => {
          if (!href) return false;
          if (href.startsWith('#')) return false;
          if (href.startsWith('javascript:')) return false;
          if (href.startsWith('mailto:')) return false;
          return true;
        })
        .map((href) => {
          if (href.startsWith('http')) return href;
          if (href.startsWith('/')) return `${base}${href}`;
          return `${base}/${href}`;
        });
    }, BASE_URL);

    for (const link of foundLinks) {
      if (link.startsWith(BASE_URL)) {
        links.add(link.split('?')[0].split('#')[0]); // Remove query params and hash
      }
    }
  } catch (error) {
    console.log(`   ⚠️ Link discovery failed: ${(error as Error).message}`);
  } finally {
    await page.close();
  }

  return Array.from(links);
}

async function main() {
  console.log(`\n🚀 Crawling ${SITE_NAME} with Puppeteer\n`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  // Launch browser
  console.log('🌐 Launching headless browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    // Get or create workspace
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) {
      console.error('❌ No workspace found');
      process.exit(1);
    }

    // Get or create site
    let site = await prisma.site.findUnique({ where: { siteKey: SITE_KEY } });
    
    if (!site) {
      site = await prisma.site.create({
        data: {
          workspaceId: workspace.id,
          name: SITE_NAME,
          domain: 'ezypharma.vercel.app',
          baseUrl: BASE_URL,
          siteKey: SITE_KEY,
          status: SiteStatus.CRAWLING,
          crawlConfig: {
            maxPages: 50,
            maxDepth: 3,
            includePatterns: [`${BASE_URL}/**`],
            excludePatterns: [],
            respectRobots: true,
            sitemapOnly: false,
            concurrency: 2,
            delayMs: 500,
          },
        },
      });
      console.log(`✅ Created site: ${site.name}`);
    } else {
      // Clear old content
      await prisma.chunk.deleteMany({ where: { siteId: site.id } });
      await prisma.page.deleteMany({ where: { siteId: site.id } });
      console.log(`✅ Using existing site: ${site.name} (cleared old content)`);
    }

    // Ensure widget config exists
    const widgetConfig = await prisma.widgetConfig.findUnique({ where: { siteId: site.id } });
    if (!widgetConfig) {
      await prisma.widgetConfig.create({
        data: {
          workspaceId: workspace.id,
          siteId: site.id,
          theme: {
            primaryColor: '#10B981',
            backgroundColor: '#FFFFFF',
            textColor: '#1F2937',
            borderRadius: 12,
            position: 'bottom-right',
            offsetX: 20,
            offsetY: 20,
          },
          greeting: 'Hi! Ask me anything about EzyPharma POS!',
          placeholder: 'Type your question...',
          brandName: 'EzyPharma',
          allowedDomains: ['localhost', '127.0.0.1', 'ezypharma.vercel.app'],
          rateLimit: { rpm: 60, burst: 10 },
        },
      });
      console.log('✅ Created widget configuration');
    }

    // Discover links
    console.log('\n🔍 Discovering pages...');
    const discoveredUrls = await discoverLinks(browser, BASE_URL);
    
    // Add base URL and /pos
    const urlsToCrawl = new Set([BASE_URL, `${BASE_URL}/pos`, ...discoveredUrls]);
    console.log(`   Found ${urlsToCrawl.size} pages to crawl`);

    let totalChunks = 0;
    let pagesProcessed = 0;

    for (const url of urlsToCrawl) {
      console.log(`\n📄 [${++pagesProcessed}/${urlsToCrawl.size}] ${url}`);

      const result = await crawlPage(browser, url);
      
      if (!result || result.content.length < 100) {
        console.log(`   ⏭️  Skipped (insufficient content)`);
        continue;
      }

      console.log(`   📝 Title: ${result.title}`);
      console.log(`   📊 Content: ${result.content.length} chars`);

      // Create page
      const page = await prisma.page.create({
        data: {
          workspaceId: workspace.id,
          siteId: site.id,
          url,
          title: result.title,
          contentHash: `hash-${Date.now()}`,
          status: PageStatus.FETCHED,
        },
      });

      // Chunk content
      const chunks = chunkText(result.content, 400);
      console.log(`   🔪 Created ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const headingPath = result.headings.slice(0, 2).join(' > ') || result.title;

        try {
          const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunkContent,
            encoding_format: 'float',
          });

          const embedding = response.data[0].embedding;
          const embeddingStr = `[${embedding.join(',')}]`;
          const tokenCount = response.usage?.total_tokens || 0;

          await prisma.$executeRaw`
            INSERT INTO chunks (
              id, "workspaceId", "siteId", "pageId", url, title,
              content, "tokenCount", "headingPath", embedding, "createdAt"
            ) VALUES (
              gen_random_uuid(), ${workspace.id}, ${site.id}, ${page.id},
              ${url}, ${result.title}, ${chunkContent}, ${tokenCount},
              ${headingPath}, ${embeddingStr}::vector, NOW()
            )
          `;

          totalChunks++;
          console.log(`   ✅ Chunk ${i + 1}/${chunks.length} embedded`);
        } catch (err) {
          console.error(`   ❌ Chunk ${i + 1} failed: ${(err as Error).message}`);
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      await prisma.page.update({
        where: { id: page.id },
        data: { status: PageStatus.EMBEDDED },
      });

      await new Promise((r) => setTimeout(r, 500));
    }

    // Update site status
    await prisma.site.update({
      where: { id: site.id },
      data: { status: SiteStatus.READY },
    });

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n🎉 Crawling Complete!`);
    console.log(`   Site: ${SITE_NAME}`);
    console.log(`   Site Key: ${SITE_KEY}`);
    console.log(`   Pages: ${pagesProcessed}`);
    console.log(`   Chunks: ${totalChunks}`);
    console.log(`\n💡 Test the widget:`);
    console.log(`   http://localhost:5173?siteKey=${SITE_KEY}`);

  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('❌ Crawl failed:', e);
  process.exit(1);
});

