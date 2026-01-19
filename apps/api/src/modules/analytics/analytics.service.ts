import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsOverview } from '@webgpt/shared';
import { getDateRange, estimateOpenAICost } from '@webgpt/shared';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(
    workspaceId: string,
    range: '7d' | '30d' | '90d' | '1y' = '30d',
    siteId?: string,
  ): Promise<AnalyticsOverview> {
    const { start, end } = getDateRange(range);

    const where = {
      workspaceId,
      ...(siteId ? { siteId } : {}),
      createdAt: { gte: start, lte: end },
    };

    // Get basic metrics
    const [totalChats, messages, visitors, feedbackData, usage] = await Promise.all([
      this.prisma.conversation.count({ where }),
      this.prisma.message.count({ where }),
      this.prisma.conversation.groupBy({
        by: ['visitorId'],
        where: { ...where, visitorId: { not: null } },
      }),
      this.prisma.feedback.aggregate({
        where,
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.usageRecord.aggregate({
        where: {
          workspaceId,
          ...(siteId ? { siteId } : {}),
          date: { gte: start, lte: end },
        },
        _sum: {
          promptTokens: true,
          completionTokens: true,
          embeddingTokens: true,
          chatRequests: true,
        },
      }),
    ]);

    // Get top questions (user messages)
    const userMessages = await this.prisma.message.findMany({
      where: {
        ...where,
        role: 'USER',
      },
      select: { content: true },
      take: 1000,
    });

    // Simple frequency analysis
    const questionCounts = new Map<string, number>();
    for (const msg of userMessages) {
      const normalized = msg.content.toLowerCase().trim().slice(0, 100);
      questionCounts.set(normalized, (questionCounts.get(normalized) || 0) + 1);
    }

    const topQuestions = Array.from(questionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question, count]) => ({ question, count }));

    // Get chats over time
    const chatsOverTime = await this.getChatsOverTime(workspaceId, start, end, siteId);

    // Calculate costs
    const promptTokens = usage._sum.promptTokens || 0;
    const completionTokens = usage._sum.completionTokens || 0;
    const embeddingTokens = usage._sum.embeddingTokens || 0;
    const estimatedCost = estimateOpenAICost(promptTokens, completionTokens, embeddingTokens);

    return {
      totalChats,
      totalMessages: messages,
      averageMessagesPerChat: totalChats > 0 ? messages / totalChats : 0,
      positiveRatings: 0,
      negativeRatings: 0,
      chatsByDay: chatsOverTime,
      topQuestions,
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens + embeddingTokens,
        estimatedCost,
      },
      estimatedCost,
      period: { start, end },
      uniqueVisitors: visitors.length,
      feedbackScore: feedbackData._avg.rating || 0,
      chatsOverTime,
    } as any;
  }

  private async getChatsOverTime(
    workspaceId: string,
    start: Date,
    end: Date,
    siteId?: string,
  ): Promise<Array<{ date: string; count: number }>> {
    // Group conversations by date
    const conversations = await this.prisma.conversation.findMany({
      where: {
        workspaceId,
        ...(siteId ? { siteId } : {}),
        createdAt: { gte: start, lte: end },
      },
      select: { createdAt: true },
    });

    const countByDate = new Map<string, number>();

    for (const conv of conversations) {
      const date = conv.createdAt.toISOString().split('T')[0] as string;
      countByDate.set(date, (countByDate.get(date) || 0) + 1);
    }

    // Fill in missing dates
    const result: Array<{ date: string; count: number }> = [];
    const current = new Date(start);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0] as string;
      result.push({
        date: dateStr,
        count: countByDate.get(dateStr) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }
}



