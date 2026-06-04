import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ProjectStatus, Priority } from '@prisma/client';

export class CreateProjectDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ProjectStatus)
  @IsOptional()
  status?: ProjectStatus;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsDateString()
  @IsOptional()
  deadline?: string;
}
