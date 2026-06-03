import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import type { User } from '@prisma/client';
import type { Profile } from 'passport-google-oauth20';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateGoogleUser(profile: Profile): Promise<User> {
    const { id, emails, displayName, photos } = profile;
    const email = emails?.[0]?.value || '';
    const avatarUrl = photos?.[0]?.value;

    let user = await this.usersService.findByGoogleId(id);
    if (!user) {
      user = await this.usersService.findByEmail(email);
      if (user) {
        // Link google account to existing email
        // Implement logic to update user with googleId if needed, skipping for now
      } else {
        user = await this.usersService.createFromGoogle({
          email,
          name: displayName,
          googleId: id,
          avatarUrl,
        });
      }
    }
    return user;
  }

  async generateTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.generateTokens(user.id, user.email);
  }
}
