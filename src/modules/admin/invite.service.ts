import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class InviteService {
  constructor(private prisma: PrismaService) {}

  private generateCode(): string {
    return randomBytes(6).toString('hex').slice(0, 12);
  }

  async generate(adminId: string, email?: string, expiresInDays?: number) {
    const code = this.generateCode();
    const days = expiresInDays ?? 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const invite = await this.prisma.inviteCode.create({
      data: {
        code,
        email: email || null,
        expiresAt,
        createdBy: adminId,
      },
      select: {
        id: true,
        code: true,
        email: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return invite;
  }

  async validate(code: string, email?: string) {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { code },
    });

    if (!invite) {
      throw new BadRequestException('Invalid invite code');
    }

    if (invite.isUsed) {
      throw new BadRequestException('Invite code already used');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite code expired');
    }

    if (
      invite.email &&
      email &&
      invite.email.toLowerCase() !== email.toLowerCase()
    ) {
      throw new BadRequestException('Invite code is not valid for this email');
    }

    return invite;
  }

  async consume(code: string, userId: string) {
    return this.prisma.inviteCode.update({
      where: { code },
      data: {
        isUsed: true,
        usedBy: userId,
      },
    });
  }

  async revoke(id: string) {
    const invite = await this.prisma.inviteCode.findUnique({
      where: { id },
    });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.prisma.inviteCode.delete({ where: { id } });
    return { id };
  }

  async list() {
    return this.prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        email: true,
        expiresAt: true,
        isUsed: true,
        createdAt: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
