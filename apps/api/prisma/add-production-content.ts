import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

const PRODUCTION_CONTENT = [
  {
    url: 'https://demo.webgpt.dev/pricing',
    title: 'Pricing Plans',
    content: 'WebGPT offers flexible pricing for businesses of all sizes. Our Starter plan is $29/month and includes 1,000 messages per month, 1 site, and basic analytics. The Professional plan at $99/month includes 10,000 messages, 5 sites, advanced analytics, and priority support. Enterprise customers get unlimited messages, unlimited sites, dedicated support, custom integration, and SLA guarantees. All plans include unlimited website pages crawled and free updates.',
    headingPath: 'Pricing > Plans Overview',
  },
  {
    url: 'https://demo.webgpt.dev/integration',
    title: 'Integration Guide',
    content: 'Integrating WebGPT into your website is simple. First, create a site in the admin portal and complete the initial crawl. Then, copy the widget embed code from the settings page. Paste the code snippet before the closing </body> tag of your HTML. The widget will automatically appear on all pages. You can customize the appearance, position, colors, and behavior through the admin portal. The widget supports single-page applications, works with all modern frameworks including React, Vue, Angular, and plain HTML.',
    headingPath: 'Integration > Getting Started',
  },
  {
    url: 'https://demo.webgpt.dev/security',
    title: 'Security & Privacy',
    content: 'WebGPT takes security seriously. All data is encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. We implement multi-tenant data isolation to ensure your content never leaks between workspaces. API keys are hashed using SHA-256 before storage. We provide audit logs for all administrative actions. Our infrastructure is SOC 2 compliant and undergoes regular security audits. User conversations are retained for 90 days by default and can be configured per workspace. We never train AI models on your private data.',
    headingPath: 'Security > Overview',
  },
  {
    url: 'https://demo.webgpt.dev/customization',
    title: 'Widget Customization',
    content: 'Customize your WebGPT widget to match your brand. Change the primary color to match your brand palette. Adjust the border radius for sharp or rounded corners. Position the widget in any corner of the screen with custom offsets. Set a custom greeting message that appears when users open the chat. Customize the placeholder text in the input field. Add your brand name to the header. Configure allowed domains for security. Set rate limits to control usage. All changes are applied instantly without code changes.',
    headingPath: 'Customization > Widget Settings',
  },
  {
    url: 'https://demo.webgpt.dev/analytics',
    title: 'Analytics Dashboard',
    content: 'Track your chatbot performance with detailed analytics. View total conversations, messages, and unique visitors over time. See the most frequently asked questions to identify content gaps. Monitor token usage and estimated costs for OpenAI API calls. Track user feedback and satisfaction ratings. Filter analytics by date range: 7 days, 30 days, 90 days, or 1 year. Export data for deeper analysis. View charts showing conversation trends over time. Identify peak usage hours and optimize accordingly.',
    headingPath: 'Analytics > Dashboard Features',
  },
  {
    url: 'https://demo.webgpt.dev/api-documentation',
    title: 'API Reference',
    content: 'WebGPT provides a comprehensive REST API for advanced integration. Authenticate using API keys generated in the admin portal. Send messages programmatically using POST /api/v1/widget/chat endpoint. Include siteKey, message, and optional conversationId in the request body. Receive JSON responses with the assistant message, citations, and metadata. Support for server-sent events (SSE) for streaming responses. Rate limiting applies at 60 requests per minute with burst allowance of 10. All endpoints support CORS for browser-based applications.',
    headingPath: 'API > REST Reference',
  },
  {
    url: 'https://demo.webgpt.dev/crawling',
    title: 'Website Crawling',
    content: 'WebGPT automatically crawls your website to extract content. The crawler starts from your base URL and discovers pages through sitemaps and internal links. Configure maximum pages and depth limits to control crawl scope. Set include and exclude URL patterns using wildcards. Respect robots.txt directives automatically. Adjust concurrency and delay between requests to avoid overwhelming your server. The crawler handles JavaScript-rendered content. Failed pages are retried automatically. Re-crawl periodically to keep content up-to-date. The system detects content changes and only updates modified pages.',
    headingPath: 'Crawling > How It Works',
  },
  {
    url: 'https://demo.webgpt.dev/ai-models',
    title: 'AI Models & Embeddings',
    content: 'WebGPT uses state-of-the-art OpenAI models. Text embeddings are generated using text-embedding-3-small (1536 dimensions) for efficient vector search. Chat responses use GPT-4o-mini for fast, cost-effective answers or GPT-4o for more complex queries. Embeddings are stored in PostgreSQL with pgvector extension for similarity search. Hybrid retrieval combines vector similarity and full-text search for best results. Context is limited to 4,000 tokens to stay within model limits. The system automatically handles token counting and truncation.',
    headingPath: 'AI > Models Used',
  },
  {
    url: 'https://demo.webgpt.dev/troubleshooting',
    title: 'Troubleshooting Guide',
    content: 'Common issues and solutions: If the widget does not appear, check that the embed code is placed before </body> and verify the siteKey is correct. If messages fail to send, check CORS settings and ensure your domain is in the allowed list. For slow responses, check OpenAI API status and verify your API key has sufficient quota. If search results are irrelevant, trigger a re-crawl to update content. For authentication errors with the admin portal, clear browser cache and log in again. Check the health endpoint at /api/v1/health for system status.',
    headingPath: 'Support > Troubleshooting',
  },
  {
    url: 'https://demo.webgpt.dev/multi-language',
    title: 'Multi-Language Support',
    content: 'WebGPT supports multiple languages for global audiences. The AI automatically detects the language of user questions and responds in the same language. Content is indexed in the original language without translation. Supported languages include English, Spanish, French, German, Italian, Portuguese, Dutch, Russian, Chinese, Japanese, Korean, and more. Full-text search uses language-specific analyzers for better matching. Widget interface text can be customized for any language. Right-to-left (RTL) languages are fully supported.',
    headingPath: 'Features > Multi-Language',
  },
];

