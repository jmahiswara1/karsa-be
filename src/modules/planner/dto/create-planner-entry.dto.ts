import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';

export const PLANNER_CATEGORIES = [
  'FOCUS',
  'BREAK',
  'MEETING',
  'PERSONAL',
  'OTHER',
] as const;

export type PlannerCategory = (typeof PLANNER_CATEGORIES)[number];

export class CreatePlannerEntryDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  date: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsOptional()
  @IsString()
  @IsIn(PLANNER_CATEGORIES)
  category?: PlannerCategory;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @IsOptional()
  @IsString()
  aiReason?: string;

  @IsOptional()
  @IsString()
  color?: string;
}
