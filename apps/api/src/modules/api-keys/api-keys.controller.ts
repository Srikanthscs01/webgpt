import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateApiKeyDto } from './dto/api-key.dto';

@ApiTags('API Keys')
@Controller('keys')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  async findAll(@CurrentUser() user: User) {
    return this.apiKeysService.findAll(user.workspaceId);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new API key' })
  async create(@Body() dto: CreateApiKeyDto, @CurrentUser() user: User) {
    const result = await this.apiKeysService.create(user.workspaceId, dto);

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action: 'API_KEY_CREATED',
        targetType: 'ApiKey',
        targetId: result.apiKey.id,
        meta: { name: dto.name, scopes: dto.scopes },
      },
    });

    return result;
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke an API key' })
  async revoke(@Param('id') id: string, @CurrentUser() user: User) {
    await this.apiKeysService.revoke(id, user.workspaceId);

    await this.prisma.auditLog.create({
      data: {
        workspaceId: user.workspaceId,
        actorUserId: user.id,
        action: 'API_KEY_REVOKED',
        targetType: 'ApiKey',
        targetId: id,
        meta: {},
      },
    });
  }
}



