import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Audit')
@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@ApiBearerAuth()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs' })
  async findAll(
    @Query('action') action: string | undefined,
    @Query('targetType') targetType: string | undefined,
    @Query('actorUserId') actorUserId: string | undefined,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
    @CurrentUser() user: User,
  ) {
    return this.auditService.findAll(user.workspaceId, {
      action,
      targetType,
      actorUserId,
      limit,
      offset,
    });
  }
}



