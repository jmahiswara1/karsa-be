import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const PLANNER_CATEGORIES = [
  'FOCUS',
  'BREAK',
  'MEETING',
  'PERSONAL',
  'OTHER',
] as const;

export type PlannerCategory = (typeof PLANNER_CATEGORIES)[number];

export class CreatePlannerEntryDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  date: string;

  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiPropertyOptional({ enum: PLANNER_CATEGORIES })
  @IsOptional()
  @IsString()
  @IsIn(PLANNER_CATEGORIES)
  category?: PlannerCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isAiGenerated?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aiReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;
}
