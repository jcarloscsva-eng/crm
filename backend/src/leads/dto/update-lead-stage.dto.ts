import { IsIn } from 'class-validator';

export const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
export type LeadStageValue = (typeof LEAD_STAGES)[number];

export class UpdateLeadStageDto {
  @IsIn(LEAD_STAGES)
  stage!: LeadStageValue;
}
