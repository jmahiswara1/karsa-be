import { IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';

export class UpdatePreferenceDto {
  @IsString()
  @IsOptional()
  @IsIn(['en', 'id'])
  language?: string;

  @IsString()
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;
}
