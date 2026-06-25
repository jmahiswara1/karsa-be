import { IsIn, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePlanDto {
  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  energyLevel: string;

  @ApiProperty({ enum: ['CALM', 'NEUTRAL', 'TIRED', 'STRESSED', 'FOCUSED'] })
  @IsString()
  @IsIn(['CALM', 'NEUTRAL', 'TIRED', 'STRESSED', 'FOCUSED'])
  mood: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
