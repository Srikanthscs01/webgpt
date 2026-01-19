import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('\n📊 VECTOR DATABASE CONTENTS\n');
  console.log('='.repeat(80));

  // Get all chunks with their embeddings
  const chunks = await prisma.$queryRaw<Array<{
    id: string;
    title: string;
    url: string;
    content: string;
    tokenCount: number;
    headingPath: string | null;
    hasEmbedding: boolean;
    embeddingDimensions: number | null;
  }>>`
    SELECT 
      id,
      title,
      url,
      content,
      "tokenCount",
      "headingPath",
      (embedding IS NOT NULL) as "hasEmbedding",
      CASE WHEN embedding IS NOT NULL THEN vector_dims(embedding) ELSE NULL END as "embeddingDimensions"
    FROM chunks
    ORDER BY "createdAt" DESC
  `;

  console.log(`\n📦 Total Chunks: ${chunks.length}\n`);
  console.log('-'.repeat(80));

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`\n[${i + 1}] ${chunk.title || 'Untitled'}`);
    console.log(`    URL: ${chunk.url}`);
    console.log(`    Tokens: ${chunk.tokenCount}`);
    console.log(`    Heading: ${chunk.headingPath || 'N/A'}`);
    console.log(`    Embedding: ${chunk.hasEmbedding ? `✅ Yes (${chunk.embeddingDimensions} dimensions)` : '❌ No'}`);
    console.log(`    Content: "${chunk.content.substring(0, 100)}..."`);
    console.log('-'.repeat(80));
  }

  // Get site info
  const sites = await prisma.site.findMany({
    select: {
      id: true,
      name: true,
      siteKey: true,
      status: true,
      _count: {
        select: {
          pages: true,
          chunks: true,
        },
      },
    },
  });

  console.log('\n📁 SITES SUMMARY\n');
  for (const site of sites) {
    console.log(`   ${site.name} (${site.siteKey})`);
    console.log(`   - Status: ${site.status}`);
    console.log(`   - Pages: ${site._count.pages}`);
    console.log(`   - Chunks: ${site._count.chunks}`);
    console.log('');
  }

  // Show embedding statistics
  const stats = await prisma.$queryRaw<Array<{
    total: bigint;
    withEmbedding: bigint;
    avgTokens: number;
  }>>`
    SELECT 
      COUNT(*) as total,
      COUNT(embedding) as "withEmbedding",
      AVG("tokenCount")::float as "avgTokens"
    FROM chunks
  `;

  console.log('\n📈 EMBEDDING STATISTICS\n');
  console.log(`   Total Chunks: ${stats[0].total}`);
  console.log(`   With Embeddings: ${stats[0].withEmbedding}`);
  console.log(`   Avg Tokens per Chunk: ${Math.round(stats[0].avgTokens)}`);
  console.log(`   Embedding Model: text-embedding-3-small`);
  console.log(`   Vector Dimensions: 1536`);
  console.log('');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

