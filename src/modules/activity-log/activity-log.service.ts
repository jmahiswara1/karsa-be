import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ActivityLogService {
  constructor(private prisma: PrismaService) {}

  async log(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details?: Record<string, unknown> | null,
  ) {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          entityType,
          entityId,
          details: (details as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
    }
  }

  async listByUser(userId: string, skip = 0, take = 20) {
    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { userId },
        skip,
        take: Math.min(take, 100),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.activityLog.count({ where: { userId } }),
    ]);

    return { items, total };
  }
}
