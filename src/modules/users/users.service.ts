import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  createFromGoogle(googleUser: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        avatarUrl: googleUser.avatarUrl,
      },
    });
  }

  async updateHashedRefreshToken(userId: string, hashedRefreshToken: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  update(id: string, data: { name?: string; avatarUrl?: string }): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }
}
