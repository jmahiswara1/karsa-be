import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateNoteFolderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string | null;
}
