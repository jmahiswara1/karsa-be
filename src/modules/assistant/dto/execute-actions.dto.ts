import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class ExecuteActionsDto {
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @IsString()
  @IsOptional()
  conversationId?: string;

  @IsObject()
  @IsOptional()
  context?: Record<string, unknown>;
}
