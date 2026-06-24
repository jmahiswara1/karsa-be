import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { AuditAction, Prisma } from '@prisma/client';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async log(params: {
    adminUserId: string;
    action: AuditAction;
    targetUserId?: string;
    details?: Prisma.InputJsonValue;
  }) {
    return this.prisma.adminAuditLog.create({
      data: {
        adminUserId: params.adminUserId,
        action: params.action,
        targetUserId: params.targetUserId,
        details: params.details,
      },
    });
  }

  async list(opts: {
    skip?: number;
    take?: number;
    action?: AuditAction;
    adminUserId?: string;
    from?: string;
    to?: string;
  }) {
    const skip = opts.skip ?? 0;
    const take = Math.min(opts.take ?? 20, 200);

    const where: Prisma.AdminAuditLogWhereInput = {};

    if (opts.action) {
      where.action = opts.action;
    }

    if (opts.adminUserId) {
      where.adminUserId = opts.adminUserId;
    }

    if (opts.from || opts.to) {
      where.createdAt = {};
      if (opts.from) where.createdAt.gte = new Date(opts.from);
      if (opts.to) where.createdAt.lte = new Date(opts.to);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.adminAuditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          action: true,
          details: true,
          createdAt: true,
          adminUser: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      this.prisma.adminAuditLog.count({ where }),
    ]);

    return { items, total };
  }
}
