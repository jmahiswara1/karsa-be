import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import {
  PLANNER_CATEGORIES,
  type PlannerCategory,
} from './create-planner-entry.dto';

export class UpdatePlannerEntryDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

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
