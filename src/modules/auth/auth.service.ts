import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { InviteService } from '../admin/invite.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import * as argon2 from 'argon2';
import type { User } from '@prisma/client';
import type { Profile } from 'passport-google-oauth20';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export type UserRole = User['role'];

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private inviteService: InviteService,
    private activityLog: ActivityLogService,
  ) {}

  async validateGoogleUser(
    profile: Profile,
    accessToken?: string,
    refreshToken?: string,
    inviteCode?: string,
  ): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value || '';
    const avatarUrl = photos?.[0]?.value;

    this.logger.log(
      `validateGoogleUser: googleId=${id}, email=${email}, inviteCode=${inviteCode || 'none'}`,
    );

    let user = await this.usersService.findByGoogleId(id);

    if (!user) {
      this.logger.log(`No user found by googleId, trying email lookup`);
      user = await this.usersService.findByEmail(email);
      if (user) {
        this.logger.log(
          `Found existing user by email: ${user.id} (${user.email}), status=${user.status}`,
        );
        // Link google account to existing email
        // Implement logic to update user with googleId if needed, skipping for now
      } else {
        this.logger.log(`No user found by email either, checking user count`);
        const userCount = await this.usersService.count();
        this.logger.log(`Total users in DB: ${userCount}`);

        // First user is auto-approved as ADMIN
        if (userCount === 0) {
          user = await this.usersService.createFromGoogle({
            email,
            name: displayName,
            googleId: id,
            avatarUrl,
            status: 'ACTIVE',
          });
        } else {
          // All other users need a valid invite code
          if (!inviteCode) {
            this.logger.warn(`New user without invite code, rejecting`);
            throw new BadRequestException(
              'Invite code is required for registration',
            );
          }

          const invite = await this.inviteService.validate(inviteCode, email);

          user = await this.usersService.createFromGoogle({
            email,
            name: displayName,
            googleId: id,
            avatarUrl,
            status: 'ACTIVE',
          });

          // Mark invite as used
          await this.inviteService.consume(invite.code, user.id);
        }
      }
    } else {
      this.logger.log(
        `Found user by googleId: ${user.id} (${user.email}), status=${user.status}`,
      );
    }

    // Store Google Calendar tokens if provided
    if (accessToken) {
      await this.usersService.updateCalendarTokens(
        user.id,
        accessToken,
        refreshToken ?? '',
      );
    }

    await this.activityLog.log(user.id, 'LOGIN', 'User', user.id, {
      email: user.email,
    });

    return user;
  }

  async generateTokens(userId: string, email: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as unknown as number,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as unknown as number,
      }),
    ]);

    await this.updateRefreshTokenHash(userId, refreshToken);

    return {
      accessToken,
      refreshToken,
    };
  }

  async updateRefreshTokenHash(userId: string, refreshToken: string) {
    const hash = await argon2.hash(refreshToken);
    await this.usersService.updateHashedRefreshToken(userId, hash);
  }

  async logout(userId: string) {
    await this.usersService.updateHashedRefreshToken(userId, null);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const refreshTokenMatches = await argon2.verify(
      user.hashedRefreshToken,
      refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new UnauthorizedException('Access denied');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }
}
