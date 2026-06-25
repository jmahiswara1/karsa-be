import { IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePreferenceDto {
  @ApiPropertyOptional({
    description: 'Preferred language',
    enum: ['en', 'id'],
    example: 'en',
  })
  @IsString()
  @IsOptional()
  @IsIn(['en', 'id'])
  language?: string;

  @ApiPropertyOptional({
    description: 'UI theme',
    enum: ['light', 'dark', 'system'],
    example: 'dark',
  })
  @IsString()
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @ApiPropertyOptional({
    description: 'Enable email notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @ApiPropertyOptional({
    description: 'Enable push notifications',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;
}
