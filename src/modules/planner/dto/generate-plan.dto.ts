import { IsIn, IsString, IsOptional } from 'class-validator';

export class GeneratePlanDto {
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  energyLevel: string;

  @IsString()
  @IsIn(['CALM', 'NEUTRAL', 'TIRED', 'STRESSED', 'FOCUSED'])
  mood: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
