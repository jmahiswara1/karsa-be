import { IsString, IsIn, IsBoolean, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsIn(['user', 'assistant'])
  role: string;

  @IsString()
  content: string;

  @IsBoolean()
  @IsOptional()
  isStructured?: boolean;
}
