import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import type { UserStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'REJECTED'] })
  @IsEnum(['PENDING', 'ACTIVE', 'REJECTED'] as const, {
    message: 'status must be one of: PENDING, ACTIVE, REJECTED',
  })
  status!: UserStatus;
}
