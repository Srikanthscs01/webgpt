import { PrismaClient, SiteStatus, PageStatus } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import puppeteer, { Browser, Page } from 'puppeteer';

dotenv.config();

const prisma = new PrismaClient();

const BASE_URL = 'https://ezypharma.vercel.app';
const SITE_NAME = 'EzyPharma POS';
const SITE_KEY = 'ezypharma-pos';

// Login credentials
const LOGIN_EMAIL = 'sri@gmail.com';
const LOGIN_PASSWORD = '123456';

// Pages to crawl after login
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
  '/transactions',
  '/receipts',
  '/invoices',
  '/users',
  '/help',
];

async function login(page: Page): Promise<boolean> {
  console.log('\n🔐 Logging in...');
  
  try {
    // Try common login URLs
    const loginUrls = [
      `${BASE_URL}/login`,
      `${BASE_URL}/signin`,
      `${BASE_URL}/auth/login`,
      `${BASE_URL}/auth/signin`,
      `${BASE_URL}/`,
    ];

    let loggedIn = false;

    for (const loginUrl of loginUrls) {
      console.log(`   Trying: ${loginUrl}`);
      await page.goto(loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2000));

      // Check if we're already logged in
      const currentUrl = page.url();
      if (currentUrl.includes('dashboard') || currentUrl.includes('pos')) {
        console.log('   ✅ Already logged in!');
        return true;
      }

      // Try to find login form
      const emailInput = await page.$('input[type="email"], input[name="email"], input[placeholder*="email" i], input[id*="email" i]');
      const passwordInput = await page.$('input[type="password"], input[name="password"]');

      if (emailInput && passwordInput) {
        console.log('   📝 Found login form, entering credentials...');
        
        // Clear and type email
        await emailInput.click({ clickCount: 3 });
        await emailInput.type(LOGIN_EMAIL, { delay: 50 });

        // Clear and type password
        await passwordInput.click({ clickCount: 3 });
        await passwordInput.type(LOGIN_PASSWORD, { delay: 50 });

        // Find and click submit button
        const submitButton = await page.$(
          'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("Submit")'
        );

        if (submitButton) {
          await submitButton.click();
        } else {
          // Try pressing Enter
          await page.keyboard.press('Enter');
        }

        // Wait for navigation
        await new Promise((r) => setTimeout(r, 3000));
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});

        // Check if login was successful
        const newUrl = page.url();
        const pageContent = await page.content();
        
        if (!newUrl.includes('login') && !newUrl.includes('signin') && !pageContent.includes('Invalid') && !pageContent.includes('error')) {
          console.log('   ✅ Login successful!');
          loggedIn = true;
          break;
        } else {
          console.log('   ⚠️ Login may have failed, trying next URL...');
        }
      }
    }

    return loggedIn;
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

    // Get main content
    const clone = document.body.cloneNode(true) as Element;
    clone.querySelectorAll('script, style, noscript, nav, footer, iframe, svg, img').forEach((el) => el.remove());

    // Also try to get specific content areas
    const contentAreas: string[] = [];
    
    // Get table data
    document.querySelectorAll('table').forEach((table) => {
      const headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent?.trim()).filter(Boolean);
      const rows = Array.from(table.querySelectorAll('tbody tr')).slice(0, 5).map((row) => {
        return Array.from(row.querySelectorAll('td')).map((td) => td.textContent?.trim()).filter(Boolean).join(', ');
      });
      if (headers.length > 0) {
        contentAreas.push(`Table: ${headers.join(', ')}. Sample data: ${rows.join('; ')}`);
      }
    });

    // Get card/panel content
    document.querySelectorAll('.card, .panel, [class*="card"], [class*="panel"]').forEach((card) => {
      const cardTitle = card.querySelector('h2, h3, h4, .title, .header')?.textContent?.trim();
      const cardContent = card.textContent?.trim().substring(0, 300);
      if (cardTitle && cardContent) {
        contentAreas.push(`${cardTitle}: ${cardContent}`);
      }
    });

    // Get button/action labels (features)
    const actions: string[] = [];
    document.querySelectorAll('button, a[class*="btn"], [role="button"]').forEach((btn) => {
      const label = btn.textContent?.trim();
      if (label && label.length < 50 && label.length > 2) {
        actions.push(label);
      }
    });
    if (actions.length > 0) {
      contentAreas.push(`Available actions: ${[...new Set(actions)].slice(0, 20).join(', ')}`);
    }

    // Get form labels (features)
    const formLabels: string[] = [];
    document.querySelectorAll('label, .form-label, [class*="label"]').forEach((label) => {
      const text = label.textContent?.trim();
      if (text && text.length < 100 && text.length > 2) {
        formLabels.push(text);
      }
    });
    if (formLabels.length > 0) {
      contentAreas.push(`Form fields: ${[...new Set(formLabels)].slice(0, 20).join(', ')}`);
    }

    // Get sidebar/menu items
    const menuItems: string[] = [];
    document.querySelectorAll('nav a, aside a, [class*="sidebar"] a, [class*="menu"] a').forEach((item) => {
      const text = item.textContent?.trim();
      if (text && text.length < 50 && text.length > 2) {
        menuItems.push(text);
      }
    });
    if (menuItems.length > 0) {
      contentAreas.push(`Navigation menu: ${[...new Set(menuItems)].join(', ')}`);
    }

    let content = clone.textContent || '';
    content = content.replace(/\s+/g, ' ').trim();

    // Append extracted content areas
    if (contentAreas.length > 0) {
      content += ' ' + contentAreas.join(' ');
    }

    return { title: title.trim(), content, headings };
  });
}

