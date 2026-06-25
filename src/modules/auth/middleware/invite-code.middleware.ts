import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class InviteCodeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Save invite code to cookie before OAuth redirect
    if (req.path === '/api/auth/google' && req.query?.invite) {
      res.cookie('invite_code', req.query.invite as string, {
        maxAge: 10 * 60 * 1000, // 10 minutes
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      });
    }
    next();
  }
}
