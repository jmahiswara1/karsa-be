import { IsString, IsOptional, IsBoolean } from 'class-validator';

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
