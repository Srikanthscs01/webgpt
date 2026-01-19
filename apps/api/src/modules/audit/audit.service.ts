import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditLog } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    workspaceId: string,
    options?: {
      action?: string;
      targetType?: string;
      actorUserId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where = {
      workspaceId,
      ...(options?.action ? { action: options.action } : {}),
      ...(options?.targetType ? { targetType: options.targetType } : {}),
      ...(options?.actorUserId ? { actorUserId: options.actorUserId } : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async create(data: {
    workspaceId: string;
    actorUserId?: string;
    action: string;
    targetType: string;
    targetId?: string;
    meta?: Record<string, unknown>;
  }): Promise<AuditLog> {
    return this.prisma.auditLog.create({
      data: {
        workspaceId: data.workspaceId,
        actorUserId: data.actorUserId,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        meta: (data.meta || {}) as any,
      },
    });
  }
}



