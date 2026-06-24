import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { User, UserStatus } from '@prisma/client';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateStatusDto } from './dto/update-status.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
    userId: string,
  ): Promise<{ id: string; name: string; email: string; status: UserStatus }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' },
      select: { id: true, name: true, email: true, status: true },
    });
  }

  async rejectUser(
    userId: string,
  ): Promise<{ id: string; name: string; email: string; status: UserStatus }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: 'REJECTED' },
      select: { id: true, name: true, email: true, status: true },
    });
  }

  async updateUserRole(
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

    return this.prisma.user.update({
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
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateStatusDto,
  ): Promise<{ id: string; name: string; email: string; status: UserStatus }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: { id: true, name: true, email: true, status: true },
    });
  }

  async deleteUser(userId: string): Promise<{ id: string }> {
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({ where: { id: userId } });
    return { id: userId };
  }
}
