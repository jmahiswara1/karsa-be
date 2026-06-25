import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateConversationDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;
}
