import { IsIn, IsOptional, IsString } from 'class-validator';
import { ALL_OPERATORS, FIELD_KEYS, FieldKey, Operator } from '../field-catalog';

export class SegmentConditionDto {
  @IsIn(FIELD_KEYS)
  field!: FieldKey;

  @IsIn(ALL_OPERATORS)
  operator!: Operator;

  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  value2?: string;
}
