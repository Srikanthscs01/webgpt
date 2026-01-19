import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Workspaces')
@Controller('workspaces')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current workspace' })
  async getCurrent(@CurrentUser() user: User) {
    const workspace = await this.workspacesService.findByIdOrThrow(user.workspaceId);
    const usage = await this.workspacesService.getUsageSummary(user.workspaceId);

    return {
      ...workspace,
      usage,
    };
  }

  @Patch('current')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update current workspace' })
  async updateCurrent(@CurrentUser() user: User, @Body() body: { name?: string }) {
    return this.workspacesService.update(user.workspaceId, body);
  }
}



