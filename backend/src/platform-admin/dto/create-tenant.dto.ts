import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug debe ser minúsculas, números y guiones (ej. "peluqueria-marisa")',
  })
  slug!: string;

  @IsString()
  @MinLength(2)
  businessName!: string;

  @IsOptional()
  @IsString()
  businessType?: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(8, { message: 'la contraseña debe tener al menos 8 caracteres' })
  ownerPassword!: string;

  @IsString()
  @MinLength(2)
  ownerFullName!: string;
}
