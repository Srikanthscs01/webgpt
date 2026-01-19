import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Core modules
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { LoggerModule } from './common/services/logger.module';
import { OpenAIModule } from './common/openai/openai.module';
import { QueueModule } from './common/queue/queue.module';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { UsersModule } from './modules/users/users.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { SitesModule } from './modules/sites/sites.module';
import { CrawlModule } from './modules/crawl/crawl.module';
import { ContentModule } from './modules/content/content.module';
import { ChatModule } from './modules/chat/chat.module';
import { WidgetModule } from './modules/widget/widget.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { HealthModule } from './modules/health/health.module';

// Guards
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 50,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core modules
    LoggerModule,
    PrismaModule,
    RedisModule,
    OpenAIModule,
    QueueModule,

    // Feature modules
    AuthModule,
    WorkspacesModule,
    UsersModule,
    ApiKeysModule,
    SitesModule,
    CrawlModule,
    ContentModule,
    ChatModule,
    WidgetModule,
    AnalyticsModule,
    AuditModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}



