import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating demo site...');

  // Get the default workspace
  const workspace = await prisma.workspace.findFirst();
  
  if (!workspace) {
    console.error('❌ No workspace found. Please run the main seed first.');
    process.exit(1);
  }

  // Check if demo site already exists
  const existingSite = await prisma.site.findFirst({
    where: { siteKey: 'test-site-key' },
  });

  if (existingSite) {
    console.log('✅ Demo site already exists');
    return;
  }

  // Create demo site
  const site = await prisma.site.create({
    data: {
      workspaceId: workspace.id,
      name: 'Demo Site',
      domain: 'demo.webgpt.dev',
      baseUrl: 'https://demo.webgpt.dev',
      siteKey: 'test-site-key',
      status: 'READY',
      crawlConfig: {
        maxPages: 100,
        maxDepth: 3,
        includePatterns: [],
        excludePatterns: [],
        respectRobots: true,
        sitemapOnly: false,
        concurrency: 5,
        delayMs: 100,
      },
    },
  });

  console.log(`✅ Created demo site: ${site.name} (${site.id})`);
  console.log(`   Site Key: ${site.siteKey}`);

  // Create widget config for the demo site
  await prisma.widgetConfig.create({
    data: {
      workspaceId: workspace.id,
      siteId: site.id,
      theme: {
        primaryColor: '#3B82F6',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        borderRadius: 12,
        position: 'bottom-right',
        offsetX: 20,
        offsetY: 20,
      },
      greeting: 'Hi! How can I help you today?',
      placeholder: 'Ask me anything...',
      brandName: 'WebGPT Demo',
      allowedDomains: ['localhost', '127.0.0.1'],
      rateLimit: {
        rpm: 60,
        burst: 10,
      },
    },
  });

  console.log('✅ Created widget configuration');

  // Create some demo content so the chat can respond
  const page = await prisma.page.create({
    data: {
      workspaceId: workspace.id,
      siteId: site.id,
      url: 'https://demo.webgpt.dev/getting-started',
      title: 'Getting Started with WebGPT',
      contentHash: 'demo-hash-1',
      status: 'EMBEDDED',
      httpStatus: 200,
      mimeType: 'text/html',
      lastCrawledAt: new Date(),
    },
  });

  // Create demo chunks with sample content
  const demoContent = [
    {
      title: 'Getting Started',
      content: 'WebGPT is a powerful website-trained chatbot using RAG (Retrieval Augmented Generation). It allows you to create intelligent chatbots that can answer questions based on your website content. To get started, simply add your website URL and start crawling.',
    },
    {
      title: 'Features',
      content: 'WebGPT offers multi-tenancy support, vector search with pgvector, hybrid retrieval combining vector and full-text search, real-time chat with citations, customizable widget, and comprehensive analytics.',
    },
    {
      title: 'How It Works',
      content: 'WebGPT crawls your website, extracts content, chunks it into manageable pieces, generates embeddings using OpenAI, stores them in PostgreSQL with pgvector, and then uses hybrid search to find relevant context when users ask questions.',
    },
  ];

  for (const demo of demoContent) {
    await prisma.chunk.create({
      data: {
        workspaceId: workspace.id,
        siteId: site.id,
        pageId: page.id,
        url: page.url,
        title: demo.title,
        content: demo.content,
        tokenCount: Math.ceil(demo.content.length / 4),
        headingPath: demo.title,
      },
    });
  }

  console.log('✅ Created demo content chunks');

  console.log('\n🎉 Demo site setup completed successfully!');
  console.log('\n📝 You can now test the widget at http://localhost:5173');
  console.log('   The widget will connect to the demo site with pre-loaded content.');
}

main()
  .catch((e) => {
    console.error('❌ Demo site creation failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

