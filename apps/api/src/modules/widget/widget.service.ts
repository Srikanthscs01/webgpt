import { Injectable, NotFoundException, ForbiddenException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WidgetConfig, Site } from '@prisma/client';
import { WidgetPublicConfig, WidgetTheme, WidgetRateLimit } from '@webgpt/shared';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

@Injectable()
export class WidgetService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async getPublicConfig(siteKey: string): Promise<WidgetPublicConfig> {
    const site = await this.prisma.site.findUnique({
      where: { siteKey },
      include: { widgetConfig: true },
    });

    if (!site || !site.widgetConfig) {
      throw new NotFoundException('Site not found');
    }

    const config = site.widgetConfig;

    return {
      siteKey: site.siteKey,
      theme: config.theme as unknown as WidgetTheme,
      greeting: config.greeting,
      placeholder: config.placeholder,
      brandName: config.brandName,
    };
  }

  async getConfig(siteId: string, workspaceId: string): Promise<WidgetConfig> {
    const config = await this.prisma.widgetConfig.findFirst({
      where: { siteId, workspaceId },
    });

    if (!config) {
      throw new NotFoundException('Widget config not found');
    }

    return config;
  }

  async updateConfig(
    siteId: string,
    workspaceId: string,
    data: {
      theme?: Partial<WidgetTheme>;
      greeting?: string;
      placeholder?: string;
      brandName?: string | null;
      allowedDomains?: string[];
      rateLimit?: Partial<WidgetRateLimit>;
    },
  ): Promise<WidgetConfig> {
    const config = await this.prisma.widgetConfig.findFirst({
      where: { siteId, workspaceId },
    });

    if (!config) {
      throw new NotFoundException('Widget config not found');
    }

    const updateData: Record<string, unknown> = {};

    if (data.theme) {
      const currentTheme = config.theme as unknown as WidgetTheme;
      updateData.theme = { ...currentTheme, ...data.theme };
    }

    if (data.greeting !== undefined) updateData.greeting = data.greeting;
    if (data.placeholder !== undefined) updateData.placeholder = data.placeholder;
    if (data.brandName !== undefined) updateData.brandName = data.brandName;
    if (data.allowedDomains !== undefined) updateData.allowedDomains = data.allowedDomains;

    if (data.rateLimit) {
      const currentRateLimit = config.rateLimit as unknown as WidgetRateLimit;
      updateData.rateLimit = { ...currentRateLimit, ...data.rateLimit };
    }

    return this.prisma.widgetConfig.update({
      where: { id: config.id },
      data: updateData,
    });
  }

  async validateOrigin(siteKey: string, origin: string | undefined): Promise<Site> {
    const site = await this.prisma.site.findUnique({
      where: { siteKey },
      include: { widgetConfig: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const validateOrigin = this.configService.get<boolean>('CORS_WIDGET_VALIDATE_ORIGIN', true);

    if (validateOrigin && site.widgetConfig?.allowedDomains?.length) {
      const allowedDomains = site.widgetConfig.allowedDomains;

      if (origin) {
        try {
          const originUrl = new URL(origin);
          const isAllowed = allowedDomains.some(
            (domain) =>
              originUrl.hostname === domain ||
              originUrl.hostname.endsWith(`.${domain}`),
          );

          if (!isAllowed) {
            throw new ForbiddenException('Origin not allowed');
          }
        } catch (e) {
          if (e instanceof ForbiddenException) throw e;
          // Invalid origin format, allow if not strict
        }
      }
    }

    return site;
  }

  async checkRateLimit(siteKey: string, visitorId: string): Promise<boolean> {
    const site = await this.prisma.site.findUnique({
      where: { siteKey },
      include: { widgetConfig: true },
    });

    if (!site?.widgetConfig) {
      return true;
    }

    const rateLimit = site.widgetConfig.rateLimit as unknown as WidgetRateLimit;
    const key = `ratelimit:${siteKey}:${visitorId}`;
    const windowMs = 60000; // 1 minute

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.pexpire(key, windowMs);
    }

    return current <= rateLimit.rpm;
  }
}



