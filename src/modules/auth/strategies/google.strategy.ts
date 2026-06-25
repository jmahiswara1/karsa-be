import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import type { Request } from 'express';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    super({
      clientID:
        configService.get<string>('GOOGLE_CLIENT_ID') || 'dummy-client-id',
      clientSecret:
        configService.get<string>('GOOGLE_CLIENT_SECRET') || 'dummy-secret',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL'),
      scope: [
        'email',
        'profile',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      accessType: 'offline',
      approvalPrompt: 'force',
      passReqToCallback: true,
    } as any);
    /* eslint-enable @typescript-eslint/no-unsafe-argument */
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const inviteCode =
        (req.query?.invite as string) ||
        (req as any).cookies?.invite_code ||
        undefined;
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
      const user = await this.authService.validateGoogleUser(
        profile,
        accessToken,
        refreshToken,
        inviteCode,
      );
      done(null, user);
    } catch (err) {
      done(err as Error, false);
    }
  }
}
