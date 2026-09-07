import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { SegmentConditionDto } from './segment-condition.dto';

export class PreviewSegmentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  periodDays?: number = 90;

  @IsIn(['all', 'any'])
  matchType!: 'all' | 'any';

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SegmentConditionDto)
  conditions!: SegmentConditionDto[];
}
