import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

export class CreateInteractionDto {
  @IsIn(['call', 'visit'])
  type!: 'call' | 'visit';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
