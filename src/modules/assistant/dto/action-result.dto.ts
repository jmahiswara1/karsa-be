import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EntityType {
  TASK = 'task',
  PROJECT = 'project',
  NOTE = 'note',
  PLANNER_ENTRY = 'planner_entry',
}

export enum EntityStatus {
  PENDING_CONFIRMATION = 'pending_confirmation',
  CREATED = 'created',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class ToolCallArgsDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsObject()
  arguments: Record<string, unknown>;
}

export class ActionResultDto {
  @ApiProperty({ enum: EntityType })
  @IsEnum(EntityType)
  type: EntityType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  id?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: EntityStatus })
  @IsEnum(EntityStatus)
  status: EntityStatus;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  error?: string;
}

export class CreateEntitiesResponseDto {
  @ApiProperty()
  @IsString()
  reply: string;

  @ApiProperty({ type: [ActionResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionResultDto)
  entities: ActionResultDto[];
}
