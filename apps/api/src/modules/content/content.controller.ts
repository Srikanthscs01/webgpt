import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole, PageStatus } from '@prisma/client';

@ApiTags('Content')
@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('pages')
  @ApiOperation({ summary: 'Get pages for a site' })
  async getPages(
    @Query('siteId') siteId: string,
    @Query('status') status: PageStatus | undefined,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @CurrentUser() user: User,
  ) {
    return this.contentService.getPages(user.workspaceId, siteId, {
      status,
      limit,
      offset,
    });
  }

  @Get('pages/:id')
  @ApiOperation({ summary: 'Get page details with chunks' })
  async getPage(@Param('id') id: string, @CurrentUser() user: User) {
    return this.contentService.getPage(id, user.workspaceId);
  }

  @Get('chunks')
  @ApiOperation({ summary: 'Get chunks for a site' })
  async getChunks(
    @Query('siteId') siteId: string,
    @Query('pageId') pageId: string | undefined,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @CurrentUser() user: User,
  ) {
    return this.contentService.getChunks(user.workspaceId, siteId, {
      pageId,
      limit,
      offset,
    });
  }

  @Post('pages/:id/reembed')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @ApiOperation({ summary: 'Re-embed a page' })
  async reembedPage(@Param('id') id: string, @CurrentUser() user: User) {
    await this.contentService.reembedPage(id, user.workspaceId);
    return { message: 'Re-embedding queued' };
  }

  @Post('sites/:siteId/reembed')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Re-embed all pages for a site' })
  async reembedSite(@Param('siteId') siteId: string, @CurrentUser() user: User) {
    await this.contentService.reembedSite(siteId, user.workspaceId);
    return { message: 'Re-embedding queued for all pages' };
  }

  @Delete('pages/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a page' })
  async deletePage(@Param('id') id: string, @CurrentUser() user: User) {
    await this.contentService.deletePage(id, user.workspaceId);
  }
}



