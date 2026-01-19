import { PrismaClient, UserRole, Plan } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const ownerEmail = process.env.SEED_OWNER_EMAIL || 'admin@webgpt.dev';
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'changeme123!';
  const workspaceName = process.env.SEED_WORKSPACE_NAME || 'Default Workspace';

  // Check if owner already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: ownerEmail },
  });

  if (existingUser) {
    console.log(`✅ User ${ownerEmail} already exists. Skipping seed.`);
    return;
  }

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: workspaceName,
      plan: Plan.FREE,
    },
  });

  console.log(`✅ Created workspace: ${workspace.name} (${workspace.id})`);

  // Hash password
  const passwordHash = await bcrypt.hash(ownerPassword, 12);

  // Create owner user
  const owner = await prisma.user.create({
    data: {
      workspaceId: workspace.id,
      email: ownerEmail,
      name: 'Admin',
      passwordHash,
      role: UserRole.OWNER,
    },
  });

  console.log(`✅ Created owner user: ${owner.email} (${owner.id})`);

  // Create audit log for user creation
  await prisma.auditLog.create({
    data: {
      workspaceId: workspace.id,
      actorUserId: owner.id,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: owner.id,
      meta: {
        source: 'seed',
        role: UserRole.OWNER,
      },
    },
  });

  console.log('✅ Created initial audit log');

  console.log('\n🎉 Database seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log(`   Email: ${ownerEmail}`);
  console.log(`   Password: ${ownerPassword}`);
  console.log('\n⚠️  Please change the default password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



