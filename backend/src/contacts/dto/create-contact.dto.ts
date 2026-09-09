import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export const CONTACT_CATEGORIES = ['partner', 'interesting'] as const;
export type ContactCategoryValue = (typeof CONTACT_CATEGORIES)[number];

export class CreateContactDto {
  @IsIn(CONTACT_CATEGORIES)
  category!: ContactCategoryValue;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