async function main() {
  console.log('🚀 Adding production-grade content...');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  const site = await prisma.site.findFirst({
    where: { siteKey: 'test-site-key' },
  });

  if (!site) {
    console.error('❌ Demo site not found');
    process.exit(1);
  }

  console.log(`📦 Adding ${PRODUCTION_CONTENT.length} new content chunks...`);

  for (const item of PRODUCTION_CONTENT) {
    try {
      // Check if chunk already exists
      const existing = await prisma.chunk.findFirst({
        where: {
          siteId: site.id,
          url: item.url,
        },
      });

      if (existing) {
        console.log(`   ⏭️  Skipped (exists): "${item.title}"`);
        continue;
      }

      console.log(`   📝 Adding: "${item.title}"`);

      // Generate embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: item.content,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;
      const embeddingStr = `[${embedding.join(',')}]`;
      const tokenCount = response.usage?.total_tokens || 0;

      // Create unique page ID for this chunk
      const pageId = `page-${Date.now()}-${Math.random().toString(36).substring(7)}`;

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
          ${site.workspaceId},
          ${site.id},
          ${pageId},
          ${item.url},
          ${item.title},
          ${item.content},
          ${tokenCount},
          ${item.headingPath},
          ${embeddingStr}::vector,
          NOW()
        )
      `;

      console.log(`   ✅ Added with embedding: "${item.title}"`);
      
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Failed to add "${item.title}":`, error);
    }
  }

  console.log('\n🎉 Production content added successfully!');
  console.log('   Your chatbot now has comprehensive knowledge.');
  console.log('\n💡 Try asking:');
  console.log('   - "What are your pricing plans?"');
  console.log('   - "How do I integrate WebGPT?"');
  console.log('   - "Do you support multiple languages?"');
  console.log('   - "How does crawling work?"');
  console.log('   - "What AI models do you use?"');
}

main()
  .catch((e) => {
    console.error('❌ Failed to add content:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

