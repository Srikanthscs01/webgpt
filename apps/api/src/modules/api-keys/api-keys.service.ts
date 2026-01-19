import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ApiKey } from '@prisma/client';
import { generateApiKey } from '@webgpt/shared';

@Injectable()
export class ApiKeysService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId: string): Promise<Omit<ApiKey, 'hashedKey'>[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { workspaceId, revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map(({ hashedKey, ...key }) => key);
  }

  async create(
    workspaceId: string,
    data: { name: string; scopes?: string[] },
  ): Promise<{ key: string; apiKey: Omit<ApiKey, 'hashedKey'> }> {
    const { key, prefix, hash } = generateApiKey();

    const apiKey = await this.prisma.apiKey.create({
      data: {
        workspaceId,
        name: data.name,
        prefix,
        hashedKey: hash,
        scopes: data.scopes || ['chat:read', 'chat:write'],
      },
    });

    const { hashedKey, ...safeKey } = apiKey;

    // Return the raw key only once
    return {
      key,
      apiKey: safeKey,
    };
  }

  async revoke(id: string, workspaceId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, workspaceId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const apiKey = await this.prisma.apiKey.findFirst({
      where: { id, workspaceId },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.prisma.apiKey.delete({
      where: { id },
    });
  }
}



