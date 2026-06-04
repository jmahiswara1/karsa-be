import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class CreateNoteFolderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
