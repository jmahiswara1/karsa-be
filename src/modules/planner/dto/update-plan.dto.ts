import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdatePlanDto {
  @IsOptional()
  @IsArray()
  focusTasks?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  lightTasks?: Record<string, unknown>[];

  @IsOptional()
  @IsArray()
  tasksToDefer?: Record<string, unknown>[];

  @IsOptional()
  @IsString()
  aiNote?: string;

  @IsOptional()
  @IsString()
  workloadLevel?: string;
}
