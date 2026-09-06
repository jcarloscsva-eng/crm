import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'la contraseña debe tener al menos 8 caracteres' })
  password!: string;

  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsIn(['admin', 'employee'])
  role!: 'admin' | 'employee';
}
