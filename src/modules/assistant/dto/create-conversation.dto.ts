import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum ConversationTypeEnum {
  ASSISTANT = 'ASSISTANT',
  MINI = 'MINI',
}

export class CreateConversationDto {
  @ApiProperty({ enum: ConversationTypeEnum })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(ConversationTypeEnum)
  type: ConversationTypeEnum;
}
