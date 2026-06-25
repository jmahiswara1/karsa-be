import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ExecuteActionsDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}
