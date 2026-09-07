import { Module } from '@nestjs/common';
import { CustomSegmentsController } from './custom-segments.controller';
import { CustomSegmentsService } from './custom-segments.service';

@Module({
  controllers: [CustomSegmentsController],
  providers: [CustomSegmentsService],
})
export class CustomSegmentsModule {}
