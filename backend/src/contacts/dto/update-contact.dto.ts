import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CONTACT_CATEGORIES, ContactCategoryValue } from './create-contact.dto';

export class UpdateContactDto {
  @IsOptional()
  @IsIn(CONTACT_CATEGORIES)
  category?: ContactCategoryValue;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

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
}
