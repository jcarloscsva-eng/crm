import { IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePointsConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  pointsPerCurrencyUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPurchaseAmount?: number;
}
