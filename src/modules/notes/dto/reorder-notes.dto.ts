import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class NoteOrderItem {
  @IsString()
  id: string;

  @IsInt()
  order: number;
}

export class ReorderNotesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteOrderItem)
  notes: NoteOrderItem[];
}
