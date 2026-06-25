import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import type { User, UserStatus } from '@prisma/client';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
    private activityLog: ActivityLogService,
  ) {}

  async getStats() {
    const [total, pending, active, rejected, free, pro, admin] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'PENDING' } }),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.user.count({ where: { status: 'REJECTED' } }),
        this.prisma.user.count({ where: { role: 'FREE' } }),
        this.prisma.user.count({ where: { role: 'PRO' } }),
        this.prisma.user.count({ where: { role: 'ADMIN' } }),
      ]);

    return {
      total,
      byStatus: { pending, active, rejected },
      byRole: { free, pro, admin },
    };
  }

  async listUsers(
    opts: {
      skip?: number;
      take?: number;
      search?: string;
      role?: string;
      status?: string;
    } = {},
  ): Promise<{
    items: Pick<
      User,
      | 'id'
      | 'email'
      | 'name'
      | 'avatarUrl'
      | 'role'
      | 'status'
      | 'subscriptionExpiresAt'
      | 'createdAt'
    >[];
    total: number;
  }> {
    const skip = opts.skip ?? 0;
    const take = Math.min(opts.take ?? 20, 200);

    const where: Record<string, unknown> = {};

    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: 'insensitive' } },
        { email: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    if (opts.role && ['FREE', 'PRO', 'ADMIN'].includes(opts.role)) {
      where.role = opts.role;
    }

    if (
      opts.status &&
      ['PENDING', 'ACTIVE', 'REJECTED'].includes(opts.status)
    ) {
      where.status = opts.status;
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          status: true,
          subscriptionExpiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total };
  }

  async getUserDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        googleId: true,
        role: true,
        status: true,
        subscriptionExpiresAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true,
            tasks: true,
            notes: true,
            conversations: true,
            activityLogs: true,
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async listPendingUsers(): Promise<
    Pick<User, 'id' | 'email' | 'name' | 'avatarUrl' | 'createdAt'>[]
  > {
    return this.prisma.user.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  }

  async approveUser(
    adminUserId: string,
    userId: string,
  ): Promise<{ id: string; name: string; email: string; status: UserStatus }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, status: true },
    });

    await this.auditLog.log({
      adminUserId,
      action: 'APPROVE',
      targetUserId: userId,
      details: { previousStatus: existing.status },
    });

    return updated;
  }

  async rejectUser(
    adminUserId: string,
    userId: string,
  ): Promise<{ id: string; name: string; email: string; status: UserStatus }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'REJECTED' },
      select: { id: true, name: true, email: true, status: true },
    });

    await this.auditLog.log({
      adminUserId,
      action: 'REJECT',
      targetUserId: userId,
      details: { previousStatus: existing.status },
    });

    return updated;
  }

  async updateUserRole(
    adminUserId: string,
    userId: string,
    dto: UpdateRoleDto,
  ): Promise<{
    id: string;
    email: string;
    name: string;
    role: User['role'];
    subscriptionExpiresAt: Date | null;
  }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: dto.role,
        subscriptionExpiresAt: dto.subscriptionExpiresAt
          ? new Date(dto.subscriptionExpiresAt)
          : dto.role === 'PRO'
            ? null
            : existing.subscriptionExpiresAt,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionExpiresAt: true,
      },
    });

    await this.auditLog.log({
      adminUserId,
      action: 'UPDATE_ROLE',
      targetUserId: userId,
      details: { previousRole: existing.role, newRole: dto.role },
    });

    return updated;
  }

  async updateUserStatus(
    adminUserId: string,
    userId: string,
    dto: UpdateStatusDto,
  ): Promise<{ id: string; name: string; email: string; status: UserStatus }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: { id: true, name: true, email: true, status: true },
    });

    await this.auditLog.log({
      adminUserId,
      action: 'UPDATE_STATUS',
      targetUserId: userId,
      details: { previousStatus: existing.status, newStatus: dto.status },
    });

    return updated;
  }

  async deleteUser(
    adminUserId: string,
    userId: string,
  ): Promise<{ id: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    await this.auditLog.log({
      adminUserId,
      action: 'DELETE',
      targetUserId: userId,
      details: {
        deletedUserEmail: existing.email,
        deletedUserName: existing.name,
      },
    });

    await this.prisma.user.delete({ where: { id: userId } });
    return { id: userId };
  }

  async getUserActivities(userId: string, skip = 0, take = 20) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.activityLog.listByUser(userId, skip, take);
  }

  async listActivities(filters: {
    skip?: number;
    take?: number;
    userId?: string;
    action?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }) {
    const {
      skip = 0,
      take = 20,
      userId,
      action,
      entityType,
      from,
      to,
    } = filters;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (entityType) where.entityType = entityType;
    if (from || to) {
      where.createdAt = {};
      if (from)
        (where.createdAt as Record<string, unknown>).gte = new Date(from);
      if (to) (where.createdAt as Record<string, unknown>).lte = new Date(to);
    }

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: Math.min(take, 100),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return { items, total };
  }
}
