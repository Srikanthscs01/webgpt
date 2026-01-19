import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OpenAIService } from '../../common/openai/openai.service';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import Redis from 'ioredis';
import { HealthStatus, ComponentHealth } from '@webgpt/shared';

const startTime = Date.now();

@Injectable()
export class HealthService {
  constructor(
    private prisma: PrismaService,
    private openai: OpenAIService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const [database, redis, openai] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkOpenAI(),
    ]);

    const allHealthy = database.status === 'healthy' && redis.status === 'healthy';

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
      checks: {
        database,
        redis,
        openai,
      },
    };
  }

  private async checkDatabase(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  private async checkRedis(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  private async checkOpenAI(): Promise<ComponentHealth> {
    const start = Date.now();
    try {
      const available = await this.openai.testConnection();
      return {
        status: available ? 'healthy' : 'unhealthy',
        latencyMs: Date.now() - start,
        error: available ? undefined : 'OpenAI connection failed',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: (error as Error).message,
      };
    }
  }

  getMetrics(): string {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    
    return `
# HELP webgpt_uptime_seconds The uptime of the WebGPT API server
# TYPE webgpt_uptime_seconds gauge
webgpt_uptime_seconds ${uptime}

# HELP webgpt_info Information about the WebGPT API server
# TYPE webgpt_info gauge
webgpt_info{version="${process.env.npm_package_version || '1.0.0'}"} 1

# HELP process_resident_memory_bytes Resident memory size in bytes
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes ${process.memoryUsage().rss}

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes ${process.memoryUsage().heapTotal}

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes ${process.memoryUsage().heapUsed}
    `.trim();
  }
}



