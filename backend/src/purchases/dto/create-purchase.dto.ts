import { IsDateString, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class CreatePurchaseDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