function chunkText(text: string, maxTokens: number = 500): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
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

async function main() {
  console.log(`\n🚀 Crawling ${SITE_NAME} (Authenticated)\n`);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  console.log('🌐 Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

  try {
    // Get workspace
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
      await prisma.chunk.deleteMany({ where: { siteId: site.id } });
      await prisma.page.deleteMany({ where: { siteId: site.id } });
      console.log(`✅ Using existing site (cleared old content)`);
    }

    // Ensure widget config
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
          placeholder: 'How can I help you?',
          brandName: 'EzyPharma',
          allowedDomains: ['localhost', '127.0.0.1', 'ezypharma.vercel.app'],
          rateLimit: { rpm: 60, burst: 10 },
        },
      });
    }

    // Login
    const loggedIn = await login(page);
    if (!loggedIn) {
      console.log('\n⚠️ Could not log in. Taking screenshot for debugging...');
      await page.screenshot({ path: 'login-debug.png', fullPage: true });
      console.log('   Screenshot saved to: login-debug.png');
    }

    // Wait a bit after login
    await new Promise((r) => setTimeout(r, 2000));

    // Crawl pages
    let totalChunks = 0;
    let pagesProcessed = 0;
    const crawledContent: Map<string, boolean> = new Map();

    for (const path of PAGES_TO_CRAWL) {
      const url = `${BASE_URL}${path}`;
      console.log(`\n📄 [${++pagesProcessed}/${PAGES_TO_CRAWL.length}] ${url}`);

      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise((r) => setTimeout(r, 2000));

        // Check if redirected to login
        if (page.url().includes('login') || page.url().includes('signin')) {
          console.log('   ⏭️ Requires login (skipped)');
          continue;
        }

        const result = await extractContent(page);

        // Skip if too little content or duplicate
        const contentHash = result.content.substring(0, 200);
        if (result.content.length < 100 || crawledContent.has(contentHash)) {
          console.log('   ⏭️ Skipped (insufficient or duplicate content)');
          continue;
        }
        crawledContent.set(contentHash, true);

        console.log(`   📝 Title: ${result.title}`);
        console.log(`   📊 Content: ${result.content.length} chars`);
        console.log(`   📑 Headings: ${result.headings.slice(0, 3).join(', ')}`);

        // Create page
        const dbPage = await prisma.page.create({
          data: {
            workspaceId: workspace.id,
            siteId: site.id,
            url,
            title: result.title,
            contentHash: `hash-${Date.now()}`,
            status: PageStatus.FETCHED,
          },
        });

        // Chunk and embed
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
                gen_random_uuid(), ${workspace.id}, ${site.id}, ${dbPage.id},
                ${url}, ${result.title}, ${chunkContent}, ${tokenCount},
                ${headingPath}, ${embeddingStr}::vector, NOW()
              )
            `;

            totalChunks++;
            console.log(`   ✅ Chunk ${i + 1}/${chunks.length} embedded`);
          } catch (err) {
            console.error(`   ❌ Chunk ${i + 1} failed`);
          }

          await new Promise((r) => setTimeout(r, 300));
        }

        await prisma.page.update({
          where: { id: dbPage.id },
          data: { status: PageStatus.EMBEDDED },
        });

      } catch (error) {
        console.log(`   ❌ Error: ${(error as Error).message}`);
      }

      await new Promise((r) => setTimeout(r, 1000));
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

