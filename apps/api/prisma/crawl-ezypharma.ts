import { PrismaClient, SiteStatus, PageStatus } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as http from 'http';

dotenv.config();

const prisma = new PrismaClient();

const BASE_URL = 'https://ezypharma.vercel.app';
const SITE_NAME = 'EzyPharma POS';
const SITE_KEY = 'ezypharma-pos';

// URLs to crawl (add more as needed)
const URLS_TO_CRAWL = [
  '/pos',
  '/',
  '/about',
  '/features',
  '/pricing',
  '/contact',
  '/login',
  '/register',
  '/dashboard',
  '/inventory',
  '/sales',
  '/reports',
  '/settings',
];

async function fetchPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.get(url, {
      headers: {
        'User-Agent': 'WebGPT Crawler/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
    }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        const redirectUrl = res.headers.location;
        if (redirectUrl) {
          fetchPage(redirectUrl.startsWith('http') ? redirectUrl : `${BASE_URL}${redirectUrl}`)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

function extractTextContent(html: string): { title: string; content: string; headings: string[] } {
  // Remove scripts and styles
  let cleaned = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');

  // Extract title
  const titleMatch = cleaned.match(/<title[^>]*>(.*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

  // Extract headings
  const headings: string[] = [];
  const headingMatches = cleaned.matchAll(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi);
  for (const match of headingMatches) {
    const headingText = match[1].replace(/<[^>]+>/g, '').trim();
    if (headingText) headings.push(headingText);
  }

  // Extract text content
  const content = cleaned
    .replace(/<[^>]+>/g, ' ')  // Remove all HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .trim();

  return { title, content, headings };
}

function chunkText(text: string, maxTokens: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const word of words) {
    const wordTokens = Math.ceil(word.length / 4); // Rough token estimate
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

  return chunks;
}

async function main() {
  console.log(`\n🚀 Crawling ${SITE_NAME} (${BASE_URL})\n`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  // Get or create workspace
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) {
    console.error('❌ No workspace found');
    process.exit(1);
  }

  // Create or update site
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
    console.log(`✅ Created site: ${site.name} (${site.siteKey})`);
  } else {
    console.log(`✅ Using existing site: ${site.name}`);
  }

  // Create widget config if not exists
  const widgetConfig = await prisma.widgetConfig.findUnique({ where: { siteId: site.id } });
  if (!widgetConfig) {
    await prisma.widgetConfig.create({
      data: {
        workspaceId: workspace.id,
        siteId: site.id,
        theme: {
          primaryColor: '#10B981', // Green theme for pharmacy
          backgroundColor: '#FFFFFF',
          textColor: '#1F2937',
          borderRadius: 12,
          position: 'bottom-right',
          offsetX: 20,
          offsetY: 20,
        },
        greeting: 'Hi! I can help you with EzyPharma POS. Ask me anything!',
        placeholder: 'Ask about POS features, pricing, etc...',
        brandName: 'EzyPharma',
        allowedDomains: ['localhost', '127.0.0.1', 'ezypharma.vercel.app'],
        rateLimit: { rpm: 60, burst: 10 },
      },
    });
    console.log('✅ Created widget configuration');
  }

  let totalChunks = 0;
  const crawledUrls = new Set<string>();

  for (const path of URLS_TO_CRAWL) {
    const fullUrl = `${BASE_URL}${path}`;
    
    if (crawledUrls.has(fullUrl)) continue;
    crawledUrls.add(fullUrl);

    console.log(`\n📄 Crawling: ${fullUrl}`);

    try {
      const html = await fetchPage(fullUrl);
      const { title, content, headings } = extractTextContent(html);

      if (content.length < 50) {
        console.log(`   ⏭️  Skipped (too little content)`);
        continue;
      }

      console.log(`   📝 Title: ${title}`);
      console.log(`   📊 Content length: ${content.length} chars`);
      console.log(`   📑 Headings: ${headings.slice(0, 3).join(', ')}${headings.length > 3 ? '...' : ''}`);

      // Create page
      const existingPage = await prisma.page.findFirst({
        where: { siteId: site.id, url: fullUrl },
      });

      let page;
      if (existingPage) {
        page = existingPage;
        // Delete old chunks
        await prisma.chunk.deleteMany({ where: { pageId: page.id } });
      } else {
        page = await prisma.page.create({
          data: {
            workspaceId: workspace.id,
            siteId: site.id,
            url: fullUrl,
            title,
            contentHash: `hash-${Date.now()}`,
            status: PageStatus.FETCHED,
          },
        });
      }

      // Chunk the content
      const chunks = chunkText(content, 400);
      console.log(`   🔪 Created ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const headingPath = headings.slice(0, 2).join(' > ') || title;

        try {
          // Generate embedding
          const response = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: chunkContent,
            encoding_format: 'float',
          });

          const embedding = response.data[0].embedding;
          const embeddingStr = `[${embedding.join(',')}]`;
          const tokenCount = response.usage?.total_tokens || 0;

          // Insert chunk with embedding
          await prisma.$executeRaw`
            INSERT INTO chunks (
              id,
              "workspaceId",
              "siteId",
              "pageId",
              url,
              title,
              content,
              "tokenCount",
              "headingPath",
              embedding,
              "createdAt"
            ) VALUES (
              gen_random_uuid(),
              ${workspace.id},
              ${site.id},
              ${page.id},
              ${fullUrl},
              ${title},
              ${chunkContent},
              ${tokenCount},
              ${headingPath},
              ${embeddingStr}::vector,
              NOW()
            )
          `;

          totalChunks++;
          console.log(`   ✅ Chunk ${i + 1}/${chunks.length} embedded (${tokenCount} tokens)`);
        } catch (err) {
          console.error(`   ❌ Failed to embed chunk ${i + 1}:`, (err as Error).message);
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Update page status
      await prisma.page.update({
        where: { id: page.id },
        data: { status: PageStatus.EMBEDDED },
      });

    } catch (err) {
      console.log(`   ❌ Failed: ${(err as Error).message}`);
    }

    // Delay between pages
    await new Promise((resolve) => setTimeout(resolve, 500));
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
  console.log(`   Pages Crawled: ${crawledUrls.size}`);
  console.log(`   Total Chunks: ${totalChunks}`);
  console.log(`\n💡 To use this site in the widget:`);
  console.log(`   Update your widget with siteKey="${SITE_KEY}"`);
  console.log(`   Or test at: http://localhost:5173?siteKey=${SITE_KEY}`);
}

main()
  .catch((e) => {
    console.error('❌ Crawl failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

