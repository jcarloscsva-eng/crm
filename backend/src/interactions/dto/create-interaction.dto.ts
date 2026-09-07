import { IsDateString, IsIn, IsOptional, IsString } from 'class-validator';

const CALL_OUTCOMES = ['sale_closed', 'interested', 'not_interested', 'call_back'] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

export class CreateInteractionDto {
  @IsIn(['call', 'visit'])
  type!: 'call' | 'visit';

  @IsOptional()
  @IsString()
  notes?: string;

  /** Solo tiene sentido cuando type = 'call'; se valida en el servicio. */
  @IsOptional()
  @IsIn(CALL_OUTCOMES)
  outcome?: CallOutcome;

  @IsOptional()
  @IsDateString()
  followUpAt?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}
