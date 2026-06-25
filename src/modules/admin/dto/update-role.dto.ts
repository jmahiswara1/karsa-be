import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsISO8601 } from 'class-validator';
import type { User } from '@prisma/client';

type UserRole = User['role'];

export class UpdateRoleDto {
  @ApiProperty({ enum: ['FREE', 'PRO', 'ADMIN'] })
  @IsEnum(['FREE', 'PRO', 'ADMIN'] as const, {
    message: 'role must be one of: FREE, PRO, ADMIN',
  })
  role!: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  subscriptionExpiresAt?: string;
}
