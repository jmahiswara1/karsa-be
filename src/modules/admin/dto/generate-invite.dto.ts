import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEmail, IsInt, Min, Max } from 'class-validator';

export class GenerateInviteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
