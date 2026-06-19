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
  @IsString()
  name: string;

  @IsObject()
  arguments: Record<string, unknown>;
}

export class ActionResultDto {
  @IsEnum(EntityType)
  type: EntityType;

  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  title: string;

  @IsEnum(EntityStatus)
  status: EntityStatus;

  @IsObject()
  @IsOptional()
  data?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  error?: string;
}

export class CreateEntitiesResponseDto {
  @IsString()
  reply: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionResultDto)
  entities: ActionResultDto[];
}
