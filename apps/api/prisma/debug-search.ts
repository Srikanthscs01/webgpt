import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const SITE_KEY = 'ezypharma-pos';
  const QUERY = 'How do I manage inventory?';

  console.log(`\n🔍 Debug Search Test\n`);
  console.log(`Site Key: ${SITE_KEY}`);
  console.log(`Query: "${QUERY}"`);
  console.log('='.repeat(60));

  // 1. Get site
  const site = await prisma.site.findUnique({
    where: { siteKey: SITE_KEY },
  });

  if (!site) {
    console.error('❌ Site not found');
    return;
  }

  console.log(`\n✅ Site found: ${site.name} (${site.id})`);

  // 2. Check chunks for this site
  const chunks = await prisma.chunk.findMany({
    where: { siteId: site.id },
    take: 5,
  });

  console.log(`\n📦 Chunks in site: ${chunks.length}`);
  
  if (chunks.length === 0) {
    console.log('❌ NO CHUNKS FOUND FOR THIS SITE!');
    
    // List all chunks in DB
    const allChunks = await prisma.chunk.findMany({ take: 5 });
    console.log(`\n📊 All chunks in DB: ${allChunks.length}`);
    for (const c of allChunks) {
      console.log(`   - ${c.title} (siteId: ${c.siteId})`);
    }
    return;
  }

  // 3. Generate query embedding
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  
  console.log('\n🧠 Generating query embedding...');
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: QUERY,
  });
  const queryEmbedding = embeddingResponse.data[0].embedding;
  console.log(`   Embedding dimensions: ${queryEmbedding.length}`);

  // 4. Test vector search
  console.log('\n🔎 Testing Vector Search...');
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  
  try {
    const vectorResults = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      url: string;
      score: number;
    }>>`
      SELECT
        id,
        title,
        url,
        1 - (embedding <=> ${embeddingStr}::vector) as score
      FROM chunks
      WHERE "siteId" = ${site.id}
        AND embedding IS NOT NULL
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT 5
    `;

    console.log(`   Found ${vectorResults.length} results:`);
    for (const r of vectorResults) {
      console.log(`   - ${r.title}: score=${r.score.toFixed(4)}`);
    }
  } catch (e) {
    console.error('   ❌ Vector search error:', (e as Error).message);
  }

  // 5. Test FTS search
  console.log('\n🔎 Testing FTS Search...');
  try {
    const ftsResults = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      score: number;
    }>>`
      SELECT
        id,
        title,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', ${QUERY})) as score
      FROM chunks
      WHERE "siteId" = ${site.id}
        AND to_tsvector('english', content) @@ plainto_tsquery('english', ${QUERY})
      ORDER BY score DESC
      LIMIT 5
    `;

    console.log(`   Found ${ftsResults.length} results:`);
    for (const r of ftsResults) {
      console.log(`   - ${r.title}: score=${r.score.toFixed(4)}`);
    }
  } catch (e) {
    console.error('   ❌ FTS search error:', (e as Error).message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🔍 Debug complete');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

