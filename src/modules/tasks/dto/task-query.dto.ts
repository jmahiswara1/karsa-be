import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsString,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskStatus, Priority } from '@prisma/client';

export class TaskQueryDto {
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsString()
  @IsOptional()
  columnId?: string;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;
}
