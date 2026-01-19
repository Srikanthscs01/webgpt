import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating widget allowed domains...\n');

  // Update EzyPharma widget config
  const site = await prisma.site.findUnique({
    where: { siteKey: 'ezypharma-pos' },
    include: { widgetConfig: true },
  });

  if (!site || !site.widgetConfig) {
    console.error('❌ Site or widget config not found');
    return;
  }

  await prisma.widgetConfig.update({
    where: { id: site.widgetConfig.id },
    data: {
      allowedDomains: [
        'localhost',
        '127.0.0.1',
        'ezypharma.vercel.app',
        'loca.lt',  // Allow localtunnel
      ],
    },
  });

  console.log('✅ Updated allowed domains:');
  console.log('   - localhost');
  console.log('   - 127.0.0.1');
  console.log('   - ezypharma.vercel.app');
  console.log('   - loca.lt');
  console.log('\n🎉 Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

