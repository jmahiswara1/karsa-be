import { IsArray, IsInt, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class NoteOrderItem {
  @ApiProperty({ description: 'Note ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'New order position' })
  @IsInt()
  order: number;
}

export class ReorderNotesDto {
  @ApiProperty({
    type: [NoteOrderItem],
    description: 'Array of notes with new order',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteOrderItem)
  notes: NoteOrderItem[];
}
