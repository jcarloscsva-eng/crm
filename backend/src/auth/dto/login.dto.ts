import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  slug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
