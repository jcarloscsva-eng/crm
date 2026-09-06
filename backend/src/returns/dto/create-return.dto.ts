import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateReturnDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
