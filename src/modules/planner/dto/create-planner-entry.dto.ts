import { IsString, IsOptional, IsBoolean } from 'class-validator';

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
