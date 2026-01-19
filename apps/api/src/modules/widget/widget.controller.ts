import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  Res,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { WidgetService } from './widget.service';
import { ChatService } from '../chat/chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '@prisma/client';
import { WidgetChatDto, UpdateWidgetConfigDto } from './dto/widget.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Widget')
@Controller('widget')
export class WidgetController {
  constructor(
    private readonly widgetService: WidgetService,
    private readonly chatService: ChatService,
  ) {}

  // Public endpoints for widget

  @Get('config')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get public widget configuration' })
  async getPublicConfig(@Query('siteKey') siteKey: string) {
    return this.widgetService.getPublicConfig(siteKey);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Send chat message from widget' })
  async chat(
    @Body() dto: WidgetChatDto,
    @Headers('origin') origin: string | undefined,
  ) {
    // Validate origin and get site
    const site = await this.widgetService.validateOrigin(dto.siteKey, origin);

    // Check rate limit
    const allowed = await this.widgetService.checkRateLimit(dto.siteKey, dto.visitorId);
    if (!allowed) {
      throw new ForbiddenException('Rate limit exceeded. Please try again later.');
    }

    return this.chatService.chat(
      site.workspaceId,
      site.id,
      dto.message,
      dto.conversationId,
      dto.visitorId,
    );
  }

  @Get('chat/stream')
  @SkipThrottle()
  @ApiOperation({ summary: 'Stream chat response for widget (SSE)' })
  async chatStream(
    @Query('siteKey') siteKey: string,
    @Query('message') message: string,
    @Query('conversationId') conversationId: string | undefined,
    @Query('visitorId') visitorId: string,
    @Headers('origin') origin: string | undefined,
    @Res() res: Response,
  ) {
    // Validate origin and get site
    const site = await this.widgetService.validateOrigin(siteKey, origin);

    // Check rate limit
    const allowed = await this.widgetService.checkRateLimit(siteKey, visitorId);
    if (!allowed) {
      res.status(429).json({ error: 'Rate limit exceeded' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', origin || '*');

    try {
      const stream = this.chatService.chatStream(
        site.workspaceId,
        site.id,
        message,
        conversationId,
        visitorId,
      );

      for await (const event of stream) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);

        if (event.type === 'done' || event.type === 'error') {
          break;
        }
      }
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: (error as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }

  // Admin endpoints for widget config

  @Get(':siteId/config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get widget configuration for admin' })
  async getConfig(@Param('siteId') siteId: string, @CurrentUser() user: User) {
    return this.widgetService.getConfig(siteId, user.workspaceId);
  }

  @Patch(':siteId/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update widget configuration' })
  async updateConfig(
    @Param('siteId') siteId: string,
    @Body() dto: UpdateWidgetConfigDto,
    @CurrentUser() user: User,
  ) {
    return this.widgetService.updateConfig(siteId, user.workspaceId, dto);
  }
}



