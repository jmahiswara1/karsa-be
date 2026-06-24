import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { User, UserPreference, UserStatus } from '@prisma/client';
import { UpdatePreferenceDto } from './dto/update-preference.dto';

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

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  async updateStatus(userId: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  }

  createFromGoogle(googleUser: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
    status?: UserStatus;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: googleUser.email,
        name: googleUser.name,
        googleId: googleUser.googleId,
        avatarUrl: googleUser.avatarUrl,
        status: googleUser.status ?? 'PENDING',
      },
    });
  }

  async updateHashedRefreshToken(
    userId: string,
    hashedRefreshToken: string | null,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRefreshToken },
    });
  }

  async updateCalendarTokens(
    userId: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        googleCalendarToken: accessToken,
        googleCalendarRefreshToken: refreshToken,
      },
    });
  }

  update(
    id: string,
    data: { name?: string; avatarUrl?: string },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async getPreferences(userId: string): Promise<UserPreference> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updatePreferences(
    userId: string,
    data: UpdatePreferenceDto,
  ): Promise<UserPreference> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}
