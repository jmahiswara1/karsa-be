import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { User } from '@prisma/client';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(opts: { skip?: number; take?: number } = {}): Promise<{
    items: Pick<
      User,
      | 'id'
      | 'email'
      | 'name'
      | 'avatarUrl'
      | 'role'
      | 'subscriptionExpiresAt'
      | 'createdAt'
    >[];
    total: number;
  }> {
    const skip = opts.skip ?? 0;
    const take = Math.min(opts.take ?? 50, 200);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          subscriptionExpiresAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);
    return { items, total };
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
}
