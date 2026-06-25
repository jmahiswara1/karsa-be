import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  private readonly logger = new Logger(GoogleAuthGuard.name);

  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  /* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access */
  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    _context: ExecutionContext,
  ): TUser {
    this.logger.log(
      `handleRequest: err=${String(err?.message ?? 'null')}, user=${user ? 'found' : 'null'}, info=${String(info?.message ?? 'null')}`,
    );

    if (err) {
      this.logger.warn(`Auth error: ${String(err.message)}`);
    }
    if (!user) {
      this.logger.warn(`No user returned from Google OAuth`);
    }

    // Don't redirect here — let the controller handle all redirects.
    // Just return the user or null.
    if (err || !user) {
      return null as TUser;
    }

    return user as TUser;
  }
  /* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-member-access */
}
