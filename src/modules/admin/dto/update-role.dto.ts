import { IsEnum, IsOptional, IsISO8601 } from 'class-validator';
import type { User } from '@prisma/client';

type UserRole = User['role'];

export class UpdateRoleDto {
  @IsEnum(['FREE', 'PRO', 'ADMIN'] as const, {
    message: 'role must be one of: FREE, PRO, ADMIN',
  })
  role!: UserRole;

  @IsOptional()
  @IsISO8601()
  subscriptionExpiresAt?: string;
}
