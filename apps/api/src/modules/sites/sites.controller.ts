import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Queue } from 'bullmq';
import { SitesService } from './sites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '@prisma/client';
import { CreateSiteDto, UpdateSiteDto } from './dto/site.dto';
import { CRAWL_QUEUE } from '../../common/queue/queue.module';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Sites')
@Controller('sites')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SitesController {
  constructor(
    private readonly sitesService: SitesService,
    private readonly prisma: PrismaService,
    @Inject(CRAWL_QUEUE) private readonly crawlQueue: Queue,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all sites' })
  async findAll(@CurrentUser() user: User) {
    return this.sitesService.findAll(user.workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get site by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: User) {
    const site = await this.sitesService.findByIdOrThrow(id, user.workspaceId);
    const stats = await this.sitesService.getStats(id, user.workspaceId);
    return { ...site, stats };
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Create a new site' })
  async create(@Body() dto: CreateSiteDto, @CurrentUser() user: User) {
    const site = await this.sitesService.create(user.workspaceId, dto);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action: 'SITE_CREATED',
        targetType: 'Site',
        targetId: site.id,
        meta: { name: site.name, domain: site.domain },
      },
    });

    return site;
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Update a site' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSiteDto,
    @CurrentUser() user: User,
  ) {
    return this.sitesService.update(id, user.workspaceId, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a site' })
  async delete(@Param('id') id: string, @CurrentUser() user: User) {
    await this.sitesService.delete(id, user.workspaceId);

    await this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action: 'SITE_DELETED',
        targetType: 'Site',
        targetId: id,
        meta: {},
      },
    });
  }

  @Post(':id/crawl')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Start a crawl for the site' })
  async startCrawl(@Param('id') id: string, @CurrentUser() user: User) {
    const site = await this.sitesService.findByIdOrThrow(id, user.workspaceId);

    // Create crawl run
    const crawlRun = await this.prisma.crawlRun.create({
      data: {
        workspaceId: user.workspaceId,
        siteId: site.id,
        status: 'QUEUED',
      },
    });

    // Queue the crawl job
    await this.crawlQueue.add(
      'crawl',
      {
        runId: crawlRun.id,
        siteId: site.id,
        workspaceId: user.workspaceId,
        baseUrl: site.baseUrl,
        crawlConfig: site.crawlConfig,
      },
      {
        jobId: crawlRun.id,
      },
    );

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action: 'CRAWL_STARTED',
        targetType: 'CrawlRun',
        targetId: crawlRun.id,
        meta: { siteId: site.id, siteName: site.name },
      },
    });

    return { runId: crawlRun.id, status: 'QUEUED' };
  }

  @Post(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Cancel active crawl' })
  async cancelCrawl(@Param('id') id: string, @CurrentUser() user: User) {
    const site = await this.sitesService.findByIdOrThrow(id, user.workspaceId);

    // Find active crawl run
    const activeRun = await this.prisma.crawlRun.findFirst({
      where: {
        siteId: site.id,
        status: { in: ['QUEUED', 'RUNNING'] },
      },
    });

    if (!activeRun) {
      return { message: 'No active crawl to cancel' };
    }

    // Remove from queue if queued
    const job = await this.crawlQueue.getJob(activeRun.id);
    if (job) {
      await job.remove();
    }

    // Update run status
    await this.prisma.crawlRun.update({
      where: { id: activeRun.id },
      data: {
        status: 'CANCELLED',
        finishedAt: new Date(),
      },
    });

    await this.sitesService.updateStatus(site.id, 'PAUSED');

    return { runId: activeRun.id, status: 'CANCELLED' };
  }

  @Get(':id/pages')
  @ApiOperation({ summary: 'Get pages for a site' })
  async getPages(@Param('id') id: string, @CurrentUser() user: User) {
    await this.sitesService.findByIdOrThrow(id, user.workspaceId);

    return this.prisma.page.findMany({
      where: { siteId: id },
      select: {
        id: true,
        url: true,
        title: true,
        status: true,
        httpStatus: true,
        mimeType: true,
        lastCrawledAt: true,
        error: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }

  @Post(':id/regenerate-key')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Regenerate site key' })
  async regenerateKey(@Param('id') id: string, @CurrentUser() user: User) {
    return this.sitesService.regenerateSiteKey(id, user.workspaceId);
  }
}



