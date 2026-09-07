import { IsString, MinLength } from 'class-validator';
import { PreviewSegmentDto } from './preview-segment.dto';

export class SaveSegmentDto extends PreviewSegmentDto {
  @IsString()
  @MinLength(2)
  name!: string;
}
