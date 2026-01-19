import { PrismaClient, SiteStatus, PageStatus } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import puppeteer, { Browser, Page } from 'puppeteer';

dotenv.config();

const prisma = new PrismaClient();

const BASE_URL = 'https://ezypharma.vercel.app';
const SITE_NAME = 'EzyPharma POS';
const SITE_KEY = 'ezypharma-pos';

const LOGIN_EMAIL = 'sri@gmail.com';
const LOGIN_PASSWORD = '123456';

const PAGES_TO_CRAWL = [
  '/pos',
  '/dashboard',
  '/inventory',
  '/sales',
  '/reports',
  '/customers',
  '/products',
  '/orders',
  '/settings',
  '/profile',
  '/billing',
  '/analytics',
  '/suppliers',
  '/categories',
];

async function login(page: Page): Promise<boolean> {
  console.log('\n🔐 Logging in to PharmaCare POS...');
  
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2000));

    // Fill email
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.click({ clickCount: 3 });
      await emailInput.type(LOGIN_EMAIL, { delay: 30 });
      console.log('   ✅ Email entered');
    }

    // Fill password
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.click({ clickCount: 3 });
      await passwordInput.type(LOGIN_PASSWORD, { delay: 30 });
      console.log('   ✅ Password entered');
    }

    await new Promise((r) => setTimeout(r, 500));

    // Click Sign In button - look for button with text containing "Sign"
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await button.evaluate((el) => el.textContent?.toLowerCase() || '');
      if (text.includes('sign') || text.includes('login')) {
        await button.click();
        console.log('   ✅ Clicked Sign In button');
        break;
      }
    }

    // Wait for navigation
    await new Promise((r) => setTimeout(r, 3000));

    // Check if logged in
    const currentUrl = page.url();
    console.log(`   📍 Current URL: ${currentUrl}`);

    // Take screenshot after login
    await page.screenshot({ path: 'after-login.png', fullPage: true });
    console.log('   📸 Screenshot saved: after-login.png');

    return !currentUrl.includes('login') && !currentUrl.includes('signin');
  } catch (error) {
    console.error('   ❌ Login error:', (error as Error).message);
    return false;
  }
}

async function extractContent(page: Page): Promise<{ title: string; content: string; headings: string[] }> {
  return await page.evaluate(() => {
    const title = document.title || document.querySelector('h1')?.textContent || 'Untitled';

    const headings: string[] = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length < 200) headings.push(text);
    });

    // Clone body and remove unwanted elements
    const clone = document.body.cloneNode(true) as Element;
    clone.querySelectorAll('script, style, noscript, iframe, svg').forEach((el) => el.remove());

    // Extract specific content
    const contentParts: string[] = [];

    // Page title and headings
    contentParts.push(`Page: ${title}`);
    if (headings.length > 0) {
      contentParts.push(`Sections: ${headings.join(', ')}`);
    }

    // Get all visible text from cards, tables, forms
    document.querySelectorAll('.card, [class*="card"], table, form, main, .content').forEach((el) => {
      const text = el.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 20) {
        contentParts.push(text.substring(0, 500));
      }
    });

    // Navigation items
    const navItems: string[] = [];
    document.querySelectorAll('nav a, aside a, [class*="sidebar"] a, [class*="nav"] a').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 1 && text.length < 50) navItems.push(text);
    });
    if (navItems.length > 0) {
      contentParts.push(`Features: ${[...new Set(navItems)].join(', ')}`);
    }

    // Buttons and actions
    const actions: string[] = [];
    document.querySelectorAll('button, [role="button"]').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 1 && text.length < 30) actions.push(text);
    });
    if (actions.length > 0) {
      contentParts.push(`Actions available: ${[...new Set(actions)].join(', ')}`);
    }

    // Form labels
    const labels: string[] = [];
    document.querySelectorAll('label').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 1 && text.length < 50) labels.push(text);
    });
    if (labels.length > 0) {
      contentParts.push(`Form fields: ${[...new Set(labels)].join(', ')}`);
    }

    // Table headers
    const tableHeaders: string[] = [];
    document.querySelectorAll('th').forEach((el) => {
      const text = el.textContent?.trim();
      if (text && text.length > 1) tableHeaders.push(text);
    });
    if (tableHeaders.length > 0) {
      contentParts.push(`Data columns: ${[...new Set(tableHeaders)].join(', ')}`);
    }

    // Stats/metrics
    document.querySelectorAll('[class*="stat"], [class*="metric"], [class*="count"]').forEach((el) => {
      const text = el.textContent?.replace(/\s+/g, ' ').trim();
      if (text && text.length > 5) contentParts.push(`Metric: ${text}`);
    });

    let content = clone.textContent?.replace(/\s+/g, ' ').trim() || '';
    content = contentParts.join('. ') + '. ' + content.substring(0, 1000);

    return { title: title.trim(), content, headings };
  });
}

