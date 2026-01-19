import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CrawlService } from './crawl.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Crawl Runs')
@Controller('runs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CrawlController {
  constructor(private readonly crawlService: CrawlService) {}

  @Get()
  @ApiOperation({ summary: 'List crawl runs' })
  async findAll(
    @Query('siteId') siteId: string | undefined,
    @CurrentUser() user: User,
  ) {
    return this.crawlService.findAll(user.workspaceId, siteId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crawl run progress' })
  async getProgress(@Param('id') id: string, @CurrentUser() user: User) {
    return this.crawlService.getProgress(id, user.workspaceId);
  }
}



