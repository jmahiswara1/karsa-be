import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PLANNER_CATEGORIES,
  type PlannerCategory,
} from './create-planner-entry.dto';

export class UpdatePlannerEntryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string;

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
