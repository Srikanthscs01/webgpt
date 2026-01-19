import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { ChatDto, SearchDto } from './dto/chat.dto';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send a chat message' })
  async chat(@Body() dto: ChatDto, @CurrentUser() user: User) {
    return this.chatService.chat(
      user.workspaceId,
      dto.siteId,
      dto.message,
      dto.conversationId,
    );
  }

  @Get('stream')
  @ApiOperation({ summary: 'Stream a chat response (SSE)' })
  async chatStream(
    @Query('siteId') siteId: string,
    @Query('message') message: string,
    @Query('conversationId') conversationId: string | undefined,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    try {
      const stream = this.chatService.chatStream(
        user.workspaceId,
        siteId,
        message,
        conversationId,
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

  @Post('search')
  @ApiOperation({ summary: 'Search chunks without generating response' })
  async search(@Body() dto: SearchDto, @CurrentUser() user: User) {
    return this.chatService.search(dto.siteId, dto.query);
  }
}



