import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@prisma/client';
import { ROLES_KEY, UserRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @Roles() metadata → open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: User }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated user');
    }

    // ADMIN always wins (super-role)
    if (user.role === 'ADMIN') {
      return true;
    }

    // PRO with expired subscription is treated as FREE for guard purposes
    const effectiveRole: UserRole =
      user.role === 'PRO' &&
      user.subscriptionExpiresAt &&
      user.subscriptionExpiresAt.getTime() < Date.now()
        ? 'FREE'
        : user.role;

    if (!requiredRoles.includes(effectiveRole)) {
      throw new ForbiddenException(
        `Requires one of roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
