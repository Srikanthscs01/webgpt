import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Workspace, Plan } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Workspace | null> {
    return this.prisma.workspace.findUnique({
      where: { id },
    });
  }

  async findByIdOrThrow(id: string): Promise<Workspace> {
    const workspace = await this.findById(id);
    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }
    return workspace;
  }

  async create(data: { name: string; plan?: Plan }): Promise<Workspace> {
    return this.prisma.workspace.create({
      data: {
        name: data.name,
        plan: data.plan || Plan.FREE,
      },
    });
  }

  async update(id: string, data: { name?: string; plan?: Plan }): Promise<Workspace> {
    return this.prisma.workspace.update({
      where: { id },
      data,
    });
  }

  async getUsageSummary(workspaceId: string): Promise<{
    sites: number;
    pages: number;
    chunks: number;
    conversations: number;
    tokensUsed: number;
  }> {
    const [sites, pages, chunks, conversations, usage] = await Promise.all([
      this.prisma.site.count({ where: { workspaceId } }),
      this.prisma.page.count({ where: { workspaceId } }),
      this.prisma.chunk.count({ where: { workspaceId } }),
      this.prisma.conversation.count({ where: { workspaceId } }),
      this.prisma.usageRecord.aggregate({
        where: { workspaceId },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          embeddingTokens: true,
        },
      }),
    ]);

    return {
      sites,
      pages,
      chunks,
      conversations,
      tokensUsed:
        (usage._sum.promptTokens || 0) +
        (usage._sum.completionTokens || 0) +
        (usage._sum.embeddingTokens || 0),
    };
  }
}



