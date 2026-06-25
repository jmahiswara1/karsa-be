import { IsOptional, IsEmail, IsInt, Min, Max } from 'class-validator';

export class GenerateInviteDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  expiresInDays?: number;
}
