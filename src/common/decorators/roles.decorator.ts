import { SetMetadata } from '@nestjs/common';
import type { User } from '@prisma/client';

export type UserRole = User['role'];

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
