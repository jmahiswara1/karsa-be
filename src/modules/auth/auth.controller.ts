import { Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from '../../common/guards/google-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '../../common/guards/jwt-refresh-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@prisma/client';
import type { Request, Response } from 'express';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Invite code is passed via query param ?invite=xxx
    // GoogleStrategy reads it from req.query.invite
    // Passport handles the redirect to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(
    @Req() req: Request & { user?: unknown },
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';

    const user = req.user as User;
    if (!user) {
      return res.redirect(
        `${frontendUrl}/callback?error=authentication_failed`,
      );
    }

    if (user.status === 'PENDING') {
      const pendingUser = JSON.stringify({
        name: user.name || '',
        email: user.email,
        avatarUrl: user.avatarUrl || '',
      });
      res.cookie('pending_user', pendingUser, {
        maxAge: 10 * 60 * 1000, // 10 minutes
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      });
      return res.redirect(`${frontendUrl}/callback?pending=true`);
    }

    if (user.status === 'REJECTED') {
      return res.redirect(`${frontendUrl}/callback?rejected=true`);
    }

    const tokens = await this.authService.generateTokens(
      user.id,
      user.email,
      user.role,
    );

    // Redirect to frontend with tokens
    return res.redirect(
      `${frontendUrl}/callback?access_token=${tokens.accessToken}&refresh_token=${tokens.refreshToken}`,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: User) {
    return {
      success: true,
      data: user,
    };
  }

  @Post('refresh')
  @UseGuards(JwtRefreshAuthGuard)
  async refreshTokens(
    @Req() req: Request & { user: User & { refreshToken: string } },
  ) {
    const tokens = await this.authService.refreshTokens(
      req.user.id,
      req.user.refreshToken,
    );
    return {
      success: true,
      data: tokens,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User) {
    await this.authService.logout(user.id);
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }
}
