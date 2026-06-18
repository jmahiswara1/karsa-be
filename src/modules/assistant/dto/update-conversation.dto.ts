import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateConversationDto {
  @IsString()
  @IsNotEmpty()
  title: string;
}
