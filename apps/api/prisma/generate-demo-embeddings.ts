import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Generating embeddings for demo content...');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  // Get the demo site
  const site = await prisma.site.findFirst({
    where: { siteKey: 'test-site-key' },
  });

  if (!site) {
    console.error('❌ Demo site not found. Run seed-demo-site.ts first.');
    process.exit(1);
  }

  // Get all chunks for the demo site
  const chunks = await prisma.chunk.findMany({
    where: {
      siteId: site.id,
    },
  });

  console.log(`📦 Found ${chunks.length} chunks to embed`);

  for (const chunk of chunks) {
    try {
      console.log(`   Embedding: "${chunk.title}"`);
      
      // Generate embedding
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk.content,
        encoding_format: 'float',
      });

      const embedding = response.data[0].embedding;

      // Store embedding using raw SQL
      const embeddingStr = `[${embedding.join(',').substring(0, 100000)}]`; // Truncate for safety
      
      await prisma.$executeRaw`
        UPDATE chunks
        SET embedding = ${embeddingStr}::vector
        WHERE id = ${chunk.id}
      `;

      console.log(`   ✅ Embedded chunk: ${chunk.id}`);
    } catch (error) {
      console.error(`   ❌ Failed to embed chunk ${chunk.id}:`, error);
    }
  }

  // Update page status
  const page = await prisma.page.findFirst({
    where: { siteId: site.id },
  });

  if (page) {
    await prisma.page.update({
      where: { id: page.id },
      data: { status: 'EMBEDDED' },
    });
  }

  console.log('\n🎉 Demo embeddings generated successfully!');
  console.log('   The chat now has full vector search capabilities.');
}

main()
  .catch((e) => {
    console.error('❌ Failed to generate embeddings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