function chunkText(text: string, maxTokens: number = 500): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4);
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.join('. ') + '.');
      currentChunk = [];
      currentTokens = 0;
    }
    currentChunk.push(sentence.trim());
    currentTokens += sentenceTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('. ') + '.');
  }

  return chunks.filter((c) => c.length > 50);
}

async function main() {
  console.log(`\n🚀 Crawling ${SITE_NAME}\n`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    const workspace = await prisma.workspace.findFirst();
    if (!workspace) throw new Error('No workspace found');

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
          crawlConfig: {},
        },
      });
    } else {
      await prisma.chunk.deleteMany({ where: { siteId: site.id } });
      await prisma.page.deleteMany({ where: { siteId: site.id } });
    }
    console.log(`✅ Site ready: ${site.siteKey}`);

    // Widget config
    const widgetConfig = await prisma.widgetConfig.findUnique({ where: { siteId: site.id } });
    if (!widgetConfig) {
      await prisma.widgetConfig.create({
        data: {
          workspaceId: workspace.id,
          siteId: site.id,
          theme: {
            primaryColor: '#0D9488', // Teal to match PharmaCare
            backgroundColor: '#FFFFFF',
            textColor: '#1F2937',
            borderRadius: 12,
            position: 'bottom-right',
            offsetX: 20,
            offsetY: 20,
          },
          greeting: 'Hi! I can help you with PharmaCare POS. Ask me anything!',
          placeholder: 'Ask about inventory, sales, reports...',
          brandName: 'PharmaCare',
          allowedDomains: ['localhost', '127.0.0.1', 'ezypharma.vercel.app'],
          rateLimit: { rpm: 60, burst: 10 },
        },
      });
    }

    // Login
    const loggedIn = await login(page);
    console.log(loggedIn ? '✅ Logged in successfully!' : '⚠️ May not be logged in');

    await new Promise((r) => setTimeout(r, 2000));

    // Crawl pages
    let totalChunks = 0;
    const seenContent = new Set<string>();

    for (let i = 0; i < PAGES_TO_CRAWL.length; i++) {
      const path = PAGES_TO_CRAWL[i];
      const url = `${BASE_URL}${path}`;
      console.log(`\n📄 [${i + 1}/${PAGES_TO_CRAWL.length}] ${path}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 2000));

        // Skip login redirects
        if (page.url().includes('login')) {
          console.log('   ⏭️ Requires login');
          continue;
        }

        const result = await extractContent(page);
        const contentKey = result.content.substring(0, 100);

        if (result.content.length < 100 || seenContent.has(contentKey)) {
          console.log('   ⏭️ Skipped (duplicate/insufficient)');
          continue;
        }
        seenContent.add(contentKey);

        console.log(`   📝 ${result.title} (${result.content.length} chars)`);

        const dbPage = await prisma.page.create({
          data: {
            workspaceId: workspace.id,
            siteId: site.id,
            url,
            title: result.title,
            contentHash: `${Date.now()}`,
            status: PageStatus.FETCHED,
          },
        });

        const chunks = chunkText(result.content, 400);
        console.log(`   🔪 ${chunks.length} chunks`);

        for (let j = 0; j < chunks.length; j++) {
          try {
            const response = await openai.embeddings.create({
              model: 'text-embedding-3-small',
              input: chunks[j],
            });

            const embeddingStr = `[${response.data[0].embedding.join(',')}]`;

            await prisma.$executeRaw`
              INSERT INTO chunks (id, "workspaceId", "siteId", "pageId", url, title, content, "tokenCount", "headingPath", embedding, "createdAt")
              VALUES (gen_random_uuid(), ${workspace.id}, ${site.id}, ${dbPage.id}, ${url}, ${result.title}, ${chunks[j]}, ${response.usage?.total_tokens || 0}, ${result.headings[0] || result.title}, ${embeddingStr}::vector, NOW())
            `;

            totalChunks++;
            console.log(`   ✅ Chunk ${j + 1}/${chunks.length}`);
          } catch (e) {
            console.log(`   ❌ Chunk ${j + 1} failed`);
          }
          await new Promise((r) => setTimeout(r, 200));
        }

        await prisma.page.update({ where: { id: dbPage.id }, data: { status: PageStatus.EMBEDDED } });
      } catch (e) {
        console.log(`   ❌ Error: ${(e as Error).message}`);
      }
    }

    await prisma.site.update({ where: { id: site.id }, data: { status: SiteStatus.READY } });

    console.log(`\n${'='.repeat(50)}`);
    console.log(`🎉 Done! Chunks: ${totalChunks}`);
    console.log(`\n💡 Test: http://localhost:5173?siteKey=${SITE_KEY}`);

  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch(console.error);

